import React, { ReactNode } from 'react';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import LoadingSpinner from './LoadingSpinner';

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => void | Promise<void>;
  disabled?: boolean;
}

const PullToRefresh: React.FC<PullToRefreshProps> = ({
  children,
  onRefresh,
  disabled = false,
}) => {
  const { containerRef, isPulling, pullDistance, isRefreshing, pullProgress } =
    usePullToRefresh({
      onRefresh,
      threshold: 80,
      disabled,
    });

  return (
    <div ref={containerRef} className="relative">
      {/* Pull indicator */}
      {(isPulling || isRefreshing) && (
        <div
          className="absolute left-0 right-0 flex justify-center items-center transition-all duration-200 z-10"
          style={{
            top: -60,
            transform: `translateY(${Math.min(pullDistance, 100)}px)`,
            opacity: Math.min(pullProgress * 2, 1),
          }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-full p-3 shadow-lg">
            {isRefreshing ? (
              <LoadingSpinner />
            ) : (
              <div
                className="w-8 h-8 flex items-center justify-center"
                style={{
                  transform: `rotate(${pullProgress * 180}deg)`,
                }}
              >
                <span className="text-2xl">↓</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content with transform */}
      <div
        className="transition-transform duration-200"
        style={{
          transform:
            isPulling && !isRefreshing
              ? `translateY(${Math.min(pullDistance, 100)}px)`
              : isRefreshing
                ? 'translateY(60px)'
                : 'translateY(0)',
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;
