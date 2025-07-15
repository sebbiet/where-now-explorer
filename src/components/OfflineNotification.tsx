import React, { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { animations } from '@/styles/constants';

const OfflineNotification: React.FC = () => {
  const { isOnline, wasOffline } = useOnlineStatus();
  const [show, setShow] = useState(false);
  const [showBackOnline, setShowBackOnline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setShow(true);
      setShowBackOnline(false);
    } else if (wasOffline) {
      setShow(false);
      setShowBackOnline(true);
      const timer = setTimeout(
        () => setShowBackOnline(false),
        animations.timeouts.notification
      );
      return () => clearTimeout(timer);
    } else {
      setShow(false);
    }
  }, [isOnline, wasOffline]);

  if (!show && !showBackOnline) return null;

  return (
    <>
      {/* Offline notification */}
      <div
        className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 transition-all ${
          show ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
        }`}
        style={{ transitionDuration: animations.durations.moderate }}
      >
        <div className="bg-red-500 text-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 animate-bounce">
          <WifiOff className="w-6 h-6" />
          <div>
            <p className="font-bold text-lg">No Internet Connection</p>
            <p className="text-sm opacity-90">
              Some features may not work offline
            </p>
          </div>
        </div>
      </div>

      {/* Back online notification */}
      <div
        className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 transition-all ${
          showBackOnline
            ? 'translate-y-0 opacity-100'
            : '-translate-y-full opacity-0'
        }`}
        style={{ transitionDuration: animations.durations.moderate }}
      >
        <div className="bg-green-500 text-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3">
          <Wifi className="w-6 h-6" />
          <div>
            <p className="font-bold text-lg">Back Online! 🎉</p>
            <p className="text-sm opacity-90">All features are working again</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default OfflineNotification;
