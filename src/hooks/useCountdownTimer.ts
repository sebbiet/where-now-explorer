import { useState, useEffect, useCallback, useRef } from 'react';

interface UseCountdownTimerOptions {
  initialValue: number;
  onComplete?: () => void;
  autoReset?: boolean;
  enabled?: boolean;
}

export const useCountdownTimer = ({
  initialValue,
  onComplete,
  autoReset = true,
  enabled = true,
}: UseCountdownTimerOptions) => {
  const [countdown, setCountdown] = useState(initialValue);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const reset = useCallback(() => {
    setCountdown(initialValue);
  }, [initialValue]);

  const pause = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const resume = useCallback(() => {
    if (!enabled || intervalRef.current) return;

    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          onComplete?.();
          return autoReset ? initialValue : 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [enabled, onComplete, autoReset, initialValue]);

  // Handle enabled state changes
  useEffect(() => {
    if (enabled) {
      resume();
    } else {
      pause();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, resume, pause]);

  // Handle initial value changes
  useEffect(() => {
    setCountdown(initialValue);
  }, [initialValue]);

  return {
    countdown,
    reset,
    pause,
    resume,
    isRunning: !!intervalRef.current,
  };
};
