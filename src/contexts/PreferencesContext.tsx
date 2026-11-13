import React, {
  createContext,
  useContext,
  ReactNode,
  useMemo,
  useCallback,
  useEffect,
} from 'react';
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

  // Geolocation
  maximumAge: number; // PositionOptions.maximumAge in milliseconds
}

export const REFRESH_INTERVAL_OPTIONS = [30, 60, 120] as const;
export const MAXIMUM_AGE_OPTIONS = [0, 15000, 30000, 60000] as const;

const defaultPreferences: UserPreferences = {
  autoRefreshInterval: 60,
  enableLocationTracking: true,
  showFirstNationsAcknowledgment: true,
  defaultTab: 'current',
  saveDestinationHistory: true,
  shareApproximateLocation: false,
  hideExactCoordinates: false,
  privacyMode: false,
  maximumAge: 30000,
};

function migratePreferences(stored: UserPreferences): UserPreferences {
  const next = { ...defaultPreferences, ...stored };
  // Older builds stored a 30s default and had no maximumAge setting.
  // Families could not change it, so move them to the new battery-friendly default.
  if (typeof stored.maximumAge !== 'number') {
    if (stored.autoRefreshInterval === 30) {
      next.autoRefreshInterval = 60;
    }
    next.maximumAge = defaultPreferences.maximumAge;
  }
  if (
    !(REFRESH_INTERVAL_OPTIONS as readonly number[]).includes(
      next.autoRefreshInterval
    )
  ) {
    next.autoRefreshInterval = 60;
  }
  return next;
}

interface PreferencesContextType {
  preferences: UserPreferences;
  updatePreference: <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => void;
  setHideStreetAddress: (hidden: boolean) => void;
  resetPreferences: () => void;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(
  undefined
);

export const PreferencesProvider = ({ children }: { children: ReactNode }) => {
  const [storedPreferences, setPreferences, removePreferences] =
    useLocalStorage<UserPreferences>(
      'where-now-preferences',
      defaultPreferences
    );
  const preferences = migratePreferences(storedPreferences);

  useEffect(() => {
    if (typeof storedPreferences.maximumAge !== 'number') {
      setPreferences(preferences);
    }
  }, [storedPreferences, preferences, setPreferences]);

  const updatePreference = useCallback(
    <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
      setPreferences((prev) => ({
        ...defaultPreferences,
        ...prev,
        [key]: value,
      }));
    },
    [setPreferences]
  );

  const resetPreferences = useCallback(() => {
    removePreferences();
  }, [removePreferences]);

  const setHideStreetAddress = useCallback(
    (hidden: boolean) => {
      setPreferences((prev) => ({
        ...defaultPreferences,
        ...prev,
        privacyMode: hidden,
        hideExactCoordinates: hidden,
      }));
    },
    [setPreferences]
  );

  const value = useMemo(
    () => ({
      preferences,
      updatePreference,
      setHideStreetAddress,
      resetPreferences,
    }),
    [preferences, updatePreference, setHideStreetAddress, resetPreferences]
  );

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
