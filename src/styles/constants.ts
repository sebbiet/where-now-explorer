/**
 * Style constants for consistent theming across the application
 */

// Gradients
export const gradients = {
  // Background gradients
  meshGradient: `
    radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.3) 0%, transparent 50%),
    radial-gradient(circle at 80% 70%, rgba(251, 191, 36, 0.3) 0%, transparent 50%),
    radial-gradient(circle at 40% 80%, rgba(167, 139, 250, 0.3) 0%, transparent 50%),
    radial-gradient(circle at 90% 20%, rgba(34, 197, 94, 0.2) 0%, transparent 50%)
  `,
  
  darkOverlay: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(88, 28, 135, 0.9) 35%, rgba(30, 58, 138, 0.9) 70%, rgba(15, 23, 42, 0.95) 100%)',
  
  // Bubble gradients
  blueBubble: 'radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.1) 70%, transparent 100%)',
  yellowBubble: 'radial-gradient(circle, rgba(251, 191, 36, 0.4) 0%, rgba(251, 191, 36, 0.1) 70%, transparent 100%)',
  purpleBubble: 'radial-gradient(circle, rgba(167, 139, 250, 0.4) 0%, rgba(167, 139, 250, 0.1) 70%, transparent 100%)',
  
  // Glass morphism overlay
  glassOverlay: 'linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.1) 50%, rgba(255, 255, 255, 0.05) 100%)',
  
  // Button gradients
  skyButton: 'from-sky to-blue-500',
  grapeButton: 'from-grape to-pink-500',
  purpleButton: 'from-purple-500 to-purple-700'
} as const;

// Shadows
export const shadows = {
  // Glass morphism shadows
  glassShadow: `
    0 8px 32px rgba(0, 0, 0, 0.12),
    0 2px 16px rgba(0, 0, 0, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.8)
  `,
  
  glassShadowDark: `
    0 8px 32px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.1)
  `,
  
  // Text shadows
  titleShadow: '3px 3px 0 #FFD166, 6px 6px 0 #9b87f5, 9px 9px 20px rgba(0,0,0,0.3)',
  
  // Button shadows
  buttonShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  buttonHoverShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
} as const;

// Animations
export const animations = {
  // Transition durations (in milliseconds)
  durations: {
    instant: '100ms',      // 100ms - tap effects, immediate responses
    fast: '150ms',         // 150ms - quick interactions
    swift: '200ms',        // 200ms - UI state changes
    normal: '300ms',       // 300ms - standard transitions
    moderate: '500ms',     // 500ms - content transitions
    slow: '600ms',         // 600ms - complex animations
    deliberate: '700ms',   // 700ms - emphasis animations
    leisurely: '800ms',    // 800ms - slide animations
    measured: '1000ms',    // 1s - major transitions
    extended: '2000ms',    // 2s - loading spinners
    prolonged: '3000ms',   // 3s - ambient animations
    lengthy: '6000ms',     // 6s - floating effects
    epic: '20000ms'        // 20s - continuous background animations
  },
  
  // Animation delays
  delays: {
    instant: '0ms',
    minimal: '500ms',      // 0.5s - quick sequential animations
    short: '1000ms',       // 1s - standard delays
    medium: '1500ms',      // 1.5s - staggered animations
    moderate: '2000ms',    // 2s - medium delays
    standard: '2500ms',    // 2.5s - content reveals
    long: '3000ms',        // 3s - notification dismissals
    extended: '4000ms',    // 4s - longer sequences
    prolonged: '5000ms'    // 5s - cleanup operations
  },
  
  // Animation durations for Framer Motion (in seconds)
  framerDurations: {
    tap: 0.1,              // 100ms - press effects
    swipe: 0.3,            // 300ms - swipe gestures
    bubble: 0.5,           // 500ms - bubble animations
    ripple: 0.6            // 600ms - ripple effects
  },
  
  // Common timeout durations (in milliseconds)
  timeouts: {
    debounce: 100,         // 100ms - input debouncing
    feedback: 1000,        // 1s - user feedback delays
    notification: 3000,    // 3s - notification auto-dismiss
    cleanup: 5000,         // 5s - resource cleanup
    polling: 300000        // 5 minutes - API cache cleanup
  },
  
  // Easing functions
  easing: {
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
    sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
    linear: 'linear',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out'
  }
} as const;

// Helper function to get animation duration in various formats
export const getAnimationDuration = (duration: keyof typeof animations.durations) => ({
  ms: parseInt(animations.durations[duration]),
  css: animations.durations[duration],
  seconds: parseInt(animations.durations[duration]) / 1000
});

// Helper function to get delay in various formats
export const getAnimationDelay = (delay: keyof typeof animations.delays) => ({
  ms: parseInt(animations.delays[delay]),
  css: animations.delays[delay],
  seconds: parseInt(animations.delays[delay]) / 1000
});

// Glass morphism styles
export const glassMorphism = {
  light: {
    background: 'rgba(255, 255, 255, 0.85)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    boxShadow: shadows.glassShadow
  },
  dark: {
    background: 'rgba(30, 41, 59, 0.9)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: shadows.glassShadowDark
  }
} as const;

// Z-index layers
export const zIndex = {
  background: 0,
  decorative: 10,
  content: 20,
  overlay: 30,
  modal: 40,
  notification: 50,
  debug: 100
} as const;