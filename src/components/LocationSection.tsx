
import React, { memo } from 'react';
import { Timer } from 'lucide-react';
import { Button } from "@/components/ui/button";
import LoadingSpinner from '@/components/LoadingSpinner';
import LocationDisplay from '@/components/LocationDisplay';
import LocationPin from '@/components/LocationPin';
import { useLocation } from '@/contexts/LocationContext';

const LocationSection = () => {
  const { 
    locationData, 
    isLoadingLocation, 
    isRefreshingLocation, 
    countdown, 
    handleRefresh
  } = useLocation();

  if (isLoadingLocation) {
    return (
      <div className="w-full">
        <LocationPin />
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="w-full">
      <LocationPin />
      
      <div className={isRefreshingLocation ? "animate-pulse" : ""}>
        <LocationDisplay locationData={locationData} />
      </div>
      
      <div className="flex justify-center mt-6">
        <Button 
          onClick={handleRefresh}
          className="kid-button bg-sky text-white hover:bg-sky/80 flex items-center"
          disabled={isLoadingLocation || isRefreshingLocation}
        >
          <Timer className="w-5 h-5 mr-2" />
          Refresh in {countdown}s
        </Button>
      </div>
    </div>
  );
};

export default memo(LocationSection);
