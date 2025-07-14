import React, { useState, useEffect } from 'react';
import { Navigation, Search } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useDebounce } from "@/hooks/useDebounce";
import { getCountryCode, queryContainsCountry } from '@/lib/countryUtils';
import { GeocodingService } from '@/services/geocoding.service';

interface DestinationInputProps {
  onDestinationSubmit: (destination: string) => void;
  isLoading: boolean;
  userCountry?: string;
}

interface SuggestionItem {
  id: string;
  name: string;
  displayName: string;
}

const DestinationInput: React.FC<DestinationInputProps> = ({ 
  onDestinationSubmit,
  isLoading,
  userCountry 
}) => {
  const [destination, setDestination] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [open, setOpen] = useState(false);
  
  const debouncedSearch = useDebounce(inputValue, 500);
  
  useEffect(() => {
    if (debouncedSearch.length > 2) {
      searchPlaces(debouncedSearch);
    } else {
      setSuggestions([]);
    }
  }, [debouncedSearch]);
  
  const searchPlaces = async (query: string) => {
    if (!query || query.length < 3) return;
    
    setIsSearching(true);
    
    try {
      // Prepare geocoding options
      const geocodeOptions: Parameters<typeof GeocodingService.geocode>[1] = {
        limit: 5,
        addressdetails: true
      };
      
      // If user hasn't explicitly typed a country name and we know their country
      if (userCountry && !queryContainsCountry(query)) {
        const countryCode = getCountryCode(userCountry);
        if (countryCode) {
          geocodeOptions.countrycodes = [countryCode];
        }
      }
      
      const data = await GeocodingService.geocode(query, geocodeOptions);
      
      // Transform the response into a simpler format for suggestions
      const formattedSuggestions = data.map((item: {
        place_id: string;
        display_name: string;
        address?: {
          house_number?: string;
          road?: string;
          attraction?: string;
          amenity?: string;
          tourism?: string;
          building?: string;
          leisure?: string;
          shop?: string;
        };
      }) => {
        // Create a more user-friendly display name for the location
        let name = '';
        
        // Build a more meaningful primary display name
        if (item.address) {
          const addressParts = [];
          
          // Add house number if available
          if (item.address.house_number) {
            addressParts.push(item.address.house_number);
          }
          
          // Add street/road if available
          if (item.address.road) {
            addressParts.push(item.address.road);
          }
          
          // Add named place if available (attraction, amenity, etc.)
          if (item.address.attraction) {
            name = item.address.attraction;
          } else if (item.address.amenity) {
            name = item.address.amenity;
          } else if (item.address.tourism) {
            name = item.address.tourism;
          } else if (item.address.building) {
            name = item.address.building;
          } else if (item.address.leisure) {
            name = item.address.leisure;
          } else if (item.address.shop) {
            name = item.address.shop;
          } else if (addressParts.length > 0) {
            // If we have address parts but no specific name, use the address
            name = addressParts.join(' ');
          } else {
            // Fall back to first part of display name
            name = item.display_name.split(',')[0];
          }
        } else {
          name = item.display_name.split(',')[0];
        }
        
        return {
          id: item.place_id,
          name: name, // More meaningful name for display
          displayName: item.display_name
        };
      });
      
      setSuggestions(formattedSuggestions);
      setOpen(formattedSuggestions.length > 0);
    } catch (error) {
      console.error("Error fetching place suggestions:", error);
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSuggestionSelect = (suggestion: SuggestionItem) => {
    // Set the input value to the full display name
    setInputValue(suggestion.displayName);
    // Always use the full display name for the actual destination calculation
    setDestination(suggestion.displayName);
    setOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (destination.trim()) {
      onDestinationSubmit(destination.trim());
    }
  };

  return (
    <div className="w-full max-w-4xl mt-6 relative backdrop-blur-2xl rounded-3xl p-8" style={{
      background: 'rgba(255, 255, 255, 0.85)',
      boxShadow: `
        0 8px 32px rgba(0, 0, 0, 0.12),
        0 2px 16px rgba(0, 0, 0, 0.08),
        inset 0 1px 0 rgba(255, 255, 255, 0.8)
      `,
      border: '1px solid rgba(255, 255, 255, 0.3)'
    }}>
      {/* Dark mode overlay */}
      <div className="absolute inset-0 rounded-3xl hidden dark:block pointer-events-none" style={{
        background: 'rgba(30, 41, 59, 0.9)',
        boxShadow: `
          0 8px 32px rgba(0, 0, 0, 0.4),
          inset 0 1px 0 rgba(255, 255, 255, 0.1)
        `
      }}></div>
      
      <div className="relative z-10">
        <div className="flex items-center mb-8">
          <Navigation className="w-10 h-10 text-yellow-500 dark:text-yellow-400 mr-4" />
          <h2 className="text-3xl md:text-4xl font-black text-gray-800 dark:text-white">Where are we going?</h2>
        </div>
      
      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
        <div className="relative w-full">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <div className="w-full relative">
                <Input
                  type="text"
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    if (e.target.value === '') {
                      setDestination('');
                    }
                  }}
                  placeholder="Start typing a place name, landmark or address"
                  className="w-full p-5 text-xl text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-xl border-2 border-gray-300 dark:border-gray-600 focus:border-yellow-400 dark:focus:border-yellow-500 pr-12 bg-white/50 dark:bg-gray-800/50"
                  disabled={isLoading}
                />
                <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-500 dark:text-gray-400" />
              </div>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)] bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-xl shadow-xl" align="start" sideOffset={5}>
              <Command className="rounded-xl">
                <CommandList className="max-h-96 overflow-auto">
                  {isSearching ? (
                    <CommandEmpty className="py-6 text-center text-gray-600 dark:text-gray-400">Searching...</CommandEmpty>
                  ) : suggestions.length === 0 ? (
                    <CommandEmpty className="py-6 text-center text-gray-600 dark:text-gray-400">No results found.</CommandEmpty>
                  ) : (
                    <CommandGroup heading="Suggestions" className="p-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {suggestions.map((suggestion) => (
                        <CommandItem
                          key={suggestion.id}
                          onSelect={() => handleSuggestionSelect(suggestion)}
                          className="cursor-pointer px-4 py-4 hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                        >
                          <div>
                            <p className="font-bold text-base text-gray-800 dark:text-white">{suggestion.name}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{suggestion.displayName}</p>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        
        <p className="text-base text-gray-600 dark:text-gray-300 font-medium">
          Type at least 3 letters to see suggestions. Try popular places, landmarks, cities, or addresses.
        </p>
        
        <Button 
          type="submit"
          className="kid-button w-full bg-gradient-to-r from-yellow-400 to-orange-400 text-gray-800 hover:from-yellow-300 hover:to-orange-300 font-black text-xl py-5 shadow-lg hover:shadow-xl"
          disabled={isLoading || !destination.trim()}
        >
          Calculate Distance
        </Button>
      </form>
      </div>
    </div>
  );
};

export default DestinationInput;
