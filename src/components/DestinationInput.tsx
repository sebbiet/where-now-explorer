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

interface DestinationInputProps {
  onDestinationSubmit: (destination: string) => void;
  isLoading: boolean;
}

interface SuggestionItem {
  id: string;
  name: string;
  displayName: string;
}

const DestinationInput: React.FC<DestinationInputProps> = ({ 
  onDestinationSubmit,
  isLoading 
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
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
        {
          headers: {
            "User-Agent": "AreWeThereYetApp/1.0",
          }
        }
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch suggestions");
      }
      
      const data = await response.json();
      
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
    <div className="bubble bg-white dark:bg-gray-800 w-full max-w-md mt-6">
      <div className="flex items-center mb-4">
        <Navigation className="w-6 h-6 text-sunshine mr-2" />
        <h2 className="text-xl font-bold">Where are we going?</h2>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
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
                  className="w-full p-4 text-lg rounded-xl border-2 border-gray-200 dark:border-gray-600 pr-10"
                  disabled={isLoading}
                />
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              </div>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-[calc(100vw-2rem)] max-w-md" align="start">
              <Command>
                <CommandList>
                  {isSearching ? (
                    <CommandEmpty>Searching...</CommandEmpty>
                  ) : suggestions.length === 0 ? (
                    <CommandEmpty>No results found.</CommandEmpty>
                  ) : (
                    <CommandGroup heading="Suggestions">
                      {suggestions.map((suggestion) => (
                        <CommandItem
                          key={suggestion.id}
                          onSelect={() => handleSuggestionSelect(suggestion)}
                          className="cursor-pointer py-3"
                        >
                          <div>
                            <p className="font-medium">{suggestion.name}</p>
                            <p className="text-xs text-gray-500 truncate">{suggestion.displayName}</p>
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
        
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Type at least 3 letters to see suggestions. Try popular places, landmarks, cities, or addresses.
        </p>
        
        <Button 
          type="submit"
          className="kid-button w-full bg-sunshine text-gray-800 hover:bg-sunshine/80"
          disabled={isLoading || !destination.trim()}
        >
          Calculate Distance
        </Button>
      </form>
    </div>
  );
};

export default DestinationInput;
