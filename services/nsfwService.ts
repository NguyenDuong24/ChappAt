import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { decode as atob } from 'base-64';

// NSFW model assets
const NSFW_MODEL_JSON = require('@/assets/model/model.json');
const NSFW_MODEL_WEIGHTS = [require('@/assets/model/group1-shard1of1.bin')];

const PIC_INPUT_SHAPE = { width: 224, height: 224 };

let tf: any = null;
let bundleResourceIO: any = null;
let jpeg: any = null;

class NSFWService {
    private model: any = null;
    private isLoading = false;
    private loadPromise: Promise<void> | null = null;

    constructor() {
        // Optional: Preload on init if desired, or lazy load
    }

    public async preloadModel() {
        if (this.model) return;
        if (!this.loadPromise) {
            this.loadPromise = this.loadModel();
        }
        return this.loadPromise;
    }

    public isModelLoaded() {
        return !!this.model;
    }

    public isModelLoading() {
        return !!this.isLoading;
    }

    public async loadModel(): Promise<void> {
        if (this.model) return;
        if (this.loadPromise) return this.loadPromise;

        this.isLoading = true;
        this.loadPromise = (async () => {
            try {
                console.log('⏳ [NSFWService] Loading TensorFlow and model...');

                if (!tf) {
                    tf = await import('@tensorflow/tfjs');
                }

                // react-native bindings
                const tfReactNative = await import('@tensorflow/tfjs-react-native');
                bundleResourceIO = tfReactNative.bundleResourceIO;

                if (!jpeg) jpeg = await import('jpeg-js');

                await tf.ready();
                this.model = await tf.loadLayersModel(bundleResourceIO(NSFW_MODEL_JSON, NSFW_MODEL_WEIGHTS));

                console.log('✅ [NSFWService] Model loaded successfully');
            } catch (error) {
                console.error('❌ [NSFWService] Failed to load model:', error);
                this.model = null;
            } finally {
                this.isLoading = false;
                this.loadPromise = null;
            }
        })();

        return this.loadPromise;
    }

    private imageToTensor(rawImageData: any) {
        try {
            const TO_UINT8ARRAY = { useTArray: true } as any;
            const { width, height, data } = (jpeg as any).decode(rawImageData, TO_UINT8ARRAY);
            const buffer = new Uint8Array(width * height * 3);
            let offset = 0;
            for (let i = 0; i < buffer.length; i += 3) {
                buffer[i] = data[offset];
                buffer[i + 1] = data[offset + 1];
                buffer[i + 2] = data[offset + 2];
                offset += 4;
            }
            return tf.tidy(() => tf.tensor4d(buffer, [1, height, width, 3]).div(255));
        } catch (error) {
            console.error('Error in imageToTensor:', error);
            throw error;
        }
    }

    public async classifyImage(uri: string): Promise<{ isInappropriate: boolean; scores: any; reason: string }> {
        if (!uri) return { isInappropriate: false, scores: {}, reason: 'Invalid URI' };

        // Ensure model is loaded
        if (!this.model) {
            await this.loadModel();
        }

        if (!this.model) {
            return { isInappropriate: false, scores: {}, reason: 'Model unavailable' };
        }

        console.group(`🔎 [NSFWService] Checking: ${uri}`);
        try {
            const resized = await manipulateAsync(
                uri,
                [{ resize: { width: PIC_INPUT_SHAPE.width, height: PIC_INPUT_SHAPE.height } }],
                { format: SaveFormat.JPEG, base64: true }
            );

            const base64 = (resized as any).base64;
            if (!base64) throw new Error('Base64 is undefined');

            const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
            const input = this.imageToTensor(bytes);

            const logits = this.model.predict(input) as any;
            const values = await logits.data();

            logits.dispose?.();
            (input as any).dispose?.();

            const p = values[3] || 0; // Porn
            const h = values[1] || 0; // Hentai
            const s = values[4] || 0; // Sexy
            const n = values[2] || 0; // Neutral
            const d = values[0] || 0; // Drawing

            const isInappropriate =
                p >= 0.5 ||
                h >= 0.5 ||
                s >= 0.7 ||
                (p + h + s >= 0.8);

            const reasonParts = [] as string[];
            if (p >= 0.45) reasonParts.push(`Porn: ${(p * 100).toFixed(1)}%`);
            if (h >= 0.45) reasonParts.push(`Hentai: ${(h * 100).toFixed(1)}%`);
            if (s >= 0.6) reasonParts.push(`Sexy: ${(s * 100).toFixed(1)}%`);
            const reason = reasonParts.join(', ') || 'An toàn';

            const scores = { p, h, s, n, d };
            console.log('Scores:', scores);
            console.log('Result:', isInappropriate ? 'BLOCKED' : 'OK');

            return { isInappropriate, scores, reason };
        } catch (error) {
            console.error('NSFW classify error:', error);
            // Fail safe: block if error
            return { isInappropriate: true, scores: {}, reason: 'Lỗi xử lý ảnh' };
        } finally {
            console.groupEnd();
        }
    }
}

export const nsfwService = new NSFWService();
