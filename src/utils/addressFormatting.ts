import {
  GeocodeResult,
  ReverseGeocodeResult,
} from '@/services/geocoding.service';

export interface AddressComponents {
  houseNumber?: string;
  road?: string;
  attraction?: string;
  amenity?: string;
  tourism?: string;
  building?: string;
  leisure?: string;
  shop?: string;
  suburb?: string;
  city?: string;
  county?: string;
  state?: string;
  country?: string;
  postcode?: string;
}

/**
 * Extract address components from a geocode result
 */
export const extractAddressComponents = (
  result: GeocodeResult
): AddressComponents => {
  const address = result.address || {};

  return {
    houseNumber: address.house_number,
    road: address.road,
    attraction: address.attraction,
    amenity: address.amenity,
    tourism: address.tourism,
    building: address.building,
    leisure: address.leisure,
    shop: address.shop,
    suburb: address.suburb || address.neighbourhood,
    city: address.city || address.town || address.village,
    county: address.county,
    state: address.state,
    country: address.country,
    postcode: address.postcode,
  };
};

/**
 * Parse address components from reverse geocode result
 */
export const parseAddressComponents = (
  result: ReverseGeocodeResult
): AddressComponents => {
  const address = result.address || {};

  return {
    houseNumber: address.house_number,
    road: address.road,
    suburb: address.suburb || address.neighbourhood,
    city: address.city || address.town || address.village,
    county: address.county,
    state: address.state,
    country: address.country,
    postcode: address.postcode,
  };
};

/**
 * Get primary name for a location (attraction, amenity, etc.)
 */
export const getPrimaryLocationName = (
  components: AddressComponents
): string | undefined => {
  return (
    components.attraction ||
    components.amenity ||
    components.tourism ||
    components.building ||
    components.leisure ||
    components.shop
  );
};

/**
 * Format address components into a readable string
 */
export const formatAddress = (components: AddressComponents): string => {
  const parts: string[] = [];

  // Add house number and road
  if (components.houseNumber && components.road) {
    parts.push(`${components.houseNumber} ${components.road}`);
  } else if (components.road) {
    parts.push(components.road);
  }

  // Add suburb/neighbourhood
  if (components.suburb) {
    parts.push(components.suburb);
  }

  // Add city
  if (components.city) {
    parts.push(components.city);
  }

  // Add state and postcode
  if (components.state) {
    if (components.postcode) {
      parts.push(`${components.state} ${components.postcode}`);
    } else {
      parts.push(components.state);
    }
  } else if (components.postcode) {
    parts.push(components.postcode);
  }

  // Add country
  if (components.country) {
    parts.push(components.country);
  }

  return parts.join(', ');
};

/**
 * Format a geocode result for display in suggestions
 */
export const formatGeocodeResult = (
  result: GeocodeResult
): {
  primaryName: string;
  fullAddress: string;
} => {
  const components = extractAddressComponents(result);

  // Get primary name (attraction, amenity, etc.) or build from address
  let primaryName = getPrimaryLocationName(components);

  if (!primaryName) {
    const addressParts: string[] = [];

    if (components.houseNumber) {
      addressParts.push(components.houseNumber);
    }

    if (components.road) {
      addressParts.push(components.road);
    }

    primaryName =
      addressParts.length > 0
        ? addressParts.join(' ')
        : result.display_name.split(',')[0];
  }

  return {
    primaryName,
    fullAddress: result.display_name,
  };
};

/**
 * Check if a geocode result has detailed address information
 */
export const hasDetailedAddress = (result: GeocodeResult): boolean => {
  return !!(
    result.address &&
    (result.address.road ||
      result.address.house_number ||
      result.address.attraction ||
      result.address.amenity)
  );
};

/**
 * Create a suggestion item from a geocode result
 */
export interface SuggestionItem {
  id: string;
  name: string;
  displayName: string;
}

export const createSuggestionItem = (result: GeocodeResult): SuggestionItem => {
  const { primaryName, fullAddress } = formatGeocodeResult(result);

  return {
    id: result.place_id,
    name: primaryName,
    displayName: fullAddress,
  };
};
