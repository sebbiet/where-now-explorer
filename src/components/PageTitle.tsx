import { memo } from 'react';
import { shadows, animations } from '@/styles/constants';

const PageTitle = memo(() => {
  return (
    <div className="text-center animate-fade-in">
      <h1 
        className="text-5xl md:text-7xl font-black text-gray-800 dark:text-white mb-4 transform -rotate-2 hover:rotate-0 transition-transform duration-300"
        style={{ textShadow: shadows.titleShadow }}
      >
        Are We There Yet?
      </h1>
      <p className="text-xl md:text-2xl text-gray-700 dark:text-white font-bold drop-shadow-lg">
        🗺️ Discover where you are and where you're going! 🚗
      </p>
    </div>
  );
});

PageTitle.displayName = 'PageTitle';

export default PageTitle;