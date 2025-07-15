import React, { memo } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';
import LocationDisplay from '@/components/LocationDisplay';
import LocationPin from '@/components/LocationPin';
import TraditionalLandAcknowledgment from '@/components/TraditionalLandAcknowledgment';
import { useLocation } from '@/contexts/LocationContext';
import { haptic } from '@/utils/haptic';

const LocationSection = () => {
  const {
    locationData,
    isLoadingLocation,
    isRefreshingLocation,
    countdown,
    handleRefresh,
  } = useLocation();

  const handleRefreshClick = () => {
    haptic.light();
    handleRefresh();
  };

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

      {/* Screen reader announcement for location updates */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {isRefreshingLocation && 'Refreshing your location...'}
        {!isLoadingLocation &&
          !isRefreshingLocation &&
          locationData.city &&
          `Your current location is ${locationData.street ? locationData.street + ', ' : ''}${locationData.city}, ${locationData.country}`}
      </div>

      <div className={isRefreshingLocation ? 'animate-pulse' : ''}>
        <LocationDisplay locationData={locationData} />

        {locationData.traditionalName && locationData.traditionalNation && (
          <TraditionalLandAcknowledgment
            traditionalName={locationData.traditionalName}
            traditionalNation={locationData.traditionalNation}
          />
        )}
      </div>

      <div className="flex justify-center mt-8">
        <button
          onClick={handleRefreshClick}
          className={`
            relative px-10 py-5 text-xl font-black text-white
            bg-gradient-to-r from-sky via-sunshine to-grape
            rounded-full shadow-xl transform transition-all duration-300
            hover:scale-110 hover:shadow-2xl active:scale-95
            disabled:opacity-50 disabled:cursor-not-allowed
            focus:outline-none focus:ring-4 focus:ring-yellow-400 focus:ring-offset-2
            ${isRefreshingLocation ? 'animate-pulse' : ''}
          `}
          disabled={isLoadingLocation || isRefreshingLocation}
          aria-label={`Refresh location. Next automatic refresh in ${countdown} seconds`}
          aria-live="polite"
        >
          <span className="flex items-center gap-2">
            <span
              className="text-2xl animate-spin"
              style={{ animationDuration: '3s' }}
              role="img"
              aria-label="Refresh"
            >
              🔄
            </span>
            <span>Refresh in {countdown}s</span>
            <span className="text-2xl" role="img" aria-label="Timer">
              ⏰
            </span>
          </span>

          {/* Animated background effect */}
          <div className="absolute inset-0 rounded-full bg-white opacity-0 hover:opacity-20 transition-opacity duration-300"></div>
        </button>
      </div>
    </div>
  );
};

export default memo(LocationSection);
