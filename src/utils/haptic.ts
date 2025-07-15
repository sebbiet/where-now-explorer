/**
 * Haptic feedback utility for mobile devices
 * Provides vibration feedback for touch interactions
 */

import { logger } from '@/utils/logger';

interface HapticOptions {
  duration?: number;
  pattern?: number[];
  type?: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';
}

interface TapticAPI {
  impact: (options: { style: string }) => void;
  notification: (options: { type: string }) => void;
  selection: () => void;
}

interface WindowWithTaptic extends Window {
  Taptic?: TapticAPI;
}

class HapticFeedback {
  private isSupported: boolean;

  constructor() {
    // Check if vibration API is supported
    this.isSupported = 'vibrate' in navigator;
  }

  /**
   * Simple vibration for button clicks and interactions
   */
  light() {
    if (!this.isSupported) return;

    try {
      // iOS haptic feedback
      const windowWithTaptic = window as WindowWithTaptic;
      if ('Taptic' in window && windowWithTaptic.Taptic?.impact) {
        windowWithTaptic.Taptic.impact({ style: 'light' });
      } else {
        // Android/standard vibration API
        navigator.vibrate(10);
      }
    } catch (error) {
      logger.debug('Haptic feedback not available', {
        component: 'Haptic',
        operation: 'vibrate',
      });
    }
  }

  /**
   * Medium vibration for important actions
   */
  medium() {
    if (!this.isSupported) return;

    try {
      const windowWithTaptic = window as WindowWithTaptic;
      if ('Taptic' in window && windowWithTaptic.Taptic?.impact) {
        windowWithTaptic.Taptic.impact({ style: 'medium' });
      } else {
        navigator.vibrate(20);
      }
    } catch (error) {
      logger.debug('Haptic feedback not available', {
        component: 'Haptic',
        operation: 'vibrate',
      });
    }
  }

  /**
   * Strong vibration for errors or important notifications
   */
  heavy() {
    if (!this.isSupported) return;

    try {
      const windowWithTaptic = window as WindowWithTaptic;
      if ('Taptic' in window && windowWithTaptic.Taptic?.impact) {
        windowWithTaptic.Taptic.impact({ style: 'heavy' });
      } else {
        navigator.vibrate(30);
      }
    } catch (error) {
      logger.debug('Haptic feedback not available', {
        component: 'Haptic',
        operation: 'vibrate',
      });
    }
  }

  /**
   * Success pattern vibration
   */
  success() {
    if (!this.isSupported) return;

    try {
      const windowWithTaptic = window as WindowWithTaptic;
      if ('Taptic' in window && windowWithTaptic.Taptic?.notification) {
        windowWithTaptic.Taptic.notification({ type: 'success' });
      } else {
        // Pattern: short, pause, short
        navigator.vibrate([20, 50, 20]);
      }
    } catch (error) {
      logger.debug('Haptic feedback not available', {
        component: 'Haptic',
        operation: 'vibrate',
      });
    }
  }

  /**
   * Error pattern vibration
   */
  error() {
    if (!this.isSupported) return;

    try {
      const windowWithTaptic = window as WindowWithTaptic;
      if ('Taptic' in window && windowWithTaptic.Taptic?.notification) {
        windowWithTaptic.Taptic.notification({ type: 'error' });
      } else {
        // Pattern: long vibration
        navigator.vibrate(50);
      }
    } catch (error) {
      logger.debug('Haptic feedback not available', {
        component: 'Haptic',
        operation: 'vibrate',
      });
    }
  }

  /**
   * Selection feedback (for toggle switches, etc)
   */
  selection() {
    if (!this.isSupported) return;

    try {
      const windowWithTaptic = window as WindowWithTaptic;
      if ('Taptic' in window && windowWithTaptic.Taptic?.selection) {
        windowWithTaptic.Taptic.selection();
      } else {
        navigator.vibrate(5);
      }
    } catch (error) {
      logger.debug('Haptic feedback not available', {
        component: 'Haptic',
        operation: 'vibrate',
      });
    }
  }

  /**
   * Custom vibration pattern
   */
  custom(pattern: number | number[]) {
    if (!this.isSupported) return;

    try {
      navigator.vibrate(pattern);
    } catch (error) {
      logger.debug('Haptic feedback not available', {
        component: 'Haptic',
        operation: 'vibrate',
      });
    }
  }

  /**
   * Check if haptic feedback is available
   */
  isAvailable(): boolean {
    return this.isSupported;
  }
}

// Export singleton instance
export const haptic = new HapticFeedback();
