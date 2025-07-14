
import { useState, lazy, Suspense } from "react";
import { LocationProvider } from "@/contexts/LocationContext";
import { PreferencesProvider } from "@/contexts/PreferencesContext";
import LocationSection from "@/components/LocationSection";
import DebugPanel from "@/components/DebugPanel";
import OfflineNotification from "@/components/OfflineNotification";
import Footer from "@/components/Footer";
import MockLocationIndicator from "@/components/MockLocationIndicator";
import LoadingSpinner from "@/components/LoadingSpinner";
import AnimatedBackground from "@/components/AnimatedBackground";
import DecorativeElements from "@/components/DecorativeElements";
import PageHeader from "@/components/PageHeader";
import PageTitle from "@/components/PageTitle";
import TabNavigation from "@/components/TabNavigation";
import GlassmorphicCard from "@/components/GlassmorphicCard";

// Lazy load destination features for better performance
const DestinationSection = lazy(() => import("@/components/DestinationSection"));

const Index = () => {
  const [activeTab, setActiveTab] = useState<"current" | "destination">("current");

  return (
    <PreferencesProvider>
      <LocationProvider>
      <div className="custom-background min-h-screen relative overflow-x-hidden w-full">
        {/* Skip to main content link for keyboard users */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 bg-blue-600 text-white px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          Skip to main content
        </a>
        
        {/* Offline notification */}
        <OfflineNotification />
        
        {/* Mock location indicator (development only) */}
        <MockLocationIndicator />
        
        {/* Multi-layer animated background */}
        <AnimatedBackground />
        
        {/* Responsive decorative elements for larger screens */}
        <DecorativeElements />

        <div className="container mx-auto px-4 py-8 relative z-10">
          {/* Header with theme toggle */}
          <PageHeader />
          
          {/* Main Content */}
          <main id="main-content" className="max-w-4xl mx-auto space-y-8">
            {/* Title */}
            <PageTitle />

            {/* Tab Navigation - Fun Toggle Switch */}
            <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

            {/* Tab Content */}
            <GlassmorphicCard>
              <div
                id="location-panel"
                role="tabpanel"
                aria-labelledby="location-tab"
                hidden={activeTab !== "current"}
              >
                {activeTab === "current" && <LocationSection />}
              </div>
              <div
                id="destination-panel"
                role="tabpanel"
                aria-labelledby="destination-tab"
                hidden={activeTab !== "destination"}
              >
                {activeTab === "destination" && (
                  <Suspense fallback={
                    <div className="flex justify-center items-center py-8">
                      <LoadingSpinner />
                    </div>
                  }>
                    <DestinationSection />
                  </Suspense>
                )}
              </div>
            </GlassmorphicCard>

            {/* Footer */}
            <Footer />
          </main>
        </div>
        
        {/* Debug Panel for development */}
        <DebugPanel />
      </div>
    </LocationProvider>
    </PreferencesProvider>
  );
};

export default Index;
