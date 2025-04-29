
import React, { useState } from 'react';
import { Navigation } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface DestinationInputProps {
  onDestinationSubmit: (destination: string) => void;
  isLoading: boolean;
}

const DestinationInput: React.FC<DestinationInputProps> = ({ 
  onDestinationSubmit,
  isLoading 
}) => {
  const [destination, setDestination] = useState('');

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
        <Input
          type="text"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="Enter destination (e.g. Disney World)"
          className="w-full p-4 text-lg rounded-xl border-2 border-gray-200 dark:border-gray-600"
          disabled={isLoading}
        />
        
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
