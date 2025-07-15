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
        className="max-h-96 overflow-auto"
        id="search-suggestions"
        role="listbox"
      >
        {isSearching ? (
          <CommandEmpty className="py-6 text-center text-gray-600 dark:text-gray-400">
            Searching...
          </CommandEmpty>
        ) : suggestions.length === 0 ? (
          <CommandEmpty className="py-6 text-center text-gray-600 dark:text-gray-400">
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
                className="cursor-pointer px-4 py-4 hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                role="option"
                aria-selected={false}
              >
                <div>
                  <p className="font-bold text-base text-gray-800 dark:text-white">
                    {suggestion.name}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
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
