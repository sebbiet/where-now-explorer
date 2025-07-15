import React from 'react';
import { DestinationSearch } from './destination/DestinationSearch';

interface DestinationInputProps {
  onDestinationSubmit: (destination: string) => void;
  isLoading: boolean;
  userCountry?: string;
}

/**
 * Legacy wrapper component for backward compatibility
 * The actual implementation is now in DestinationSearch
 */
const DestinationInput: React.FC<DestinationInputProps> = (props) => {
  return <DestinationSearch {...props} />;
};

export default DestinationInput;
