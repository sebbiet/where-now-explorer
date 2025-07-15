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
        const data = await GeocodingService.geocode(query, baseGeocodeOptions);

        // Transform results using the address formatting utility
        const formattedSuggestions = data.map(createSuggestionItem);

        setSuggestions(formattedSuggestions);
        setOpen(formattedSuggestions.length > 0);
      } catch (error) {
        console.error('Error fetching place suggestions:', error);
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

  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
  }, []);

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
      className="w-full max-w-4xl mt-6 relative backdrop-blur-2xl rounded-3xl p-8"
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
        <div className="flex items-center mb-8">
          <Navigation className="w-10 h-10 text-yellow-500 dark:text-yellow-400 mr-4" />
          <h2 className="text-3xl md:text-4xl font-black text-gray-800 dark:text-white">
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
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <SearchInput
                  value={inputValue}
                  onChange={handleInputChange}
                  onClear={handleInputClear}
                  isLoading={isLoading}
                  isOpen={open}
                />
              </PopoverTrigger>
              <PopoverContent
                className="p-0 w-[var(--radix-popover-trigger-width)] bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-xl shadow-xl"
                align="start"
                sideOffset={5}
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
            className="text-base text-gray-600 dark:text-gray-300 font-medium"
          >
            Type at least 3 letters to see suggestions. Try popular places,
            landmarks, cities, or addresses.
          </p>

          <Button
            type="submit"
            className="kid-button w-full bg-gradient-to-r from-yellow-400 to-orange-400 text-gray-800 hover:from-yellow-300 hover:to-orange-300 font-black text-xl py-5 shadow-lg hover:shadow-xl"
            disabled={isSubmitDisabled}
          >
            Calculate Distance
          </Button>
        </form>
      </div>
    </div>
  );
};
