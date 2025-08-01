import { useEffect } from 'react';
import { router } from 'expo-router';

export default function ExploreIndex() {
  useEffect(() => {
    // Tự động chuyển hướng đến tab1 khi vào trang explore
    router.replace('/(tabs)/explore/tab1');
  }, []);

  return null;
}
