import { useState, useEffect } from 'react';
import { analytics } from '@/services/analytics.service';
import { animations } from '@/styles/constants';

const ThemeToggle = () => {
  // Check if user prefers dark mode
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const [isDarkMode, setIsDarkMode] = useState(
    localStorage.getItem('theme') === 'dark' ||
      (!('theme' in localStorage) && prefersDark)
  );
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const handleToggle = () => {
    setIsAnimating(true);

    // Track theme toggle
    const newTheme = isDarkMode ? 'light' : 'dark';
    analytics.trackThemeToggle({
      new_theme: newTheme,
      system_preference: prefersDark ? 'dark' : 'light',
    });

    setTimeout(() => {
      setIsDarkMode(!isDarkMode);
      setIsAnimating(false);
    }, parseInt(animations.durations.normal));
  };

  return (
    <button
      className="relative w-20 h-20 rounded-full bg-gradient-to-br from-sky to-sunshine dark:from-purple-900 dark:to-indigo-900 shadow-xl transform transition-all hover:scale-110 active:scale-95"
      style={{ transitionDuration: animations.durations.normal }}
      onClick={handleToggle}
      aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {/* Sun */}
      <div
        className={`absolute inset-0 flex items-center justify-center transition-all ${
          isDarkMode
            ? 'opacity-0 scale-50 rotate-180'
            : 'opacity-100 scale-100 rotate-0'
        }`}
        style={{ transitionDuration: animations.durations.moderate }}
      >
        {/* Sun rays - behind the sun emoji */}
        <div className="absolute inset-0">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute top-1/2 left-1/2 w-1 h-8 bg-yellow-400 origin-bottom"
              style={{
                transform: `translate(-50%, -100%) rotate(${i * 45}deg)`,
                opacity: isAnimating ? 0 : 1,
                transition: `opacity ${animations.durations.normal}`,
              }}
            />
          ))}
        </div>
        {/* Sun emoji - in front of the rays */}
        <span className="text-4xl relative z-10">☀️</span>
      </div>

      {/* Moon */}
      <div
        className={`absolute inset-0 flex items-center justify-center transition-all ${
          isDarkMode
            ? 'opacity-100 scale-100 rotate-0'
            : 'opacity-0 scale-50 -rotate-180'
        }`}
        style={{ transitionDuration: animations.durations.moderate }}
      >
        <span className="text-4xl">🌙</span>
        {/* Stars */}
        <div className="absolute inset-0">
          <span className="absolute top-2 right-4 text-xs animate-pulse">
            ✨
          </span>
          <span
            className="absolute bottom-4 left-3 text-sm animate-pulse"
            style={{ animationDelay: animations.delays.minimal }}
          >
            ⭐
          </span>
          <span
            className="absolute top-5 left-5 text-xs animate-pulse"
            style={{ animationDelay: animations.delays.short }}
          >
            ✨
          </span>
        </div>
      </div>

      {/* Rotating animation overlay */}
      {isAnimating && (
        <div className="absolute inset-0 rounded-full bg-white opacity-30 animate-spin"></div>
      )}
    </button>
  );
};

export default ThemeToggle;
