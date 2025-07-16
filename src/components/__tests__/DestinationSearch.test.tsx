import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DestinationSearch } from '../destination/DestinationSearch';
import { GeocodingService } from '@/services/geocoding.service';
import { createSuggestionItem } from '@/utils/addressFormatting';

// Mock services and hooks
vi.mock('@/services/geocoding.service', () => ({
  GeocodingService: {
    geocode: vi.fn(),
    extractPlaceName: (place) => place.display_name.split(',')[0],
  },
}));

vi.mock('@/hooks/useMediaQuery', () => ({
  useMediaQuery: () => false, // Default to desktop for tests
}));

vi.mock('@/utils/addressFormatting', () => ({
  createSuggestionItem: (place) => ({
    displayName: place.display_name,
    name: place.display_name.split(',')[0],
    address: place.display_name,
    original: place,
  }),
}));

const mockOnDestinationSelect = vi.fn();

describe('DestinationSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the search input and button', () => {
    render(
      <DestinationSearch
        onDestinationSelect={mockOnDestinationSelect}
        isLoading={false}
      />
    );
    expect(
      screen.getByRole('textbox', { name: /Destination search/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /calculate distance/i })
    ).toBeInTheDocument();
  });

  it('shows suggestions when typing', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const mockSuggestions = [
      {
        display_name: 'New York, NY, USA',
        lat: '40.7128',
        lon: '-74.0060',
        place_id: '1',
      },
      {
        display_name: 'Newark, NJ, USA',
        lat: '40.7357',
        lon: '-74.1724',
        place_id: '2',
      },
    ];
    (GeocodingService.geocode as vi.Mock).mockResolvedValue(mockSuggestions);

    render(
      <DestinationSearch
        onDestinationSelect={mockOnDestinationSelect}
        isLoading={false}
      />
    );

    const searchInput = screen.getByRole('textbox', {
      name: /Destination search/i,
    });
    await user.type(searchInput, 'New');

    // Debounce should not have triggered yet
    expect(GeocodingService.geocode).not.toHaveBeenCalled();

    // Advance timers past the debounce period
    vi.advanceTimersByTime(300);

    await waitFor(() => {
      expect(GeocodingService.geocode).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText('New York, NY, USA')).toBeInTheDocument();
    expect(await screen.findByText('Newark, NJ, USA')).toBeInTheDocument();
  });

  it('selects a suggestion and calls onDestinationSelect on submit', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const mockSuggestions = [
      {
        display_name: 'New York, NY, USA',
        lat: '40.7128',
        lon: '-74.0060',
        place_id: '1',
      },
    ];
    (GeocodingService.geocode as vi.Mock).mockResolvedValue(mockSuggestions);

    render(
      <DestinationSearch
        onDestinationSelect={mockOnDestinationSelect}
        isLoading={false}
      />
    );

    const searchInput = screen.getByRole('textbox', {
      name: /Destination search/i,
    });
    await user.type(searchInput, 'New York');

    vi.advanceTimersByTime(300);

    const suggestion = await screen.findByText('New York, NY, USA');
    await user.click(suggestion);

    const submitButton = screen.getByRole('button', {
      name: /calculate distance/i,
    });
    await user.click(submitButton);

    expect(mockOnDestinationSelect).toHaveBeenCalledWith(mockSuggestions[0]);
  });
});
