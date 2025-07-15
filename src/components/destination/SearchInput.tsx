import React from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  isLoading: boolean;
  isOpen: boolean;
  isSearching?: boolean;
}

export const SearchInput = React.forwardRef<HTMLDivElement, SearchInputProps>(
  (
    { value, onChange, onClear, isLoading, isOpen, isSearching = false },
    ref
  ) => {
    return (
      <div className="w-full relative" ref={ref}>
        <Input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (e.target.value === '') {
              onClear();
            }
          }}
          placeholder="Start typing a place..."
          className="w-full p-4 sm:p-5 text-base sm:text-xl text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-xl border-2 border-gray-300 dark:border-gray-600 focus:border-yellow-400 dark:focus:border-yellow-500 pr-12 bg-white/50 dark:bg-gray-800/50 touch-manipulation"
          disabled={isLoading}
          aria-label="Destination search"
          aria-describedby="search-instructions"
          aria-autocomplete="list"
          aria-controls="search-suggestions"
          aria-expanded={isOpen}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          style={{
            fontSize: '16px', // Prevents zoom on iOS
            touchAction: 'manipulation',
          }}
        />
        {isSearching ? (
          <Loader2 className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 sm:h-6 sm:w-6 text-yellow-500 animate-spin" />
        ) : (
          <Search className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 sm:h-6 sm:w-6 text-gray-500 dark:text-gray-400" />
        )}
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';
