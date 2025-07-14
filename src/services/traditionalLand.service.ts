import { firstNationsPlaces, normalizePlaceName, TraditionalLandInfo } from '@/data/firstNationsPlaces';

export class TraditionalLandService {
  /**
   * Look up traditional land information for a given location
   * Checks city first, then suburb, with normalized matching
   */
  static getTraditionalLandInfo(
    city?: string,
    suburb?: string,
    state?: string
  ): TraditionalLandInfo | null {
    if (!city && !suburb) return null;
    
    // Try exact match with city first
    if (city) {
      const cityInfo = firstNationsPlaces[city];
      if (cityInfo) return cityInfo;
      
      // Try normalized match
      const normalizedCity = normalizePlaceName(city);
      for (const [placeName, info] of Object.entries(firstNationsPlaces)) {
        if (normalizePlaceName(placeName) === normalizedCity) {
          return info;
        }
      }
    }
    
    // Try suburb if no city match
    if (suburb) {
      const suburbInfo = firstNationsPlaces[suburb];
      if (suburbInfo) return suburbInfo;
      
      // Try normalized match
      const normalizedSuburb = normalizePlaceName(suburb);
      for (const [placeName, info] of Object.entries(firstNationsPlaces)) {
        if (normalizePlaceName(placeName) === normalizedSuburb) {
          return info;
        }
      }
    }
    
    // Special handling for regions/areas
    // For example, if someone is in a suburb of Sydney, we can still acknowledge Gadigal land
    if (city && state) {
      const regionKey = `${city}_region`;
      const regionInfo = firstNationsPlaces[regionKey];
      if (regionInfo) return regionInfo;
    }
    
    return null;
  }
  
  /**
   * Check if location is in Australia
   */
  static isAustralianLocation(country?: string): boolean {
    if (!country) return false;
    const normalizedCountry = country.toLowerCase().trim();
    return normalizedCountry === 'australia' || 
           normalizedCountry === 'aus' || 
           normalizedCountry === 'au';
  }
}