import { useLocalStorage } from './useLocalStorage';

export interface DestinationHistoryItem {
  id: string;
  name: string;
  displayName: string;
  timestamp: number;
  distance?: string;
  duration?: string;
}

const MAX_HISTORY_ITEMS = 10;

export function useDestinationHistory() {
  const [history, setHistory] = useLocalStorage<DestinationHistoryItem[]>(
    'where-now-destination-history',
    []
  );

  const addToHistory = (
    item: Omit<DestinationHistoryItem, 'id' | 'timestamp'>
  ) => {
    setHistory((prev) => {
      // Check if this destination already exists
      const existingIndex = prev.findIndex(
        (h) => h.displayName === item.displayName
      );

      const newItem: DestinationHistoryItem = {
        ...item,
        id: `dest-${Date.now()}`,
        timestamp: Date.now(),
      };

      let newHistory: DestinationHistoryItem[];

      if (existingIndex !== -1) {
        // Move existing item to top with updated info
        newHistory = [
          newItem,
          ...prev.filter((_, index) => index !== existingIndex),
        ];
      } else {
        // Add new item to top
        newHistory = [newItem, ...prev];
      }

      // Keep only the most recent items
      return newHistory.slice(0, MAX_HISTORY_ITEMS);
    });
  };

  const removeFromHistory = (id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
  };

  const clearHistory = () => {
    setHistory([]);
  };

  return {
    history,
    addToHistory,
    removeFromHistory,
    clearHistory,
  };
}
