
import { useState } from "react";
import { LocationProvider } from "@/contexts/LocationContext";
import LocationSection from "@/components/LocationSection";
import DestinationSection from "@/components/DestinationSection";
import ThemeToggle from "@/components/ThemeToggle";
import AuthButton from "@/components/AuthButton";

const Index = () => {
  const [activeTab, setActiveTab] = useState<"current" | "destination">("current");

  return (
    <LocationProvider>
      <div className="min-h-screen bg-gradient-to-br from-sky via-mint to-sage dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="container mx-auto px-4 py-8">
          {/* Header with theme toggle and auth button */}
          <div className="flex justify-end gap-2 mb-8">
            <AuthButton />
            <ThemeToggle />
          </div>
          
          {/* Main Content */}
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Title */}
            <div className="text-center">
              <h1 className="text-4xl md:text-6xl font-bold text-white dark:text-gray-100 mb-4 drop-shadow-lg">
                Are We There Yet?
              </h1>
              <p className="text-lg md:text-xl text-white/90 dark:text-gray-300 drop-shadow">
                Discover where you are and where you're going
              </p>
            </div>

            {/* Tab Navigation */}
            <div className="flex justify-center">
              <div className="bg-white/20 dark:bg-gray-800/50 backdrop-blur-sm rounded-full p-1">
                <button
                  onClick={() => setActiveTab("current")}
                  className={`px-6 py-3 rounded-full transition-all duration-200 ${
                    activeTab === "current"
                      ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-lg"
                      : "text-white dark:text-gray-300 hover:bg-white/10 dark:hover:bg-gray-700/50"
                  }`}
                >
                  Where Am I?
                </button>
                <button
                  onClick={() => setActiveTab("destination")}
                  className={`px-6 py-3 rounded-full transition-all duration-200 ${
                    activeTab === "destination"
                      ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-lg"
                      : "text-white dark:text-gray-300 hover:bg-white/10 dark:hover:bg-gray-700/50"
                  }`}
                >
                  Are We There Yet?
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl shadow-xl p-8">
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
