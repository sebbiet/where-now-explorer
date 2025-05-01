
import React from 'react';
import ThemeToggle from '@/components/ThemeToggle';
import LocationSection from '@/components/LocationSection';
import DestinationSection from '@/components/DestinationSection';
import { LocationProvider } from '@/contexts/LocationContext';

const Index = () => {
  return (
    <LocationProvider>
      <div className="min-h-screen w-full flex flex-col items-center py-6 px-4 bg-gradient-to-b from-soft-purple/30 to-soft-blue/20 dark:from-gray-900 dark:to-gray-800">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        
        <div className="w-full max-w-md">
          <h1 className="text-4xl font-bold text-center mb-2 text-grape">Are We There Yet?</h1>
          <p className="text-center text-lg mb-6">Let's find out exactly where we are!</p>
          
          <LocationSection />
          <DestinationSection />
        </div>
      </div>
    </LocationProvider>
  );
};

export default Index;
