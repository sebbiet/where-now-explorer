import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useDebounce } from '@/hooks/useDebounce';
import { getCountryCode, queryContainsCountry } from '@/lib/countryUtils';
import { GeocodingService } from '@/services/geocoding.service';
import { SearchInput } from './SearchInput';
import { SuggestionsList } from './SuggestionsList';
import {
  createSuggestionItem,
  SuggestionItem,
} from '@/utils/addressFormatting';
import { logger } from '@/utils/logger';

interface DestinationSearchProps {
  onDestinationSubmit: (destination: string) => void;
  isLoading: boolean;
  userCountry?: string;
}

export const DestinationSearch: React.FC<DestinationSearchProps> = ({
  onDestinationSubmit,
  isLoading,
  userCountry,
}) => {
  const [destination, setDestination] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [open, setOpen] = useState(false);

  const debouncedSearch = useDebounce(inputValue, 500);

  // Memoize geocoding options based on user country
  const baseGeocodeOptions = useMemo(() => {
    const options: Parameters<typeof GeocodingService.geocode>[1] = {
      limit: 5,
      addressdetails: true,
    };

    if (userCountry && !queryContainsCountry(debouncedSearch)) {
      const countryCode = getCountryCode(userCountry);
      if (countryCode) {
        options.countrycodes = [countryCode];
      }
    }

    return options;
  }, [userCountry, debouncedSearch]);

  const searchPlaces = useCallback(
    async (query: string) => {
      if (!query || query.length < 3) return;

      setIsSearching(true);

      try {
        logger.info('Searching for places', {
          query,
          baseGeocodeOptions,
        });

        const data = await GeocodingService.geocode(query, baseGeocodeOptions);

        logger.info('Geocoding results received', {
          query,
          resultCount: data.length,
          results: data,
        });

        // Transform results using the address formatting utility
        const formattedSuggestions = data.map(createSuggestionItem);

        setSuggestions(formattedSuggestions);
        setOpen(formattedSuggestions.length > 0);
      } catch (error) {
        logger.error('Error fetching place suggestions', error as Error, {
          component: 'DestinationSearch',
          operation: 'searchPlaces',
          query,
        });
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    },
    [baseGeocodeOptions]
  );

  useEffect(() => {
    if (debouncedSearch.length > 2) {
      searchPlaces(debouncedSearch);
    } else {
      setSuggestions([]);
    }
  }, [debouncedSearch, searchPlaces]);

  const handleSuggestionSelect = useCallback((suggestion: SuggestionItem) => {
    setInputValue(suggestion.displayName);
    setDestination(suggestion.displayName);
    setOpen(false);
  }, []);

  const handleInputChange = useCallback(
    (value: string) => {
      setInputValue(value);
      // Open popover when user starts typing
      if (value.length >= 3 && !open) {
        setOpen(true);
      }
    },
    [open]
  );

  const handleInputClear = useCallback(() => {
    setDestination('');
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (destination.trim()) {
        onDestinationSubmit(destination.trim());
      }
    },
    [destination, onDestinationSubmit]
  );

  const isSubmitDisabled = useMemo(
    () => isLoading || !destination.trim(),
    [isLoading, destination]
  );

  return (
    <div
      className="w-full max-w-4xl mt-6 relative backdrop-blur-2xl rounded-3xl p-4 sm:p-6 md:p-8"
      style={{
        background: 'rgba(255, 255, 255, 0.85)',
        boxShadow: `
        0 8px 32px rgba(0, 0, 0, 0.12),
        0 2px 16px rgba(0, 0, 0, 0.08),
        inset 0 1px 0 rgba(255, 255, 255, 0.8)
      `,
        border: '1px solid rgba(255, 255, 255, 0.3)',
      }}
    >
      {/* Dark mode overlay */}
      <div
        className="absolute inset-0 rounded-3xl hidden dark:block pointer-events-none"
        style={{
          background: 'rgba(30, 41, 59, 0.9)',
          boxShadow: `
          0 8px 32px rgba(0, 0, 0, 0.4),
          inset 0 1px 0 rgba(255, 255, 255, 0.1)
        `,
        }}
      />

      <div className="relative z-10">
        <div className="flex items-center mb-6 sm:mb-8">
          <Navigation className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-500 dark:text-yellow-400 mr-3 sm:mr-4 flex-shrink-0" />
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-800 dark:text-white">
            Where are we going?
          </h2>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 max-w-2xl mx-auto"
          role="search"
          aria-label="Destination search form"
        >
          <div className="relative w-full">
            <Popover open={open} onOpenChange={setOpen} modal={false}>
              <PopoverTrigger asChild>
                <SearchInput
                  value={inputValue}
                  onChange={handleInputChange}
                  onClear={handleInputClear}
                  isLoading={isLoading}
                  isOpen={open}
                  isSearching={isSearching}
                />
              </PopoverTrigger>
              <PopoverContent
                className="p-0 w-[var(--radix-popover-trigger-width)] bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-xl shadow-xl z-50"
                align="start"
                sideOffset={5}
                onOpenAutoFocus={(e) => e.preventDefault()}
                onInteractOutside={(e) => {
                  // Prevent closing when clicking on a suggestion
                  const target = e.target as HTMLElement;
                  if (target.closest('[role="option"]')) {
                    e.preventDefault();
                  }
                }}
              >
                <SuggestionsList
                  suggestions={suggestions}
                  isSearching={isSearching}
                  onSelect={handleSuggestionSelect}
                />
              </PopoverContent>
            </Popover>
          </div>

          <p
            id="search-instructions"
            className="text-sm sm:text-base text-gray-600 dark:text-gray-300 font-medium px-2 sm:px-0"
          >
            Type at least 3 letters to see suggestions. Try popular places,
            landmarks, cities, or addresses.
          </p>

          <Button
            type="submit"
            className="kid-button w-full bg-gradient-to-r from-yellow-400 to-orange-400 text-gray-800 hover:from-yellow-300 hover:to-orange-300 font-black text-lg sm:text-xl py-4 sm:py-5 shadow-lg hover:shadow-xl touch-manipulation"
            disabled={isSubmitDisabled}
          >
            Calculate Distance
          </Button>
        </form>
      </div>
    </div>
  );
};
