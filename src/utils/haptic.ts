/**
 * Haptic feedback utility for mobile devices
 * Provides vibration feedback for touch interactions
 */

interface HapticOptions {
  duration?: number;
  pattern?: number[];
  type?: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';
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
      if ('Taptic' in window && (window as any).Taptic?.impact) {
        (window as any).Taptic.impact({ style: 'light' });
      } else {
        // Android/standard vibration API
        navigator.vibrate(10);
      }
    } catch (error) {
      console.debug('Haptic feedback not available');
    }
  }

  /**
   * Medium vibration for important actions
   */
  medium() {
    if (!this.isSupported) return;
    
    try {
      if ('Taptic' in window && (window as any).Taptic?.impact) {
        (window as any).Taptic.impact({ style: 'medium' });
      } else {
        navigator.vibrate(20);
      }
    } catch (error) {
      console.debug('Haptic feedback not available');
    }
  }

  /**
   * Strong vibration for errors or important notifications
   */
  heavy() {
    if (!this.isSupported) return;
    
    try {
      if ('Taptic' in window && (window as any).Taptic?.impact) {
        (window as any).Taptic.impact({ style: 'heavy' });
      } else {
        navigator.vibrate(30);
      }
    } catch (error) {
      console.debug('Haptic feedback not available');
    }
  }

  /**
   * Success pattern vibration
   */
  success() {
    if (!this.isSupported) return;
    
    try {
      if ('Taptic' in window && (window as any).Taptic?.notification) {
        (window as any).Taptic.notification({ type: 'success' });
      } else {
        // Pattern: short, pause, short
        navigator.vibrate([20, 50, 20]);
      }
    } catch (error) {
      console.debug('Haptic feedback not available');
    }
  }

  /**
   * Error pattern vibration
   */
  error() {
    if (!this.isSupported) return;
    
    try {
      if ('Taptic' in window && (window as any).Taptic?.notification) {
        (window as any).Taptic.notification({ type: 'error' });
      } else {
        // Pattern: long vibration
        navigator.vibrate(50);
      }
    } catch (error) {
      console.debug('Haptic feedback not available');
    }
  }

  /**
   * Selection feedback (for toggle switches, etc)
   */
  selection() {
    if (!this.isSupported) return;
    
    try {
      if ('Taptic' in window && (window as any).Taptic?.selection) {
        (window as any).Taptic.selection();
      } else {
        navigator.vibrate(5);
      }
    } catch (error) {
      console.debug('Haptic feedback not available');
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
      console.debug('Haptic feedback not available');
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