import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="mt-16 mb-8">
      <div className="relative backdrop-blur-2xl rounded-3xl p-6 transform hover:scale-[1.01] transition-all duration-700" style={{
        background: 'rgba(255, 255, 255, 0.85)',
        boxShadow: `
          0 8px 32px rgba(0, 0, 0, 0.12),
          0 2px 16px rgba(0, 0, 0, 0.08),
          inset 0 1px 0 rgba(255, 255, 255, 0.8)
        `,
        border: '1px solid rgba(255, 255, 255, 0.3)'
      }}>
        {/* Glass morphism effect overlay */}
        <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.1) 50%, rgba(255, 255, 255, 0.05) 100%)'
        }}></div>
        
        {/* Dark mode overlay */}
        <div className="absolute inset-0 rounded-3xl hidden dark:block pointer-events-none" style={{
          background: 'rgba(30, 41, 59, 0.9)',
          boxShadow: `
            0 8px 32px rgba(0, 0, 0, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.1)
          `
        }}></div>

        <div className="relative z-10 text-center">
          <p className="text-lg md:text-xl text-gray-700 dark:text-white font-semibold flex items-center justify-center gap-2 flex-wrap">
            Made by{' '}
            <a
              href="http://sebastiantiller.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors duration-300 font-bold underline decoration-2 underline-offset-4 hover:decoration-purple-500 focus:outline-none focus:ring-4 focus:ring-blue-400 focus:ring-offset-2 rounded-md px-2 py-1"
              aria-label="Visit Sebastian Tiller's personal website"
            >
              @sebish
            </a>
          </p>
          
          <div className="mt-4 flex items-center justify-center gap-6">
            <a
              href="http://sebastiantiller.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-400 focus:ring-offset-2 rounded-lg px-3 py-2"
              aria-label="Visit personal website"
            >
              <span className="text-2xl" role="img" aria-hidden="true">🌐</span>
              <span className="font-medium">Website</span>
            </a>
            
            <a
              href="https://x.com/sebish"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-400 focus:ring-offset-2 rounded-lg px-3 py-2"
              aria-label="Follow on X (formerly Twitter)"
            >
              <span className="text-2xl" role="img" aria-hidden="true">🐦</span>
              <span className="font-medium">@sebish</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;