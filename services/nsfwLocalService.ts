import * as FileSystem from 'expo-file-system';

let tf: any;
let tfrn: any;
let nsfw: any;

let model: any | null = null;
let initPromise: Promise<boolean> | null = null;
let backendReady = false;
let modelUrl: string | undefined;

function setModelUrl(url?: string) {
  modelUrl = url;
}

async function ensureBackend(): Promise<boolean> {
  if (backendReady) return true;
  try {
    // Dynamic imports to avoid bundler issues
    const [tfModule, tfrnModule, nsfwModule] = await Promise.all([
      import('@tensorflow/tfjs'),
      import('@tensorflow/tfjs-react-native'),
      import('nsfwjs')
    ]);

    tf = tfModule;
    tfrn = tfrnModule;
    nsfw = nsfwModule;

    // Register RN platform and wait for TF to be ready
    if (tfrn && typeof tfrn.platform === 'function') {
      tfrn.platform();
    }
    if (typeof tf.ready === 'function') {
      await tf.ready();
    }

    // Prefer RN WebGL backend when available for speed; fallback to CPU
    try {
      if (typeof tf.setBackend === 'function') {
        await tf.setBackend('rn-webgl');
        await tf.ready();
      }
    } catch {
      try {
        await tf.setBackend('cpu');
        await tf.ready();
      } catch {}
    }

    backendReady = true;
    return true;
  } catch (e) {
    console.warn('[nsfwLocalService] ensureBackend failed:', e);
    backendReady = false;
    return false;
  }
}

async function preloadModel(customUrl?: string): Promise<boolean> {
  if (model) return true;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const ok = await ensureBackend();
      if (!ok || !nsfw) throw new Error('Backend not ready');

      const url = (customUrl || modelUrl);
      model = url ? await (nsfw as any).load(url) : await (nsfw as any).load();
      return !!model;
    } catch (e) {
      console.warn('[nsfwLocalService] preloadModel failed:', e);
      model = null;
      return false;
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
}

function getStatus(): { loaded: boolean; initializing: boolean; backend?: string } {
  let backend: string | undefined;
  try { backend = typeof tf?.getBackend === 'function' ? tf.getBackend() : undefined; } catch {}
  return { loaded: !!model, initializing: !!initPromise && !model, backend };
}

function base64ToUint8Array(base64: string): Uint8Array {
  try {
    // @ts-ignore
    const _atob = (global as any).atob || (typeof atob === 'function' ? atob : null);
    if (_atob) {
      const binary = _atob(base64);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
      return bytes;
    }
  } catch {}
  try {
    const Buf = (global as any).Buffer || undefined;
    if (Buf) {
      const b = Buf.from(base64, 'base64');
      return new Uint8Array(b);
    }
  } catch {}
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  const lookup: Record<string, number> = {};
  for (let i = 0; i < chars.length; i++) lookup[chars[i]] = i;
  const output: number[] = [];
  let buffer = 0, bitsCollected = 0;
  for (let i = 0; i < base64.length; i++) {
    const ch = base64[i];
    if (ch === '=') break;
    const val = lookup[ch];
    if (val === undefined) continue;
    buffer = (buffer << 6) | val;
    bitsCollected += 6;
    if (bitsCollected >= 8) {
      bitsCollected -= 8;
      output.push((buffer >> bitsCollected) & 0xff);
    }
  }
  return new Uint8Array(output);
}

async function toCacheIfContentUri(uri: string): Promise<{ path: string; cleanup: () => Promise<void> } | null> {
  if (!uri.startsWith('content://')) return null;
  try {
    const tmpPath = `${FileSystem.cacheDirectory || ''}nsfw-${Date.now()}.jpg`;
    await FileSystem.copyAsync({ from: uri, to: tmpPath });
    return { path: tmpPath, cleanup: () => FileSystem.deleteAsync(tmpPath, { idempotent: true }) };
  } catch (e) {
    console.warn('[nsfwLocalService] copy content:// failed:', e);
    return null;
  }
}

export type NSFWLocalResult = { isInappropriate: boolean; confidence: number; reason?: string };

export async function classifyImage(imageUri: string): Promise<NSFWLocalResult> {
  try {
    const ok = await preloadModel();
    if (!ok || !model || !tf) {
      return { isInappropriate: false, confidence: 0 };
    }

    let source = imageUri;
    const tmp = await toCacheIfContentUri(imageUri);
    if (tmp) source = tmp.path;

    try {
      const base64 = await FileSystem.readAsStringAsync(source, { encoding: FileSystem.EncodingType.Base64 });
      if (!base64) return { isInappropriate: false, confidence: 0 };

      const bytes = base64ToUint8Array(base64);
      let imageTensor: any;
      let preds: Array<{ className: string; probability: number }> = [];

      try {
        imageTensor = tf.tidy(() => (tf as any).decodeJpeg(bytes, 3));
        preds = await model.classify(imageTensor);
      } finally {
        try { imageTensor?.dispose && imageTensor.dispose(); } catch {}
      }

      // Build score lookup in lowercase
      const scores: Record<string, number> = {};
      preds.forEach(p => { scores[p.className?.toLowerCase?.() || ''] = p.probability || 0; });

      // Decision thresholds similar to common practice
      const strong = Math.max(scores['porn'] || 0, scores['hentai'] || 0);
      const suggestive = scores['sexy'] || 0;

      if (strong >= 0.6) {
        return { isInappropriate: true, confidence: strong, reason: 'Detected explicit category' };
      }
      if (suggestive >= 0.8) {
        return { isInappropriate: true, confidence: suggestive, reason: 'Detected suggestive category' };
      }

      return { isInappropriate: false, confidence: Math.max(strong, suggestive) };
    } finally {
      if (tmp) { try { await tmp.cleanup(); } catch {} }
    }
  } catch (e) {
    console.warn('[nsfwLocalService] classifyImage failed:', e);
    return { isInappropriate: false, confidence: 0 };
  }
}

export const nsfwLocalService = {
  setModelUrl,
  preloadModel,
  getStatus,
  classifyImage,
};

export default nsfwLocalService;
