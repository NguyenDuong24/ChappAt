import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '@/firebaseConfig';
import * as FileSystem from 'expo-file-system';

const inferContentType = (uri, fallback = 'application/octet-stream') => {
  if (!uri || typeof uri !== 'string') return fallback;

  const normalized = uri.split('?')[0].toLowerCase();
  if (normalized.endsWith('.jpg') || normalized.endsWith('.jpeg')) return 'image/jpeg';
  if (normalized.endsWith('.png')) return 'image/png';
  if (normalized.endsWith('.webp')) return 'image/webp';
  if (normalized.endsWith('.gif')) return 'image/gif';
  if (normalized.endsWith('.heic')) return 'image/heic';
  if (normalized.endsWith('.m4a')) return 'audio/m4a';
  if (normalized.endsWith('.aac')) return 'audio/aac';
  if (normalized.endsWith('.mp3')) return 'audio/mpeg';
  if (normalized.endsWith('.wav')) return 'audio/wav';

  return fallback;
};

const xhrUriToBlob = (uri) =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onerror = () => reject(new Error(`Cannot read local file URI via XHR: ${uri}`));
    xhr.onload = () => resolve(xhr.response);
    xhr.responseType = 'blob';
    xhr.open('GET', uri, true);
    xhr.send(null);
  });

const uriToBlob = async (uri) => {
  try {
    console.log('[storageUpload] Reading file from URI:', uri);
    
    // For file:// URIs on React Native, use FileSystem to read
    if (uri.startsWith('file://')) {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const blob = new Blob([bytes], { type: 'application/octet-stream' });
      console.log('[storageUpload] Blob from FileSystem created:', {
        size: blob.size,
        type: blob.type,
      });
      return blob;
    }
    
    // For other URIs (http, https, etc), use fetch
    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error(`Fetch failed with status ${response.status}`);
    }

    const blob = await response.blob();
    console.log('[storageUpload] Blob from fetch created:', {
      size: blob.size,
      type: blob.type,
    });
    return blob;
  } catch (error) {
    console.warn('[storageUpload] uriToBlob error:', {
      uri,
      message: error?.message,
      error,
    });
    
    // Fallback to XMLHttpRequest
    console.log('[storageUpload] Falling back to XMLHttpRequest');
    return await xhrUriToBlob(uri);
  }
};

export const uploadLocalFileToStorage = async ({
  uri,
  path,
  contentType,
  metadata = {},
  maxRetries = 3,
}) => {
  if (!uri) throw new Error('Missing local file URI for upload');
  if (!path) throw new Error('Missing Firebase Storage path');

  console.log('[storageUpload] Starting upload:', { uri, path, contentType });

  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const blob = await uriToBlob(uri);
      
      // Debug: Check blob size
      console.log('[storageUpload] Blob created:', {
        attempt,
        size: blob.size,
        type: blob.type,
        isEmpty: blob.size === 0,
      });

      if (blob.size === 0) {
        throw new Error('Blob is empty - file may not exist or is corrupted');
      }

      const storageRef = ref(storage, path);
      const finalContentType = contentType || inferContentType(uri);
      
      console.log('[storageUpload] Uploading:', {
        attempt,
        path,
        contentType: finalContentType,
        blobSize: blob.size,
      });

      const snapshot = await uploadBytes(storageRef, blob, {
        contentType: finalContentType,
        ...metadata,
      });

      const downloadURL = await getDownloadURL(snapshot.ref);
      console.log('[storageUpload] Upload successful:', { downloadURL, attempt });
      return downloadURL;
    } catch (error) {
      lastError = error;
      console.warn(`[storageUpload] Upload attempt ${attempt}/${maxRetries} failed:`, {
        code: error?.code,
        message: error?.message,
        attempt,
      });

      // Don't retry for permission errors
      if (error?.code === 'storage/unauthorized' || error?.code === 'storage/object-not-found') {
        break;
      }

      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        console.log(`[storageUpload] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // All retries failed
  console.error('[storageUpload] Upload failed after all retries:', {
    code: lastError?.code,
    message: lastError?.message,
    name: lastError?.name,
    serverResponse: lastError?.serverResponse,
    customData: lastError?.customData,
    path,
    uri,
    fullError: JSON.stringify(lastError),
  });
  throw lastError;
};

export { inferContentType };
