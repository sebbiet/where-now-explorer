import React, { useState } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/utils/loadingStates';

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
  context?: 'location' | 'destination' | 'general';
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetError,
  context = 'general',
}) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await resetError();
    } finally {
      setIsRetrying(false);
    }
  };

  const handleRestart = async () => {
    setIsRestarting(true);
    try {
      window.location.reload();
    } finally {
      // Not needed since page will reload, but good practice
      setIsRestarting(false);
    }
  };

  // Kid-friendly error messages based on context
  const getErrorMessage = () => {
    if (
      error.message.includes('geolocation') ||
      error.message.includes('location')
    ) {
      return {
        title: "Can't Find Your Location 📍",
        message: 'Make sure location services are turned on in your browser!',
        icon: '🗺️',
        actions: ['retry', 'settings'],
      };
    }

    if (error.message.includes('network') || error.message.includes('fetch')) {
      return {
        title: 'Connection Problem 🌐',
        message: 'Check your internet connection and try again!',
        icon: '📡',
        actions: ['retry'],
      };
    }

    if (context === 'destination') {
      return {
        title: "Oops! Can't Calculate Route 🚗",
        message: "We couldn't find a way to get there. Try a different place!",
        icon: '🛣️',
        actions: ['retry', 'home'],
      };
    }

    return {
      title: 'Something Went Wrong 😕',
      message: "Don't worry! Let's try again.",
      icon: '🔧',
      actions: ['retry', 'home'],
    };
  };

  const errorInfo = getErrorMessage();

  const handleOpenSettings = () => {
    // Try to open browser settings page (this may not work in all browsers)
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'denied') {
          alert('Please enable location permissions in your browser settings.');
        }
      });
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-8 animate-fade-in">
      <div
        className="relative backdrop-blur-2xl rounded-3xl p-8 text-center"
        style={{
          background: 'rgba(255, 255, 255, 0.85)',
          boxShadow: `
          0 8px 32px rgba(0, 0, 0, 0.12),
          0 2px 16px rgba(0, 0, 0, 0.08),
          inset 0 1px 0 rgba(255, 255, 255, 0.8)
        `,
          border: '1px solid rgba(255, 255, 255, 0.3)',
        }}
      >
        {/* Dark mode overlay */}
        <div
          className="absolute inset-0 rounded-3xl hidden dark:block pointer-events-none"
          style={{
            background: 'rgba(30, 41, 59, 0.9)',
            boxShadow: `
            0 8px 32px rgba(0, 0, 0, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.1)
          `,
          }}
        ></div>

        <div className="relative z-10">
          {/* Error icon */}
          <div className="text-6xl mb-4 animate-bounce">{errorInfo.icon}</div>

          {/* Error message */}
          <h2 className="text-3xl font-black text-gray-800 dark:text-white mb-4">
            {errorInfo.title}
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
            {errorInfo.message}
          </p>

          {/* Error details (dev mode only) */}
          {process.env.NODE_ENV === 'development' && (
            <details className="mb-6 text-left">
              <summary className="cursor-pointer text-sm text-gray-500 dark:text-gray-400">
                Technical details
              </summary>
              <pre className="mt-2 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs overflow-auto">
                {error.stack || error.message}
              </pre>
            </details>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-4 justify-center">
            {errorInfo.actions.includes('retry') && (
              <LoadingButton
                isLoading={isRetrying}
                loadingText="Retrying..."
                onClick={handleRetry}
                className="bg-gradient-to-r from-green-400 to-emerald-400 text-gray-800 hover:from-green-300 hover:to-emerald-300 font-black shadow-lg hover:shadow-xl"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                Try Again
              </LoadingButton>
            )}

            {errorInfo.actions.includes('home') && (
              <LoadingButton
                isLoading={isRestarting}
                loadingText="Restarting..."
                onClick={handleRestart}
                className="font-bold border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              >
                <Home className="w-5 h-5 mr-2" />
                Start Over
              </LoadingButton>
            )}

            {errorInfo.actions.includes('settings') && (
              <Button
                onClick={handleOpenSettings}
                variant="outline"
                className="font-bold"
                disabled={isRetrying || isRestarting}
              >
                <AlertTriangle className="w-5 h-5 mr-2" />
                Check Settings
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorFallback;
