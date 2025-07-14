
import { useState } from "react";
import { LocationProvider } from "@/contexts/LocationContext";
import LocationSection from "@/components/LocationSection";
import DestinationSection from "@/components/DestinationSection";
import ThemeToggle from "@/components/ThemeToggle";

const Index = () => {
  const [activeTab, setActiveTab] = useState<"current" | "destination">("current");

  return (
    <LocationProvider>
      <div className="custom-background min-h-screen relative overflow-x-hidden w-full">
        {/* Multi-layer animated background */}
        <div className="absolute inset-0">
          {/* Animated mesh gradient overlay */}
          <div className="absolute inset-0 opacity-30 dark:opacity-20" style={{
            background: `
              radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.3) 0%, transparent 50%),
              radial-gradient(circle at 80% 70%, rgba(251, 191, 36, 0.3) 0%, transparent 50%),
              radial-gradient(circle at 40% 80%, rgba(167, 139, 250, 0.3) 0%, transparent 50%),
              radial-gradient(circle at 90% 20%, rgba(34, 197, 94, 0.2) 0%, transparent 50%)
            `
          }}></div>
          
          {/* Dynamic overlay for dark mode */}
          <div className="absolute inset-0 hidden dark:block" style={{
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(88, 28, 135, 0.9) 35%, rgba(30, 58, 138, 0.9) 70%, rgba(15, 23, 42, 0.95) 100%)'
          }}></div>
          {/* Animated bubble pattern */}
          <div className="absolute inset-0 overflow-hidden">
            {/* Large floating bubbles */}
            <div className="absolute top-[10%] left-[5%] w-40 h-40 rounded-full animate-float blur-xl" style={{
              background: 'radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.1) 70%, transparent 100%)'
            }}></div>
            <div className="absolute top-[60%] right-[10%] w-60 h-60 rounded-full animate-float blur-xl" style={{
              background: 'radial-gradient(circle, rgba(251, 191, 36, 0.4) 0%, rgba(251, 191, 36, 0.1) 70%, transparent 100%)',
              animationDelay: '2s'
            }}></div>
            <div className="absolute bottom-[20%] left-[15%] w-48 h-48 rounded-full animate-float blur-xl" style={{
              background: 'radial-gradient(circle, rgba(167, 139, 250, 0.4) 0%, rgba(167, 139, 250, 0.1) 70%, transparent 100%)',
              animationDelay: '4s'
            }}></div>
            
            {/* Medium floating bubbles */}
            <div className="absolute top-[40%] left-[60%] w-32 h-32 bg-gradient-to-br from-green-200/30 to-emerald-300/25 dark:from-emerald-600/15 dark:to-emerald-800/15 rounded-full animate-float" style={{animationDelay: '1s'}}></div>
            <div className="absolute top-[70%] left-[40%] w-36 h-36 bg-gradient-to-br from-orange-200/30 to-orange-300/25 dark:from-orange-600/15 dark:to-orange-800/15 rounded-full animate-float" style={{animationDelay: '3s'}}></div>
            
            {/* Small decorative stars */}
            <div className="absolute top-[15%] right-[25%] text-4xl text-yellow-300/40 dark:text-yellow-400/20 animate-wiggle">⭐</div>
            <div className="absolute bottom-[35%] right-[8%] text-3xl text-yellow-300/40 dark:text-yellow-400/20 animate-wiggle" style={{animationDelay: '1.5s'}}>✨</div>
            <div className="absolute top-[55%] left-[8%] text-2xl text-yellow-300/40 dark:text-yellow-400/20 animate-wiggle" style={{animationDelay: '2.5s'}}>🌟</div>
          </div>
          
          {/* Subtle cloud shapes */}
          <svg className="absolute top-[5%] right-[20%] w-64 h-32 opacity-10 dark:opacity-5" viewBox="0 0 100 50">
            <path d="M20,35 Q20,25 30,25 Q35,15 45,15 Q55,10 65,15 Q75,15 80,25 Q90,25 90,35 Q90,45 80,45 L20,45 Q10,45 10,35 Q10,25 20,25" fill="currentColor" className="text-white dark:text-gray-200" />
          </svg>
          <svg className="absolute bottom-[15%] left-[10%] w-80 h-40 opacity-10 dark:opacity-5 animate-float" style={{animationDelay: '5s'}} viewBox="0 0 100 50">
            <path d="M20,35 Q20,25 30,25 Q35,15 45,15 Q55,10 65,15 Q75,15 80,25 Q90,25 90,35 Q90,45 80,45 L20,45 Q10,45 10,35 Q10,25 20,25" fill="currentColor" className="text-white dark:text-gray-200" />
          </svg>
          <svg className="absolute top-[45%] left-[50%] w-48 h-24 opacity-10 dark:opacity-5" viewBox="0 0 100 50">
            <path d="M20,35 Q20,25 30,25 Q35,15 45,15 Q55,10 65,15 Q75,15 80,25 Q90,25 90,35 Q90,45 80,45 L20,45 Q10,45 10,35 Q10,25 20,25" fill="currentColor" className="text-white dark:text-gray-200" />
          </svg>
        </div>
        
        {/* Responsive decorative elements for larger screens */}
        <div className="hidden lg:block absolute inset-0 z-0">
          {/* Left side decorations */}
          <div className="absolute left-8 top-1/2 -translate-y-1/2">
            <div className="text-8xl opacity-20 dark:opacity-10 animate-float">🚗</div>
            <div className="text-6xl opacity-20 dark:opacity-10 mt-8 animate-float" style={{animationDelay: '2s'}}>🛣️</div>
            <div className="text-5xl opacity-20 dark:opacity-10 mt-6 animate-float" style={{animationDelay: '4s'}}>🗺️</div>
          </div>
          
          {/* Right side decorations */}
          <div className="absolute right-8 top-1/2 -translate-y-1/2">
            <div className="text-7xl opacity-20 dark:opacity-10 animate-float" style={{animationDelay: '1s'}}>🏆</div>
            <div className="text-6xl opacity-20 dark:opacity-10 mt-8 animate-float" style={{animationDelay: '3s'}}>🎯</div>
            <div className="text-5xl opacity-20 dark:opacity-10 mt-6 animate-float" style={{animationDelay: '5s'}}>🚩</div>
          </div>
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
              <h1 className="text-5xl md:text-7xl font-black text-gray-800 dark:text-white mb-4 transform -rotate-2 hover:rotate-0 transition-transform duration-300"
                style={{
                  textShadow: '3px 3px 0 #FFD166, 6px 6px 0 #9b87f5, 9px 9px 20px rgba(0,0,0,0.3)'
                }}>
                Are We There Yet?
              </h1>
              <p className="text-xl md:text-2xl text-gray-700 dark:text-white font-bold drop-shadow-lg">
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
            <div className="relative backdrop-blur-2xl rounded-3xl p-8 transform hover:scale-[1.01] transition-all duration-700 animate-slide-up" style={{
              background: 'rgba(255, 255, 255, 0.85)',
              boxShadow: `
                0 8px 32px rgba(0, 0, 0, 0.12),
                0 2px 16px rgba(0, 0, 0, 0.08),
                inset 0 1px 0 rgba(255, 255, 255, 0.8)
              `,
              border: '1px solid rgba(255, 255, 255, 0.3)'
            }}>
              {/* Glass morphism effect overlay */}
              <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.1) 50%, rgba(255, 255, 255, 0.05) 100%)'
              }}></div>
              
              {/* Dark mode overlay */}
              <div className="absolute inset-0 rounded-3xl hidden dark:block pointer-events-none" style={{
                background: 'rgba(30, 41, 59, 0.9)',
                boxShadow: `
                  0 8px 32px rgba(0, 0, 0, 0.4),
                  inset 0 1px 0 rgba(255, 255, 255, 0.1)
                `
              }}></div>
              <div className="relative z-10">
                {activeTab === "current" ? (
                  <LocationSection />
                ) : (
                  <DestinationSection />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </LocationProvider>
  );
};

export default Index;
