import { memo } from 'react';
import { gradients, animations } from '@/styles/constants';

const AnimatedBackground = memo(() => {
  return (
    <div className="absolute inset-0">
      {/* Animated mesh gradient overlay */}
      <div 
        className="absolute inset-0 opacity-30 dark:opacity-20"
        style={{ background: gradients.meshGradient }}
      />
      
      {/* Dynamic overlay for dark mode */}
      <div 
        className="absolute inset-0 hidden dark:block"
        style={{ background: gradients.darkOverlay }}
      />
      
      {/* Animated bubble pattern */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Large floating bubbles */}
        <div 
          className="absolute top-[10%] left-[5%] w-40 h-40 rounded-full animate-float blur-xl"
          style={{ background: gradients.blueBubble }}
        />
        <div 
          className="absolute top-[60%] right-[10%] w-60 h-60 rounded-full animate-float blur-xl"
          style={{ 
            background: gradients.yellowBubble,
            animationDelay: animations.delays.medium
          }}
        />
        <div 
          className="absolute bottom-[20%] left-[15%] w-48 h-48 rounded-full animate-float blur-xl"
          style={{ 
            background: gradients.purpleBubble,
            animationDelay: animations.delays.veryLong
          }}
        />
        
        {/* Medium floating bubbles */}
        <div 
          className="absolute top-[40%] left-[60%] w-32 h-32 bg-gradient-to-br from-green-200/30 to-emerald-300/25 dark:from-emerald-600/15 dark:to-emerald-800/15 rounded-full animate-float"
          style={{ animationDelay: animations.delays.short }}
        />
        <div 
          className="absolute top-[70%] left-[40%] w-36 h-36 bg-gradient-to-br from-orange-200/30 to-orange-300/25 dark:from-orange-600/15 dark:to-orange-800/15 rounded-full animate-float"
          style={{ animationDelay: animations.delays.long }}
        />
        
        {/* Small decorative stars */}
        <div className="absolute top-[15%] right-[25%] text-4xl text-yellow-300/40 dark:text-yellow-400/20 animate-wiggle decorative-stars">
          ⭐
        </div>
        <div 
          className="absolute bottom-[35%] right-[8%] text-3xl text-yellow-300/40 dark:text-yellow-400/20 animate-wiggle decorative-stars"
          style={{ animationDelay: '1.5s' }}
        >
          ✨
        </div>
        <div 
          className="absolute top-[55%] left-[8%] text-2xl text-yellow-300/40 dark:text-yellow-400/20 animate-wiggle decorative-stars"
          style={{ animationDelay: '2.5s' }}
        >
          🌟
        </div>
      </div>
      
      {/* Subtle cloud shapes */}
      <svg className="absolute top-[5%] right-[20%] w-64 h-32 opacity-10 dark:opacity-5" viewBox="0 0 100 50">
        <path 
          d="M20,35 Q20,25 30,25 Q35,15 45,15 Q55,10 65,15 Q75,15 80,25 Q90,25 90,35 Q90,45 80,45 L20,45 Q10,45 10,35 Q10,25 20,25" 
          fill="currentColor" 
          className="text-white dark:text-gray-200" 
        />
      </svg>
      <svg 
        className="absolute bottom-[15%] left-[10%] w-80 h-40 opacity-10 dark:opacity-5 animate-float"
        style={{ animationDelay: '5s' }}
        viewBox="0 0 100 50"
      >
        <path 
          d="M20,35 Q20,25 30,25 Q35,15 45,15 Q55,10 65,15 Q75,15 80,25 Q90,25 90,35 Q90,45 80,45 L20,45 Q10,45 10,35 Q10,25 20,25" 
          fill="currentColor" 
          className="text-white dark:text-gray-200" 
        />
      </svg>
      <svg className="absolute top-[45%] left-[50%] w-48 h-24 opacity-10 dark:opacity-5" viewBox="0 0 100 50">
        <path 
          d="M20,35 Q20,25 30,25 Q35,15 45,15 Q55,10 65,15 Q75,15 80,25 Q90,25 90,35 Q90,45 80,45 L20,45 Q10,45 10,35 Q10,25 20,25" 
          fill="currentColor" 
          className="text-white dark:text-gray-200" 
        />
      </svg>
    </div>
  );
});

AnimatedBackground.displayName = 'AnimatedBackground';

export default AnimatedBackground;