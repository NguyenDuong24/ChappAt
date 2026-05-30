import { useCallback, useState } from 'react';
import { nsfwService } from '@/services/nsfwService';

export const useNSFWDetection = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [loaded, setLoaded] = useState(nsfwService.isModelLoaded());

  const loadModel = useCallback(async () => {
    if (nsfwService.isModelLoaded()) {
      setLoaded(true);
      return true;
    }

    setIsLoading(true);
    try {
      await nsfwService.preloadModel();
      const isLoaded = nsfwService.isModelLoaded();
      setLoaded(isLoaded);
      return isLoaded;
    } catch (error) {
      console.error('NSFW model load error:', error);
      setLoaded(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const classifyImage = useCallback(async (uri: string) => {
    await loadModel();
    return nsfwService.classifyImage(uri);
  }, [loadModel]);

  return {
    classifyImage,
    isModelLoading: isLoading || nsfwService.isModelLoading(),
    isModelLoaded: loaded || nsfwService.isModelLoaded(),
  };
};
