
import React from 'react';
import { Brain } from 'lucide-react';

interface FunFactProps {
  fact: string;
  isLoading: boolean;
}

const FunFactCard: React.FC<FunFactProps> = ({ fact, isLoading }) => {
  return (
    <div className="bubble bg-gradient-to-br from-white to-soft-green dark:from-gray-800 dark:to-gray-700 w-full max-w-md mt-6">
      <div className="flex items-center mb-2">
        <Brain className="w-6 h-6 text-sky mr-2" />
        <h3 className="text-xl font-bold">Fun Fact!</h3>
      </div>
      
      {isLoading ? (
        <p className="text-lg animate-pulse-gentle">Loading a fun fact about this place...</p>
      ) : (
        <p className="text-lg">{fact}</p>
      )}
    </div>
  );
};

export default FunFactCard;
