import React, { createContext, useContext, ReactNode } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

interface UserPreferences {
  // Location preferences
  autoRefreshInterval: number; // in seconds
  enableLocationTracking: boolean;
  
  // UI preferences
  showFirstNationsAcknowledgment: boolean;
  defaultTab: 'current' | 'destination';
  
  // Privacy preferences
  saveDestinationHistory: boolean;
  shareApproximateLocation: boolean;
  hideExactCoordinates: boolean;
  privacyMode: boolean;
}

const defaultPreferences: UserPreferences = {
  autoRefreshInterval: 30,
  enableLocationTracking: true,
  showFirstNationsAcknowledgment: true,
  defaultTab: 'current',
  saveDestinationHistory: true,
  shareApproximateLocation: false,
  hideExactCoordinates: false,
  privacyMode: false,
};

interface PreferencesContextType {
  preferences: UserPreferences;
  updatePreference: <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => void;
  resetPreferences: () => void;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export const PreferencesProvider = ({ children }: { children: ReactNode }) => {
  const [preferences, setPreferences, removePreferences] = useLocalStorage<UserPreferences>(
    'where-now-preferences',
    defaultPreferences
  );

  const updatePreference = <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const resetPreferences = () => {
    removePreferences();
  };

  const value = {
    preferences,
    updatePreference,
    resetPreferences,
  };

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePreferences = () => {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
};