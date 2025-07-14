import { useState, useCallback, useRef, useEffect } from 'react';
import { GeocodingService, GeocodeResult } from '@/services/geocoding.service';
import { toast } from 'sonner';
import { sanitizeDestination } from '@/utils/sanitization';

interface UseLocationSearchOptions {
  debounceDelay?: number;
  minSearchLength?: number;
  onSelect?: (result: GeocodeResult) => void;
}

export const useLocationSearch = ({
  debounceDelay = 500,
  minSearchLength = 3,
  onSelect
}: UseLocationSearchOptions = {}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Search for locations
  const searchLocations = useCallback(async (searchQuery: string) => {
    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Clear suggestions if query is too short
    if (searchQuery.length < minSearchLength) {
      setSuggestions([]);
      return;
    }

    setIsSearching(true);
    abortControllerRef.current = new AbortController();

    try {
      const results = await GeocodingService.geocode(searchQuery, {
        limit: 5,
        addressdetails: true
      });
      
      setSuggestions(results);
      setSelectedIndex(-1);
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Search error:', error);
        if (error.message?.includes('Too many requests')) {
          toast.error('Search rate limit reached. Please wait a moment before searching again.');
        }
        setSuggestions([]);
      }
    } finally {
      setIsSearching(false);
    }
  }, [minSearchLength]);

  // Debounced search
  const debouncedSearch = useCallback((searchQuery: string) => {
    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      searchLocations(searchQuery);
    }, debounceDelay);
  }, [searchLocations, debounceDelay]);

  // Handle query changes
  const handleQueryChange = useCallback((newQuery: string) => {
    const sanitized = sanitizeDestination(newQuery);
    setQuery(sanitized);
    debouncedSearch(sanitized);
  }, [debouncedSearch]);

  // Handle suggestion selection
  const selectSuggestion = useCallback((result: GeocodeResult) => {
    setQuery(GeocodingService.extractPlaceName(result));
    setSuggestions([]);
    setSelectedIndex(-1);
    onSelect?.(result);
  }, [onSelect]);

  // Keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (suggestions.length === 0) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        event.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        event.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          selectSuggestion(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        event.preventDefault();
        setSuggestions([]);
        setSelectedIndex(-1);
        break;
    }
  }, [suggestions, selectedIndex, selectSuggestion]);

  // Clear search
  const clearSearch = useCallback(() => {
    setQuery('');
    setSuggestions([]);
    setSelectedIndex(-1);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    query,
    suggestions,
    isSearching,
    selectedIndex,
    handleQueryChange,
    selectSuggestion,
    handleKeyDown,
    clearSearch,
    setQuery
  };
};