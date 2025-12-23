import { useState, useCallback } from 'react';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

// Lazy import for NSFW detection
let tf: any = null;
let jpeg: any = null;
let bundleResourceIO: any = null;
let atob: any = null;

const PIC_INPUT_SHAPE = { width: 224, height: 224 };
const NSFW_CLASSES = { 0: 'Drawing', 1: 'Hentai', 2: 'Neutral', 3: 'Porn', 4: 'Sexy' };

// NSFW model assets (relative to project root using module alias)
const NSFW_MODEL_JSON = require('@/assets/model/model.json');
const NSFW_MODEL_WEIGHTS = [require('@/assets/model/group1-shard1of1.bin')];

const initializeTensorFlow = async () => {
  if (!tf) {
    tf = await import('@tensorflow/tfjs');
    await import('@tensorflow/tfjs-react-native');
    const tfReactNative = await import('@tensorflow/tfjs-react-native');
    bundleResourceIO = tfReactNative.bundleResourceIO;
    jpeg = await import('jpeg-js');
    const base64 = await import('base-64');
    atob = base64.decode;
    await tf.ready();
  }
};

function imageToTensor(rawImageData: any) {
  try {
    const TO_UINT8ARRAY = { useTArray: true } as any;
    const { width, height, data } = jpeg.decode(rawImageData, TO_UINT8ARRAY);
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

export const useNSFWDetection = () => {
  const [nsfwModel, setNsfwModel] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadModel = useCallback(async () => {
    if (nsfwModel || isLoading) return nsfwModel;
    
    setIsLoading(true);
    try {
      await initializeTensorFlow();
      const model = await tf.loadLayersModel(bundleResourceIO(NSFW_MODEL_JSON, NSFW_MODEL_WEIGHTS));
      setNsfwModel(model);
      return model;
    } catch (error) {
      console.error('NSFW model load error:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [nsfwModel, isLoading]);

  const classifyImage = useCallback(async (uri: string) => {
    if (!uri) {
      return { isInappropriate: false, scores: {}, reason: 'No image provided' };
    }

    // Load model only when needed
    const model = await loadModel();
    if (!model) {
      console.warn('NSFW model not loaded');
      return { isInappropriate: false, scores: {}, reason: 'Model not available' };
    }

    console.group(`🔎 NSFW check for: ${uri}`);
    try {
      const resized = await manipulateAsync(
        uri,
        [{ resize: { width: PIC_INPUT_SHAPE.width, height: PIC_INPUT_SHAPE.height } }],
        { format: SaveFormat.JPEG, base64: true }
      );
      const base64: string = (resized as any).base64;
      const bytes = Uint8Array.from(atob(base64), (c: any) => (c as string).charCodeAt(0));
      const input = imageToTensor(bytes);
      const logits = model.predict(input);
      const values = await logits.data();
      logits.dispose?.();
      input.dispose?.();

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

      const reasonParts: string[] = [];
      if (p >= 0.45) reasonParts.push(`Porn: ${(p * 100).toFixed(1)}%`);
      if (h >= 0.45) reasonParts.push(`Hentai: ${(h * 100).toFixed(1)}%`);
      if (s >= 0.6) reasonParts.push(`Sexy: ${(s * 100).toFixed(1)}%`);
      const reason = reasonParts.join(', ') || 'An toàn';

      const scores = { p, h, s, n, d };
      console.log('Scores:', scores);
      console.log('Is inappropriate:', isInappropriate);
      console.log('Reason:', reason);

      return { isInappropriate, scores, reason };
    } catch (error) {
      console.error('NSFW classify error:', error);
      return { isInappropriate: true, scores: {}, reason: 'Lỗi xử lý ảnh - chặn để an toàn' };
    } finally {
      console.groupEnd();
    }
  }, [loadModel]);

  return {
    classifyImage,
    isModelLoading: isLoading,
    isModelLoaded: !!nsfwModel
  };
};
