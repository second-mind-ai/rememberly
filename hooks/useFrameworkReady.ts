import { useEffect, useState } from 'react';

declare global {
  interface Window {
    frameworkReady?: () => void;
  }
}

export function useFrameworkReady(): boolean {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Set ready state immediately for React Native
    setIsReady(true);
    
    // Call the global frameworkReady function if it exists (for web)
    window.frameworkReady?.();
  }, []);

  return isReady;
}
