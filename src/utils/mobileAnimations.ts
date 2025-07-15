/**
 * Mobile-specific animation utilities
 * Provides optimized animations for touch interactions
 */

import { animations } from '@/styles/constants';

export const mobileAnimations = {
  // Touch ripple effect
  touchRipple: {
    initial: { scale: 0, opacity: 0.5 },
    animate: { scale: 2.5, opacity: 0 },
    transition: {
      duration: animations.framerDurations.ripple,
      ease: 'easeOut',
    },
  },

  // Swipe animations
  swipeLeft: {
    initial: { x: 0, opacity: 1 },
    animate: { x: -100, opacity: 0 },
    transition: {
      duration: animations.framerDurations.swipe,
      ease: 'easeInOut',
    },
  },

  swipeRight: {
    initial: { x: 0, opacity: 1 },
    animate: { x: 100, opacity: 0 },
    transition: {
      duration: animations.framerDurations.swipe,
      ease: 'easeInOut',
    },
  },

  // Pull down animation
  pullDown: {
    initial: { y: -100, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    transition: {
      type: 'spring',
      stiffness: 260,
      damping: 20,
    },
  },

  // Tap scale animation
  tapScale: {
    whileTap: { scale: 0.95 },
    transition: { duration: animations.framerDurations.tap },
  },

  // Bounce in animation
  bounceIn: {
    initial: { scale: 0, opacity: 0 },
    animate: {
      scale: [0, 1.05, 0.98, 1],
      opacity: 1,
    },
    transition: {
      duration: 0.4,
      times: [0, 0.6, 0.8, 1],
    },
  },

  // Success animation
  success: {
    initial: { scale: 0, rotate: 0 },
    animate: {
      scale: [0, 1.2, 1],
      rotate: [0, 15, -15, 0],
    },
    transition: { duration: animations.framerDurations.bubble },
  },
};

// CSS classes for mobile animations
export const mobileAnimationClasses = {
  tap: `active:scale-95 transition-transform`,
  swipeable: 'touch-pan-y',
  draggable: 'touch-none select-none',
  bounce: 'animate-bounce-in',
  fadeIn: 'animate-fade-in',
  slideUp: 'animate-slide-up',
};

// Helper to get CSS transition duration for tap animations
export const getTapTransitionStyle = () => ({
  transitionDuration: animations.durations.instant,
});

// Touch gesture detection
export const detectSwipe = (
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  threshold = 50
) => {
  const deltaX = endX - startX;
  const deltaY = endY - startY;
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);

  if (absX > absY && absX > threshold) {
    return deltaX > 0 ? 'right' : 'left';
  } else if (absY > absX && absY > threshold) {
    return deltaY > 0 ? 'down' : 'up';
  }
  return null;
};
