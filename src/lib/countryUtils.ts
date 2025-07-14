// Common country name to ISO 3166-1 alpha-2 code mappings
export const countryNameToCode: Record<string, string> = {
  // Major English-speaking countries
  'United States': 'US',
  'United States of America': 'US',
  'USA': 'US',
  'United Kingdom': 'GB',
  'UK': 'GB',
  'Great Britain': 'GB',
  'England': 'GB',
  'Scotland': 'GB',
  'Wales': 'GB',
  'Northern Ireland': 'GB',
  'Canada': 'CA',
  'Australia': 'AU',
  'New Zealand': 'NZ',
  'Ireland': 'IE',
  'South Africa': 'ZA',
  
  // European countries
  'Germany': 'DE',
  'France': 'FR',
  'Spain': 'ES',
  'Italy': 'IT',
  'Netherlands': 'NL',
  'Belgium': 'BE',
  'Switzerland': 'CH',
  'Austria': 'AT',
  'Sweden': 'SE',
  'Norway': 'NO',
  'Denmark': 'DK',
  'Finland': 'FI',
  'Poland': 'PL',
  'Portugal': 'PT',
  'Greece': 'GR',
  
  // Asian countries
  'China': 'CN',
  'Japan': 'JP',
  'India': 'IN',
  'South Korea': 'KR',
  'Singapore': 'SG',
  'Malaysia': 'MY',
  'Thailand': 'TH',
  'Indonesia': 'ID',
  'Philippines': 'PH',
  'Vietnam': 'VN',
  
  // Americas
  'Brazil': 'BR',
  'Mexico': 'MX',
  'Argentina': 'AR',
  'Chile': 'CL',
  'Colombia': 'CO',
  'Peru': 'PE',
  
  // Middle East & Africa
  'Saudi Arabia': 'SA',
  'United Arab Emirates': 'AE',
  'UAE': 'AE',
  'Israel': 'IL',
  'Egypt': 'EG',
  'Nigeria': 'NG',
  'Kenya': 'KE',
  
  // Oceania
  'Fiji': 'FJ',
  'Papua New Guinea': 'PG',
};

// Convert country name to ISO code
export function getCountryCode(countryName: string): string | null {
  if (!countryName) return null;
  
  // Check direct mapping
  const directMatch = countryNameToCode[countryName];
  if (directMatch) return directMatch;
  
  // Check case-insensitive
  const lowerCountry = countryName.toLowerCase();
  for (const [name, code] of Object.entries(countryNameToCode)) {
    if (name.toLowerCase() === lowerCountry) {
      return code;
    }
  }
  
  return null;
}

// Check if a search query contains a country name
export function queryContainsCountry(query: string): boolean {
  const lowerQuery = query.toLowerCase();
  
  // Check for country names in the query
  for (const countryName of Object.keys(countryNameToCode)) {
    if (lowerQuery.includes(countryName.toLowerCase())) {
      return true;
    }
  }
  
  // Check for common country-related terms
  const countryTerms = ['country:', 'in ', ', '];
  for (const term of countryTerms) {
    if (lowerQuery.includes(term)) {
      // More sophisticated check could be added here
      return true;
    }
  }
  
  return false;
}