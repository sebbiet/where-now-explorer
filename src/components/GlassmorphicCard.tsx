import { memo, ReactNode } from 'react';
import { glassMorphism, gradients, animations } from '@/styles/constants';

interface GlassmorphicCardProps {
  children: ReactNode;
  className?: string;
}

const GlassmorphicCard = memo(({ children, className = '' }: GlassmorphicCardProps) => {
  return (
    <div 
      className={`relative backdrop-blur-2xl rounded-3xl p-8 transform hover:scale-[1.01] transition-all duration-700 animate-slide-up ${className}`}
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
      
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
});

GlassmorphicCard.displayName = 'GlassmorphicCard';

export default GlassmorphicCard;