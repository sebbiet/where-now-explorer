import React, { useState, useEffect } from 'react';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { haptic } from '@/utils/haptic';
import { X } from 'lucide-react';
import { LoadingButton } from '@/utils/loadingStates';

const InstallPrompt: React.FC = () => {
  const { isInstallable, isInstalled, promptInstall } = useInstallPrompt();
  const [isDismissed, setIsDismissed] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // Check if user has previously dismissed the prompt
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      setIsDismissed(true);
    }

    // Show banner after a delay if installable
    if (isInstallable && !dismissed && !isInstalled) {
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 5000); // Show after 5 seconds

      return () => clearTimeout(timer);
    }
  }, [isInstallable, isInstalled]);

  const handleInstall = async () => {
    setIsInstalling(true);
    haptic.medium();

    try {
      const success = await promptInstall();
      if (success) {
        setShowBanner(false);
      }
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    haptic.light();
    setShowBanner(false);
    setIsDismissed(true);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (!showBanner || isDismissed || isInstalled || !isInstallable) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-8 md:max-w-sm z-40 animate-slide-up">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-4 border-2 border-blue-500">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Dismiss install prompt"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <span className="text-2xl">🌍</span>
            </div>
          </div>

          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
              Install Where Now Explorer
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
              Add to your home screen for the best experience - works offline
              too!
            </p>

            <div className="flex gap-2">
              <LoadingButton
                isLoading={isInstalling}
                loadingText="Installing..."
                onClick={handleInstall}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold rounded-lg hover:scale-105 transition-transform focus:outline-none focus:ring-4 focus:ring-blue-400"
              >
                Install App
              </LoadingButton>
              <button
                onClick={handleDismiss}
                disabled={isInstalling}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
              >
                Not Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstallPrompt;
