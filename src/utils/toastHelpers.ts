import { toast } from 'sonner';

export interface ToastOptions {
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
}

/**
 * Success toast patterns
 */
export const toastSuccess = {
  locationFound: () =>
    toast.success('📍 Location found!', {
      description: 'We know where you are now.',
    }),

  destinationSet: (placeName: string) =>
    toast.success('🎯 Destination set!', {
      description: `Calculating route to ${placeName}...`,
    }),

  routeCalculated: () =>
    toast.success('🗺️ Route calculated!', {
      description: 'Your journey details are ready.',
    }),

  preferencesUpdated: () =>
    toast.success('✅ Preferences saved', {
      description: 'Your settings have been updated.',
    }),

  copied: (text: string) =>
    toast.success('📋 Copied!', {
      description: `${text} copied to clipboard.`,
    }),
};

/**
 * Error toast patterns (extends the ones in errorHandling.ts)
 */
export const toastError = {
  routeNotFound: () =>
    toast.error('🚗 No route found', {
      description:
        "We couldn't find a driving route to that destination. It might be on an island or inaccessible by car.",
    }),

  invalidInput: (fieldName: string) =>
    toast.error('❌ Invalid input', {
      description: `Please check your ${fieldName} and try again.`,
    }),

  featureUnavailable: () =>
    toast.error('🚧 Feature unavailable', {
      description: 'This feature is not available in your browser.',
    }),

  rateLimit: (retryAfter?: number) =>
    toast.error('⏳ Too many requests', {
      description: retryAfter
        ? `Please wait ${retryAfter} seconds before trying again.`
        : 'Please wait a moment before trying again.',
    }),
};

/**
 * Warning toast patterns
 */
export const toastWarning = {
  lowAccuracy: () =>
    toast.warning('⚠️ Low accuracy', {
      description: 'Location accuracy is reduced. Results may vary.',
    }),

  oldData: (minutes: number) =>
    toast.warning('🕐 Using older data', {
      description: `Location data is ${minutes} minutes old. Refresh for current location.`,
    }),

  offlineMode: () =>
    toast.warning('📡 Offline mode', {
      description: 'Some features may be limited without internet.',
    }),

  limitedFeatures: () =>
    toast.warning('⚠️ Limited features', {
      description: 'Some features are disabled due to privacy settings.',
    }),
};

/**
 * Info toast patterns
 */
export const toastInfo = {
  loading: (message: string) =>
    toast.info('⏳ ' + message, {
      description: 'Please wait...',
    }),

  hint: (tip: string) =>
    toast.info('💡 Tip', {
      description: tip,
    }),

  update: (message: string) =>
    toast.info('🔄 Update', {
      description: message,
    }),

  welcome: (name?: string) =>
    toast.info('👋 Welcome!', {
      description: name
        ? `Hello ${name}, ready to explore?`
        : 'Ready to find out where you are?',
    }),
};

/**
 * Helper function to show loading toast that can be updated
 */
export const createLoadingToast = (message: string) => {
  const id = toast.loading(message);

  return {
    update: (message: string) => toast.loading(message, { id }),
    success: (message: string) => toast.success(message, { id }),
    error: (message: string) => toast.error(message, { id }),
    dismiss: () => toast.dismiss(id),
  };
};

/**
 * Helper for sequential toasts
 */
export const toastSequence = async (
  toasts: Array<{
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    options?: ToastOptions;
    delay?: number;
  }>
) => {
  for (const item of toasts) {
    switch (item.type) {
      case 'success':
        toast.success(item.message, item.options);
        break;
      case 'error':
        toast.error(item.message, item.options);
        break;
      case 'warning':
        toast.warning(item.message, item.options);
        break;
      case 'info':
        toast.info(item.message, item.options);
        break;
    }

    if (item.delay) {
      await new Promise((resolve) => setTimeout(resolve, item.delay));
    }
  }
};
