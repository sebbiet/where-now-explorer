import React from 'react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { SuggestionItem } from '@/utils/addressFormatting';

interface SuggestionsListProps {
  suggestions: SuggestionItem[];
  isSearching: boolean;
  onSelect: (suggestion: SuggestionItem) => void;
}

export const SuggestionsList: React.FC<SuggestionsListProps> = ({
  suggestions,
  isSearching,
  onSelect,
}) => {
  return (
    <Command className="rounded-xl">
      <CommandList
        className="max-h-60 sm:max-h-96 overflow-auto overscroll-contain"
        id="search-suggestions"
        role="listbox"
      >
        {isSearching ? (
          <CommandEmpty className="py-4 sm:py-6 text-center text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Searching...
          </CommandEmpty>
        ) : suggestions.length === 0 ? (
          <CommandEmpty className="py-4 sm:py-6 text-center text-sm sm:text-base text-gray-600 dark:text-gray-400">
            No results found.
          </CommandEmpty>
        ) : (
          <CommandGroup
            heading="Suggestions"
            className="p-2 text-sm font-semibold text-gray-700 dark:text-gray-300"
          >
            {suggestions.map((suggestion) => (
              <CommandItem
                key={suggestion.id}
                onSelect={() => onSelect(suggestion)}
                className="cursor-pointer px-3 sm:px-4 py-3 sm:py-4 hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600 border-b border-gray-100 dark:border-gray-700 last:border-b-0 touch-manipulation"
                role="option"
                aria-selected={false}
              >
                <div className="min-w-0">
                  <p className="font-bold text-sm sm:text-base text-gray-800 dark:text-white truncate">
                    {suggestion.name}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5 sm:mt-1 line-clamp-2">
                    {suggestion.displayName}
                  </p>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </Command>
  );
};
