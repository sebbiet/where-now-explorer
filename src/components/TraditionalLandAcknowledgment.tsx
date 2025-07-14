import React from 'react';
import { Leaf } from 'lucide-react';

interface TraditionalLandAcknowledgmentProps {
  traditionalName: string;
  traditionalNation: string;
}

const TraditionalLandAcknowledgment: React.FC<TraditionalLandAcknowledgmentProps> = ({
  traditionalName,
  traditionalNation
}) => {
  return (
    <div className="w-full max-w-4xl mt-6 relative backdrop-blur-2xl rounded-3xl p-8 animate-fade-in" style={{
      background: 'rgba(255, 255, 255, 0.85)',
      boxShadow: `
        0 8px 32px rgba(0, 0, 0, 0.12),
        0 2px 16px rgba(0, 0, 0, 0.08),
        inset 0 1px 0 rgba(255, 255, 255, 0.8)
      `,
      border: '1px solid rgba(255, 255, 255, 0.3)'
    }}>
      {/* Dark mode overlay */}
      <div className="absolute inset-0 rounded-3xl hidden dark:block pointer-events-none" style={{
        background: 'rgba(30, 41, 59, 0.9)',
        boxShadow: `
          0 8px 32px rgba(0, 0, 0, 0.4),
          inset 0 1px 0 rgba(255, 255, 255, 0.1)
        `
      }}></div>
      
      <div className="relative z-10">
        <div className="flex items-center justify-center mb-6">
          <div 
            className="p-4 rounded-full" 
            style={{
              background: 'linear-gradient(135deg, #D97706 0%, #92400E 50%, #78350F 100%)',
              boxShadow: '0 4px 20px rgba(217, 119, 6, 0.3)'
            }}
          >
            <Leaf className="w-12 h-12 text-white" />
          </div>
        </div>
        
        <div className="text-center space-y-4">
          <h3 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-yellow-700 to-amber-900 bg-clip-text text-transparent">
            {traditionalName}
          </h3>
          
          <p className="text-lg md:text-xl text-gray-700 dark:text-gray-300 leading-relaxed max-w-3xl mx-auto">
            We acknowledge the <span className="font-bold text-amber-700 dark:text-amber-400">{traditionalNation}</span> as 
            the Traditional Custodians of <span className="font-bold">{traditionalName}</span>, 
            the land on which you are located.
          </p>
          
          <p className="text-base text-gray-600 dark:text-gray-400 mt-4">
            We pay our respects to Elders past, present and emerging.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TraditionalLandAcknowledgment;