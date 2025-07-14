
import { useState } from "react";
import { LocationProvider } from "@/contexts/LocationContext";
import LocationSection from "@/components/LocationSection";
import DestinationSection from "@/components/DestinationSection";
import ThemeToggle from "@/components/ThemeToggle";

const Index = () => {
  const [activeTab, setActiveTab] = useState<"current" | "destination">("current");

  return (
    <LocationProvider>
      <div className="min-h-screen relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-br from-sky via-sunshine to-grape dark:from-purple-900 dark:via-blue-900 dark:to-indigo-900">
          {/* Floating shapes */}
          <div className="absolute top-10 left-10 w-20 h-20 bg-soft-yellow rounded-full opacity-30 animate-pulse"></div>
          <div className="absolute top-1/4 right-20 w-32 h-32 bg-soft-orange rounded-full opacity-20 animate-bounce" style={{animationDelay: '0.5s'}}></div>
          <div className="absolute bottom-20 left-1/3 w-24 h-24 bg-soft-purple rounded-full opacity-25 animate-pulse" style={{animationDelay: '1s'}}></div>
          <div className="absolute top-1/2 right-1/4 w-16 h-16 bg-soft-green rounded-full opacity-30 animate-bounce" style={{animationDelay: '1.5s'}}></div>
          
          {/* Cloud shapes */}
          <svg className="absolute top-20 right-10 w-40 h-20 opacity-20" viewBox="0 0 100 50">
            <path d="M20,35 Q20,25 30,25 Q35,15 45,15 Q55,10 65,15 Q75,15 80,25 Q90,25 90,35 Q90,45 80,45 L20,45 Q10,45 10,35 Q10,25 20,25" fill="white" />
          </svg>
          <svg className="absolute bottom-40 left-20 w-60 h-30 opacity-15" viewBox="0 0 100 50">
            <path d="M20,35 Q20,25 30,25 Q35,15 45,15 Q55,10 65,15 Q75,15 80,25 Q90,25 90,35 Q90,45 80,45 L20,45 Q10,45 10,35 Q10,25 20,25" fill="white" />
          </svg>
        </div>
        
        <div className="container mx-auto px-4 py-8 relative z-10">
          {/* Header with theme toggle */}
          <div className="flex justify-end gap-2 mb-8">
            <ThemeToggle />
          </div>
          
          {/* Main Content */}
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Title */}
            <div className="text-center animate-fade-in">
              <h1 className="text-5xl md:text-7xl font-black text-white mb-4 transform -rotate-2 hover:rotate-0 transition-transform duration-300"
                style={{
                  textShadow: '3px 3px 0 #FFD166, 6px 6px 0 #9b87f5, 9px 9px 20px rgba(0,0,0,0.3)'
                }}>
                Are We There Yet?
              </h1>
              <p className="text-xl md:text-2xl text-white font-bold drop-shadow-lg">
                🗺️ Discover where you are and where you're going! 🚗
              </p>
            </div>

            {/* Tab Navigation - Fun Toggle Switch */}
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
                  <div className="absolute inset-0 rounded-full animate-pulse opacity-50 blur-md bg-white"></div>
                </div>
                
                {/* Buttons */}
                <div className="relative flex">
                  <button
                    onClick={() => setActiveTab("current")}
                    className={`relative z-10 px-8 py-5 rounded-full transition-all duration-300 flex items-center gap-3 font-black ${
                      activeTab === "current"
                        ? "text-white scale-105"
                        : "text-gray-700 dark:text-gray-300 hover:scale-105"
                    }`}
                  >
                    <span className="text-3xl drop-shadow-md">📍</span>
                    <div>
                      <div className="text-lg leading-tight">Where</div>
                      <div className="text-sm opacity-90">Am I?</div>
                    </div>
                    {activeTab === "current" && (
                      <div className="absolute -top-3 -right-2">
                        <span className="text-xl animate-bounce">✨</span>
                      </div>
                    )}
                  </button>
                  
                  <button
                    onClick={() => setActiveTab("destination")}
                    className={`relative z-10 px-8 py-5 rounded-full transition-all duration-300 flex items-center gap-3 font-black ${
                      activeTab === "destination"
                        ? "text-white scale-105"
                        : "text-gray-700 dark:text-gray-300 hover:scale-105"
                    }`}
                  >
                    <span className="text-3xl drop-shadow-md">🏁</span>
                    <div>
                      <div className="text-lg leading-tight">Are We</div>
                      <div className="text-sm opacity-90">There Yet?</div>
                    </div>
                    {activeTab === "destination" && (
                      <div className="absolute -top-3 -right-2">
                        <span className="text-xl animate-bounce">🌟</span>
                      </div>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Tab Content */}
            <div className="bg-gradient-to-br from-white/95 to-soft-purple/30 dark:from-gray-800/95 dark:to-purple-900/30 backdrop-blur-md rounded-3xl shadow-2xl p-8 border-4 border-white/50 dark:border-purple-400/30 transform hover:scale-[1.02] transition-transform duration-300">
              {activeTab === "current" ? (
                <LocationSection />
              ) : (
                <DestinationSection />
              )}
            </div>
          </div>
        </div>
      </div>
    </LocationProvider>
  );
};

export default Index;
