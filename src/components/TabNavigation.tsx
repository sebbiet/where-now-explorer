import { memo } from 'react';

interface TabNavigationProps {
  activeTab: 'current' | 'destination';
  onTabChange: (tab: 'current' | 'destination') => void;
}

const TabNavigation = memo(({ activeTab, onTabChange }: TabNavigationProps) => {
  return (
    <div className="flex justify-center">
      <div className="relative bg-white dark:bg-gray-800 rounded-full p-2 shadow-2xl border-4 border-white dark:border-gray-700">
        {/* Sliding background indicator */}
        <div
          className={`absolute top-2 h-[calc(100%-16px)] w-[calc(50%-4px)] bg-gradient-to-r rounded-full transition-all duration-500 ease-in-out ${
            activeTab === "current"
              ? "left-2 from-sky to-blue-500"
              : "left-[calc(50%+4px)] from-grape to-pink-500"
          }`}
        >
          <div className="absolute inset-0 rounded-full animate-pulse opacity-50 blur-md bg-white" />
        </div>
        
        {/* Buttons */}
        <div className="relative flex" role="tablist" aria-label="Location and destination tabs">
          <button
            onClick={() => onTabChange("current")}
            className={`relative z-10 px-8 py-4 rounded-full transition-all duration-300 flex items-center justify-center gap-3 font-black focus:outline-none focus:ring-4 focus:ring-sky-400 focus:ring-offset-2 min-w-[160px] ${
              activeTab === "current"
                ? "text-white scale-105"
                : "text-gray-700 dark:text-gray-300 hover:scale-105"
            }`}
            aria-label="Show current location"
            aria-pressed={activeTab === "current"}
            role="tab"
            aria-controls="location-panel"
            id="location-tab"
          >
            <span className="text-2xl" aria-hidden="true">📍</span>
            <div className="flex flex-col items-center">
              <div className="text-base leading-tight">Where</div>
              <div className="text-xs opacity-90">Am I?</div>
            </div>
            {activeTab === "current" && (
              <div className="absolute -top-2 -right-1" aria-hidden="true">
                <span className="text-lg animate-bounce">✨</span>
              </div>
            )}
          </button>
          
          <button
            onClick={() => onTabChange("destination")}
            className={`relative z-10 px-8 py-4 rounded-full transition-all duration-300 flex items-center justify-center gap-3 font-black focus:outline-none focus:ring-4 focus:ring-purple-400 focus:ring-offset-2 min-w-[160px] ${
              activeTab === "destination"
                ? "text-white scale-105"
                : "text-gray-700 dark:text-gray-300 hover:scale-105"
            }`}
            aria-label="Show destination calculator"
            aria-pressed={activeTab === "destination"}
            role="tab"
            aria-controls="destination-panel"
            id="destination-tab"
          >
            <span className="text-2xl" aria-hidden="true">🏁</span>
            <div className="flex flex-col items-center">
              <div className="text-base leading-tight">Are We</div>
              <div className="text-xs opacity-90">There Yet?</div>
            </div>
            {activeTab === "destination" && (
              <div className="absolute -top-2 -right-1" aria-hidden="true">
                <span className="text-lg animate-bounce">🌟</span>
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
});

TabNavigation.displayName = 'TabNavigation';

export default TabNavigation;