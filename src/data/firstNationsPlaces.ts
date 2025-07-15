// First Nations traditional place names and nations
// This data represents Traditional Custodians of various Australian locations
// Sources: AIATSIS, Common Ground, Australian Museum, and various Indigenous organizations

export interface TraditionalLandInfo {
  traditionalName: string;
  nation: string;
}

export const firstNationsPlaces: Record<string, TraditionalLandInfo> = {
  // New South Wales
  Sydney: {
    traditionalName: 'Warrane',
    nation: 'Gadigal people of the Eora Nation',
  },
  Parramatta: {
    traditionalName: 'Burramatta',
    nation: 'Burramattagal people of the Darug Nation',
  },
  Newcastle: {
    traditionalName: 'Mulubinba',
    nation: 'Awabakal and Worimi peoples',
  },
  Wollongong: {
    traditionalName: 'Woolyungah',
    nation: 'Dharawal people',
  },
  Dubbo: {
    traditionalName: 'Dubbo',
    nation: 'Wiradjuri people',
  },
  'Byron Bay': {
    traditionalName: 'Cavvanbah',
    nation: 'Arakwal people of the Bundjalung Nation',
  },

  // Victoria
  Melbourne: {
    traditionalName: 'Naarm',
    nation: 'Wurundjeri people of the Kulin Nation',
  },
  Geelong: {
    traditionalName: 'Djilang',
    nation: 'Wadawurrung people',
  },
  Ballarat: {
    traditionalName: 'Ballarat',
    nation: 'Wadawurrung and Dja Dja Wurrung peoples',
  },
  Bendigo: {
    traditionalName: 'Bendigo',
    nation: 'Dja Dja Wurrung people',
  },

  // Queensland
  Brisbane: {
    traditionalName: 'Meanjin',
    nation: 'Turrbal and Yuggera peoples',
  },
  'Gold Coast': {
    traditionalName: 'Kombumerri',
    nation: 'Yugambeh people',
  },
  Cairns: {
    traditionalName: 'Gimuy',
    nation: 'Gimuy Walubara Yidinji people',
  },
  Townsville: {
    traditionalName: 'Gurambilbarra',
    nation: 'Wulgurukaba and Bindal peoples',
  },
  Toowoomba: {
    traditionalName: 'Toowoomba',
    nation: 'Jagera, Giabal and Jarowair peoples',
  },

  // Western Australia
  Perth: {
    traditionalName: 'Boorloo',
    nation: 'Whadjuk people of the Noongar Nation',
  },
  Fremantle: {
    traditionalName: 'Walyalup',
    nation: 'Whadjuk people of the Noongar Nation',
  },
  Broome: {
    traditionalName: 'Rubibi',
    nation: 'Yawuru people',
  },
  Albany: {
    traditionalName: 'Kinjarling',
    nation: 'Menang people of the Noongar Nation',
  },

  // South Australia
  Adelaide: {
    traditionalName: 'Tarntanya',
    nation: 'Kaurna people',
  },
  'Port Adelaide': {
    traditionalName: 'Yertabulti',
    nation: 'Kaurna people',
  },
  'Mount Gambier': {
    traditionalName: 'Berrin',
    nation: 'Bungandidj people',
  },

  // Tasmania
  Hobart: {
    traditionalName: 'nipaluna',
    nation: 'Muwinina people of the Palawa Nation',
  },
  Launceston: {
    traditionalName: 'kanamaluka',
    nation: 'Palawa people',
  },

  // Northern Territory
  Darwin: {
    traditionalName: 'Garramilla',
    nation: 'Larrakia people',
  },
  'Alice Springs': {
    traditionalName: 'Mparntwe',
    nation: 'Arrernte people',
  },

  // Australian Capital Territory
  Canberra: {
    traditionalName: 'Ngambri',
    nation: 'Ngunnawal and Ngambri peoples',
  },
};

// Function to normalize place names for matching
export function normalizePlaceName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ').replace(/['-]/g, '');
}
