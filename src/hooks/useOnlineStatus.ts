import { useState, useEffect } from 'react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Set wasOffline to true if we're coming back online
      if (!isOnline) {
        setWasOffline(true);
        // Clear the flag after a delay to show "back online" message
        setTimeout(() => setWasOffline(false), 5000);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(false);
    };

    // Check initial state
    if (!navigator.onLine) {
      setIsOnline(false);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isOnline]);

  return { isOnline, wasOffline };
}