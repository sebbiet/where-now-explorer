
import React from 'react';
import { useTheme } from '@/hooks/useTheme';

const LocationPin: React.FC = () => {
  const { isDarkMode } = useTheme();
  
  return (
    <div className="flex justify-center mb-8 relative">
      {/* Cute character/mascot */}
      <div className="relative animate-bounce">
        {/* Main balloon body */}
        <svg 
          width="140" 
          height="160" 
          viewBox="0 0 120 140" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-2xl"
        >
          {/* Balloon string */}
          <path d="M60 90 Q60 120 60 130" stroke="#9b87f5" strokeWidth="2" fill="none" />
          
          {/* Balloon */}
          <circle cx="60" cy="50" r="45" fill="#FFD166" className="filter drop-shadow-lg" />
          <circle cx="60" cy="50" r="40" fill="#FFD166" />
          
          {/* Highlight on balloon */}
          <ellipse cx="45" cy="35" rx="12" ry="18" fill="#FFF5E1" opacity="0.7" />
          
          {/* Cute face */}
          {/* Eyes */}
          <circle cx="45" cy="45" r="8" fill="#2D3748" />
          <circle cx="75" cy="45" r="8" fill="#2D3748" />
          <circle cx="47" cy="43" r="3" fill="white" />
          <circle cx="77" cy="43" r="3" fill="white" />
          
          {/* Smile */}
          <path d="M40 60 Q60 70 80 60" stroke="#2D3748" strokeWidth="3" strokeLinecap="round" fill="none" />
          
          {/* Cheeks */}
          <circle cx="30" cy="55" r="8" fill="#FFA0C9" opacity="0.5" />
          <circle cx="90" cy="55" r="8" fill="#FFA0C9" opacity="0.5" />
          
          {/* Sunglasses - only visible in light mode */}
          {!isDarkMode && (
            <g>
              {/* Sunglasses frame */}
              <path 
                d="M35 42 Q45 40 55 42 L55 50 Q45 52 35 50 Z M65 42 Q75 40 85 42 L85 50 Q75 52 65 50 Z M55 46 L65 46" 
                fill="none" 
                stroke="#1a1a1a" 
                strokeWidth="3.5"
              />
              {/* Left lens */}
              <ellipse cx="45" cy="46" rx="13" ry="10" fill="#1a1a1a" />
              <ellipse cx="43" cy="44" rx="3" ry="4" fill="#4a90e2" opacity="0.5" />
              {/* Right lens */}
              <ellipse cx="75" cy="46" rx="13" ry="10" fill="#1a1a1a" />
              <ellipse cx="73" cy="44" rx="3" ry="4" fill="#4a90e2" opacity="0.5" />
            </g>
          )}
          
          {/* Location pin at bottom */}
          <path d="M60 130 L55 140 L60 135 L65 140 Z" fill="#9b87f5" />
        </svg>
        
        {/* Sparkles around the character */}
        <div className="absolute top-0 -left-4 text-2xl animate-pulse">✨</div>
        <div className="absolute top-8 -right-4 text-xl animate-pulse" style={{animationDelay: '0.5s'}}>⭐</div>
        <div className="absolute bottom-4 -left-2 text-lg animate-pulse" style={{animationDelay: '1s'}}>✨</div>
      </div>
    </div>
  );
};

export default LocationPin;
