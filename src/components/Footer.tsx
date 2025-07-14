import React from 'react';
import { glassMorphism, gradients } from '@/styles/constants';

const Footer: React.FC = () => {
  return (
    <footer className="mt-16 mb-8">
      <div 
        className="relative backdrop-blur-2xl rounded-3xl p-6 transform hover:scale-[1.01] transition-all duration-700"
        style={glassMorphism.light}
      >
        {/* Glass morphism effect overlay */}
        <div 
          className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{ background: gradients.glassOverlay }}
        />
        
        {/* Dark mode overlay */}
        <div 
          className="absolute inset-0 rounded-3xl hidden dark:block pointer-events-none"
          style={glassMorphism.dark}
        />

        <div className="relative z-10 text-center">
          {/* Story blurb */}
          <div className="mb-6 max-w-2xl mx-auto">
            <p className="text-base md:text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
              <span className="text-2xl mr-2" role="img" aria-label="sparkles">✨</span>
              I built this app to answer my son's VERY FREQUENT "Are we there yet?" and "Where are we?" questions. 
              Turns out, kids are basically tiny GPS units that need constant location updates! 
              This is meant to be a bit of fun and give you a rough guide to where you are in this big, 
              beautiful world. Don't worry, I'm not tracking your adventures or collecting your data. 
              Your location stays right with you!
              <span className="text-2xl ml-2" role="img" aria-label="globe">🌍</span>
            </p>
          </div>
          
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