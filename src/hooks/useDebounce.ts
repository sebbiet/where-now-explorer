import { useState, useEffect } from 'react';

/**
 * Custom React hook that debounces a value for a specified delay period
 *
 * Useful for optimizing performance by delaying expensive operations like API calls
 * until the user has stopped typing or making changes for the specified delay.
 *
 * @template T - The type of value being debounced
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds before updating the debounced value
 * @returns The debounced value that updates after the delay period
 *
 * @example
 * ```typescript
 * function SearchComponent() {
 *   const [searchTerm, setSearchTerm] = useState('');
 *   const debouncedSearchTerm = useDebounce(searchTerm, 500);
 *
 *   useEffect(() => {
 *     if (debouncedSearchTerm) {
 *       // This API call will only happen 500ms after user stops typing
 *       searchAPI(debouncedSearchTerm);
 *     }
 *   }, [debouncedSearchTerm]);
 *
 *   return (
 *     <input
 *       value={searchTerm}
 *       onChange={(e) => setSearchTerm(e.target.value)}
 *       placeholder="Search..."
 *     />
 *   );
 * }
 * ```
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
