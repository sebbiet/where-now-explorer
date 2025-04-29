
import React from 'react';

const LocationPin: React.FC = () => {
  return (
    <div className="flex justify-center mb-6">
      <svg 
        width="40" 
        height="58" 
        viewBox="0 0 40 58" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="animate-bounce"
      >
        <path 
          d="M20 0C8.96 0 0 8.96 0 20C0 35 20 58 20 58C20 58 40 35 40 20C40 8.96 31.04 0 20 0ZM20 27C16.14 27 13 23.86 13 20C13 16.14 16.14 13 20 13C23.86 13 27 16.14 27 20C27 23.86 23.86 27 20 27Z" 
          fill="#33C3F0" 
          className="drop-shadow-md"
        />
      </svg>
    </div>
  );
};

export default LocationPin;
