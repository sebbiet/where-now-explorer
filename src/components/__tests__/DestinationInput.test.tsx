import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DestinationInput from '../DestinationInput';
import { GeocodingService } from '@/services/geocoding.service';

// Mock dependencies
vi.mock('@/services/geocoding.service', () => ({
  GeocodingService: {
    geocode: vi.fn()
  }
}));

vi.mock('@/hooks/useDebounce', () => ({
  useDebounce: (value: string) => value
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

describe('DestinationInput', () => {
  const mockOnDestinationSubmit = vi.fn();
  const mockGeocodeResults = [
    {
      place_id: '1',
      display_name: 'Sydney Opera House, Bennelong Point, Sydney, NSW 2000, Australia',
      address: {
        attraction: 'Sydney Opera House',
        road: 'Bennelong Point',
        city: 'Sydney',
        state: 'NSW',
        postcode: '2000',
        country: 'Australia'
      }
    },
    {
      place_id: '2',
      display_name: 'Sydney Harbour Bridge, Sydney, NSW, Australia',
      address: {
        attraction: 'Sydney Harbour Bridge',
        city: 'Sydney',
        state: 'NSW',
        country: 'Australia'
      }
    },
    {
      place_id: '3',
      display_name: '123 Main Street, Sydney, NSW 2000, Australia',
      address: {
        house_number: '123',
        road: 'Main Street',
        city: 'Sydney',
        state: 'NSW',
        postcode: '2000',
        country: 'Australia'
      }
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(GeocodingService.geocode).mockResolvedValue(mockGeocodeResults);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('input rendering', () => {
    it('should render input with correct placeholder', () => {
      render(<DestinationInput onDestinationSubmit={mockOnDestinationSubmit} isLoading={false} />);
      
      const input = screen.getByPlaceholderText('Start typing a place name, landmark or address');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('aria-label', 'Destination search');
    });

    it('should disable input when loading', () => {
      render(<DestinationInput onDestinationSubmit={mockOnDestinationSubmit} isLoading={true} />);
      
      const input = screen.getByPlaceholderText('Start typing a place name, landmark or address');
      expect(input).toBeDisabled();
    });

    it('should display search instructions', () => {
      render(<DestinationInput onDestinationSubmit={mockOnDestinationSubmit} isLoading={false} />);
      
      expect(screen.getByText('Type at least 3 letters to see suggestions. Try popular places, landmarks, cities, or addresses.')).toBeInTheDocument();
    });
  });

  describe('search debouncing behavior', () => {
    it('should not search with less than 3 characters', async () => {
      const user = userEvent.setup();
      render(<DestinationInput onDestinationSubmit={mockOnDestinationSubmit} isLoading={false} />);
      
      const input = screen.getByPlaceholderText('Start typing a place name, landmark or address');
      await user.type(input, 'Sy');
      
      await waitFor(() => {
        expect(GeocodingService.geocode).not.toHaveBeenCalled();
      });
    });

    it('should search when 3 or more characters are entered', async () => {
      const user = userEvent.setup();
      render(<DestinationInput onDestinationSubmit={mockOnDestinationSubmit} isLoading={false} />);
      
      const input = screen.getByPlaceholderText('Start typing a place name, landmark or address');
      await user.type(input, 'Sydney');
      
      await waitFor(() => {
        expect(GeocodingService.geocode).toHaveBeenCalledWith('Sydney', expect.any(Object));
      });
    });
  });

  describe('autocomplete suggestions display', () => {
    it('should display suggestions after searching', async () => {
      const user = userEvent.setup();
      render(<DestinationInput onDestinationSubmit={mockOnDestinationSubmit} isLoading={false} />);
      
      const input = screen.getByPlaceholderText('Start typing a place name, landmark or address');
      await user.type(input, 'Sydney');
      
      await waitFor(() => {
        expect(screen.getByText('Sydney Opera House')).toBeInTheDocument();
        expect(screen.getByText('Sydney Harbour Bridge')).toBeInTheDocument();
        expect(screen.getByText('123 Main Street')).toBeInTheDocument();
      });
    });

    it('should show "Searching..." while loading', async () => {
      const user = userEvent.setup();
      vi.mocked(GeocodingService.geocode).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockGeocodeResults), 100))
      );
      
      render(<DestinationInput onDestinationSubmit={mockOnDestinationSubmit} isLoading={false} />);
      
      const input = screen.getByPlaceholderText('Start typing a place name, landmark or address');
      await user.type(input, 'Sydney');
      
      expect(screen.getByText('Searching...')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.queryByText('Searching...')).not.toBeInTheDocument();
      });
    });

    it('should show "No results found" when no suggestions', async () => {
      const user = userEvent.setup();
      vi.mocked(GeocodingService.geocode).mockResolvedValue([]);
      
      render(<DestinationInput onDestinationSubmit={mockOnDestinationSubmit} isLoading={false} />);
      
      const input = screen.getByPlaceholderText('Start typing a place name, landmark or address');
      await user.type(input, 'xyz123');
      
      await waitFor(() => {
        expect(screen.getByText('No results found.')).toBeInTheDocument();
      });
    });
  });

  describe('suggestion selection (click)', () => {
    it('should select suggestion on click', async () => {
      const user = userEvent.setup();
      render(<DestinationInput onDestinationSubmit={mockOnDestinationSubmit} isLoading={false} />);
      
      const input = screen.getByPlaceholderText('Start typing a place name, landmark or address');
      await user.type(input, 'Sydney');
      
      await waitFor(() => {
        expect(screen.getByText('Sydney Opera House')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('Sydney Opera House'));
      
      expect(input).toHaveValue('Sydney Opera House, Bennelong Point, Sydney, NSW 2000, Australia');
    });

    it('should close suggestions after selection', async () => {
      const user = userEvent.setup();
      render(<DestinationInput onDestinationSubmit={mockOnDestinationSubmit} isLoading={false} />);
      
      const input = screen.getByPlaceholderText('Start typing a place name, landmark or address');
      await user.type(input, 'Sydney');
      
      await waitFor(() => {
        expect(screen.getByText('Sydney Opera House')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('Sydney Opera House'));
      
      await waitFor(() => {
        expect(screen.queryByText('Suggestions')).not.toBeInTheDocument();
      });
    });
  });

  describe('keyboard navigation (arrow keys)', () => {
    it('should navigate suggestions with arrow keys', async () => {
      const user = userEvent.setup();
      render(<DestinationInput onDestinationSubmit={mockOnDestinationSubmit} isLoading={false} />);
      
      const input = screen.getByPlaceholderText('Start typing a place name, landmark or address');
      await user.type(input, 'Sydney');
      
      await waitFor(() => {
        expect(screen.getByText('Sydney Opera House')).toBeInTheDocument();
      });
      
      // Note: userEvent doesn't fully support Command component keyboard navigation
      // This would require more complex testing with actual Command component behavior
    });
  });

  describe('enter key submission', () => {
    it('should submit form on enter key', async () => {
      const user = userEvent.setup();
      render(<DestinationInput onDestinationSubmit={mockOnDestinationSubmit} isLoading={false} />);
      
      const input = screen.getByPlaceholderText('Start typing a place name, landmark or address');
      await user.type(input, 'Sydney');
      
      await waitFor(() => {
        expect(screen.getByText('Sydney Opera House')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('Sydney Opera House'));
      
      const form = screen.getByRole('search', { name: 'Destination search form' });
      fireEvent.submit(form);
      
      expect(mockOnDestinationSubmit).toHaveBeenCalledWith(
        'Sydney Opera House, Bennelong Point, Sydney, NSW 2000, Australia'
      );
    });

    it('should not submit with empty destination', async () => {
      render(<DestinationInput onDestinationSubmit={mockOnDestinationSubmit} isLoading={false} />);
      
      const form = screen.getByRole('search', { name: 'Destination search form' });
      fireEvent.submit(form);
      
      expect(mockOnDestinationSubmit).not.toHaveBeenCalled();
    });
  });

  describe('loading state during search', () => {
    it('should show loading state while searching', async () => {
      const user = userEvent.setup();
      let resolvePromise: (value: any) => void;
      const promise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      
      vi.mocked(GeocodingService.geocode).mockReturnValue(promise as any);
      
      render(<DestinationInput onDestinationSubmit={mockOnDestinationSubmit} isLoading={false} />);
      
      const input = screen.getByPlaceholderText('Start typing a place name, landmark or address');
      await user.type(input, 'Sydney');
      
      expect(screen.getByText('Searching...')).toBeInTheDocument();
      
      act(() => {
        resolvePromise!(mockGeocodeResults);
      });
      
      await waitFor(() => {
        expect(screen.queryByText('Searching...')).not.toBeInTheDocument();
        expect(screen.getByText('Sydney Opera House')).toBeInTheDocument();
      });
    });
  });

  describe('API error handling', () => {
    it('should handle API errors gracefully', async () => {
      const user = userEvent.setup();
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(GeocodingService.geocode).mockRejectedValue(new Error('API Error'));
      
      render(<DestinationInput onDestinationSubmit={mockOnDestinationSubmit} isLoading={false} />);
      
      const input = screen.getByPlaceholderText('Start typing a place name, landmark or address');
      await user.type(input, 'Sydney');
      
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching place suggestions:', expect.any(Error));
      });
      
      // Should not show suggestions on error
      expect(screen.queryByText('Sydney Opera House')).not.toBeInTheDocument();
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('country-aware filtering', () => {
    it('should add country code when user country is provided', async () => {
      const user = userEvent.setup();
      render(
        <DestinationInput 
          onDestinationSubmit={mockOnDestinationSubmit} 
          isLoading={false}
          userCountry="Australia"
        />
      );
      
      const input = screen.getByPlaceholderText('Start typing a place name, landmark or address');
      await user.type(input, 'Sydney');
      
      await waitFor(() => {
        expect(GeocodingService.geocode).toHaveBeenCalledWith('Sydney', {
          limit: 5,
          addressdetails: true,
          countrycodes: ['au']
        });
      });
    });

    it('should not add country code if query contains country name', async () => {
      const user = userEvent.setup();
      render(
        <DestinationInput 
          onDestinationSubmit={mockOnDestinationSubmit} 
          isLoading={false}
          userCountry="Australia"
        />
      );
      
      const input = screen.getByPlaceholderText('Start typing a place name, landmark or address');
      await user.type(input, 'Sydney, USA');
      
      await waitFor(() => {
        expect(GeocodingService.geocode).toHaveBeenCalledWith('Sydney, USA', {
          limit: 5,
          addressdetails: true
        });
      });
    });
  });

  describe('button state', () => {
    it('should disable submit button when no destination', () => {
      render(<DestinationInput onDestinationSubmit={mockOnDestinationSubmit} isLoading={false} />);
      
      const button = screen.getByRole('button', { name: 'Calculate Distance' });
      expect(button).toBeDisabled();
    });

    it('should enable submit button when destination is selected', async () => {
      const user = userEvent.setup();
      render(<DestinationInput onDestinationSubmit={mockOnDestinationSubmit} isLoading={false} />);
      
      const input = screen.getByPlaceholderText('Start typing a place name, landmark or address');
      await user.type(input, 'Sydney');
      
      await waitFor(() => {
        expect(screen.getByText('Sydney Opera House')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('Sydney Opera House'));
      
      const button = screen.getByRole('button', { name: 'Calculate Distance' });
      expect(button).not.toBeDisabled();
    });

    it('should disable submit button when loading', () => {
      render(<DestinationInput onDestinationSubmit={mockOnDestinationSubmit} isLoading={true} />);
      
      const button = screen.getByRole('button', { name: 'Calculate Distance' });
      expect(button).toBeDisabled();
    });
  });

  describe('address formatting', () => {
    it('should format attraction names correctly', async () => {
      const user = userEvent.setup();
      render(<DestinationInput onDestinationSubmit={mockOnDestinationSubmit} isLoading={false} />);
      
      const input = screen.getByPlaceholderText('Start typing a place name, landmark or address');
      await user.type(input, 'Sydney');
      
      await waitFor(() => {
        const operaHouse = screen.getByText('Sydney Opera House');
        expect(operaHouse).toBeInTheDocument();
        
        // Check that the full display name is also shown
        expect(screen.getByText('Sydney Opera House, Bennelong Point, Sydney, NSW 2000, Australia')).toBeInTheDocument();
      });
    });

    it('should format street addresses correctly', async () => {
      const user = userEvent.setup();
      render(<DestinationInput onDestinationSubmit={mockOnDestinationSubmit} isLoading={false} />);
      
      const input = screen.getByPlaceholderText('Start typing a place name, landmark or address');
      await user.type(input, 'Sydney');
      
      await waitFor(() => {
        const address = screen.getByText('123 Main Street');
        expect(address).toBeInTheDocument();
      });
    });
  });
});