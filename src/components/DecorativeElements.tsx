import { memo } from 'react';
import { animations } from '@/styles/constants';

const DecorativeElements = memo(() => {
  return (
    <div className="hidden lg:block absolute inset-0 z-0 decorative-landscape-hide">
      {/* Left side decorations */}
      <div className="absolute left-8 top-1/2 -translate-y-1/2">
        <div className="text-8xl opacity-20 dark:opacity-10 animate-float">
          🚗
        </div>
        <div
          className="text-6xl opacity-20 dark:opacity-10 mt-8 animate-float"
          style={{ animationDelay: animations.delays.medium }}
        >
          🛣️
        </div>
        <div
          className="text-5xl opacity-20 dark:opacity-10 mt-6 animate-float"
          style={{ animationDelay: animations.delays.veryLong }}
        >
          🗺️
        </div>
      </div>

      {/* Right side decorations */}
      <div className="absolute right-8 top-1/2 -translate-y-1/2">
        <div
          className="text-7xl opacity-20 dark:opacity-10 animate-float"
          style={{ animationDelay: animations.delays.short }}
        >
          🏆
        </div>
        <div
          className="text-6xl opacity-20 dark:opacity-10 mt-8 animate-float"
          style={{ animationDelay: animations.delays.long }}
        >
          🎯
        </div>
        <div
          className="text-5xl opacity-20 dark:opacity-10 mt-6 animate-float"
          style={{ animationDelay: animations.delays.extraLong }}
        >
          🚩
        </div>
      </div>
    </div>
  );
});

DecorativeElements.displayName = 'DecorativeElements';

export default DecorativeElements;
