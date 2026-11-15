import { memo, useState } from 'react';
import { Settings } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  usePreferences,
  REFRESH_INTERVAL_OPTIONS,
  MAXIMUM_AGE_OPTIONS,
} from '@/contexts/PreferencesContext';

const maximumAgeLabel: Record<number, string> = {
  0: 'Always ask for a fresh reading',
  15000: 'Reuse a reading up to 15 seconds old',
  30000: 'Reuse a reading up to 30 seconds old',
  60000: 'Reuse a reading up to 1 minute old',
};

const SettingsPanel = memo(() => {
  const { preferences, updatePreference, setHideStreetAddress } =
    usePreferences();
  const [open, setOpen] = useState(false);
  const hideStreet =
    preferences.privacyMode || preferences.hideExactCoordinates;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="relative w-20 h-20 rounded-full bg-white dark:bg-gray-800 shadow-xl border-4 border-white dark:border-gray-700 transform transition-all hover:scale-110 active:scale-95 focus:outline-none focus:ring-4 focus:ring-sky-400 focus:ring-offset-2"
          aria-label="Open settings"
        >
          <Settings className="w-9 h-9 mx-auto text-gray-700 dark:text-gray-200" />
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="overflow-y-auto w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="text-2xl font-black">Settings</SheetTitle>
          <SheetDescription>
            Privacy and battery options for family trips. Changes stay on this
            device.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-8 space-y-8">
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label
                  htmlFor="hide-street"
                  className="text-base font-bold text-gray-800 dark:text-gray-100"
                >
                  Hide street address
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Hide the street name on screen and send only a rounded
                  location (about 100 metres) to map services.
                </p>
              </div>
              <Switch
                id="hide-street"
                checked={hideStreet}
                onCheckedChange={setHideStreetAddress}
                aria-label="Hide street address"
              />
            </div>
          </section>

          <section className="space-y-3">
            <p className="text-base font-bold text-gray-800 dark:text-gray-100">
              Refresh location every
            </p>
            <div className="grid grid-cols-3 gap-2">
              {REFRESH_INTERVAL_OPTIONS.map((seconds) => {
                const selected = preferences.autoRefreshInterval === seconds;
                return (
                  <button
                    key={seconds}
                    type="button"
                    onClick={() =>
                      updatePreference('autoRefreshInterval', seconds)
                    }
                    className={`min-h-12 rounded-xl font-bold px-3 py-3 border-2 touch-manipulation ${
                      selected
                        ? 'bg-sky-500 text-white border-sky-600'
                        : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border-gray-200 dark:border-gray-600'
                    }`}
                    aria-pressed={selected}
                  >
                    {seconds}s
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-3">
            <p className="text-base font-bold text-gray-800 dark:text-gray-100">
              Location freshness
            </p>
            <p className="text-sm text-muted-foreground">
              Reusing a recent reading uses less battery in the car.
            </p>
            <div className="space-y-2">
              {MAXIMUM_AGE_OPTIONS.map((age) => {
                const selected = preferences.maximumAge === age;
                return (
                  <button
                    key={age}
                    type="button"
                    onClick={() => updatePreference('maximumAge', age)}
                    className={`w-full min-h-12 rounded-xl font-semibold px-4 py-3 border-2 text-left touch-manipulation ${
                      selected
                        ? 'bg-sky-500 text-white border-sky-600'
                        : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border-gray-200 dark:border-gray-600'
                    }`}
                    aria-pressed={selected}
                  >
                    {maximumAgeLabel[age]}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
});

SettingsPanel.displayName = 'SettingsPanel';

export default SettingsPanel;
