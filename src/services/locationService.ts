import { Location } from '../types';

interface NominatimResponse {
  display_name: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    hamlet?: string;
    county?: string;
    state?: string;
    country?: string;
    water?: string;
    bay?: string;
    sound?: string;
    river?: string;
    ocean?: string;
    sea?: string;
    lake?: string;
    pond?: string;
    cove?: string;
    harbor?: string;
    marina?: string;
  };
  type?: string;
  class?: string;
}

export class LocationService {
  private static readonly NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org/reverse';

  static async getLocationDescription(location: Location): Promise<string> {
    try {
      const response = await fetch(
        `${this.NOMINATIM_BASE_URL}?format=json&lat=${location.latitude}&lon=${location.longitude}&zoom=15&addressdetails=1&extratags=1`,
        {
          headers: {
            'User-Agent': 'CarlFish/1.0'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Location service error: ${response.status}`);
      }

      const data: NominatimResponse = await response.json();
      return this.formatLocationDescription(data, location);
    } catch (error) {
      console.error('Error fetching location description:', error);
      return this.getFallbackDescription(location);
    }
  }

  private static formatLocationDescription(data: NominatimResponse, location: Location): string {
    const address = data.address;
    if (!address) {
      return this.getFallbackDescription(location);
    }

    // Check for water features first (most important for fishing)
    const waterFeatures = [
      address.water,
      address.bay,
      address.sound,
      address.river,
      address.ocean,
      address.sea,
      address.lake,
      address.pond,
      address.cove,
      address.harbor,
      address.marina
    ].filter(Boolean);

    if (waterFeatures.length > 0) {
      const waterFeature = waterFeatures[0];
      const city = address.city || address.town || address.village || address.hamlet;
      const county = address.county;
      const state = address.state;
      
      if (city && state) {
        return `${waterFeature}, near ${city}, ${state}`;
      } else if (city) {
        return `${waterFeature}, near ${city}`;
      } else if (county && state) {
        return `${waterFeature}, ${county}, ${state}`;
      }
      return waterFeature || 'Water feature';
    }

    // Check for coastal areas
    if (this.isCoastalArea(data)) {
      const city = address.city || address.town || address.village || address.hamlet;
      const state = address.state;
      const county = address.county;
      
      if (city && state) {
        return `Coastal area near ${city}, ${state}`;
      } else if (county && state) {
        return `Coastal area in ${county}, ${state}`;
      } else if (city) {
        return `Coastal area near ${city}`;
      }
    }

    // Try to build a more specific location description
    const specificParts = [];
    
    // Add specific place names first
    if (address.city || address.town || address.village || address.hamlet) {
      specificParts.push(address.city || address.town || address.village || address.hamlet);
    }
    
    // Add county if we don't have a city
    if (!specificParts.length && address.county) {
      specificParts.push(address.county);
    }
    
    // Add state
    if (address.state) {
      specificParts.push(address.state);
    }
    
    // Add distance from major city if we have coordinates
    if (specificParts.length === 0 || specificParts.length === 1) {
      const majorCity = this.findNearestMajorCity(location);
      if (majorCity) {
        const direction = this.getCompassDirection(location, { lat: majorCity.lat, lon: majorCity.lon });
        return `${majorCity.name}, ${majorCity.state} (${majorCity.distance} miles ${direction})`;
      }
    }

    if (specificParts.length > 0) {
      return specificParts.join(', ');
    }

    return this.getFallbackDescription(location);
  }

  private static isCoastalArea(data: NominatimResponse): boolean {
    const coastalTypes = ['coast', 'beach', 'shore', 'coastal'];
    
    const type = data.type?.toLowerCase() || '';
    const className = data.class?.toLowerCase() || '';
    const displayName = data.display_name?.toLowerCase() || '';

    return coastalTypes.some(t => 
      type.includes(t) || 
      className.includes(t) || 
      displayName.includes(t)
    );
  }

  private static getFallbackDescription(location: Location): string {
    const lat = location.latitude.toFixed(4);
    const lon = location.longitude.toFixed(4);
    return `Location: ${lat}°N, ${Math.abs(Number(lon))}°W`;
  }

  private static findNearestMajorCity(location: Location): { name: string; state: string; distance: number; lat: number; lon: number } | null {
    // Major US coastal cities for fishing reference
    const majorCities = [
      { name: 'Miami', state: 'FL', lat: 25.7617, lon: -80.1918 },
      { name: 'Key West', state: 'FL', lat: 24.5551, lon: -81.7826 },
      { name: 'Tampa', state: 'FL', lat: 27.9506, lon: -82.4572 },
      { name: 'Jacksonville', state: 'FL', lat: 30.3322, lon: -81.6557 },
      { name: 'Charleston', state: 'SC', lat: 32.7765, lon: -79.9311 },
      { name: 'Savannah', state: 'GA', lat: 32.0835, lon: -81.0998 },
      { name: 'Norfolk', state: 'VA', lat: 36.8468, lon: -76.2852 },
      { name: 'Virginia Beach', state: 'VA', lat: 36.8529, lon: -75.9780 },
      { name: 'Chesapeake Bay', state: 'MD', lat: 38.9784, lon: -76.4928 },
      { name: 'Annapolis', state: 'MD', lat: 38.9784, lon: -76.4928 },
      { name: 'Baltimore', state: 'MD', lat: 39.2904, lon: -76.6122 },
      { name: 'Ocean City', state: 'MD', lat: 38.3365, lon: -75.0849 },
      { name: 'Rehoboth Beach', state: 'DE', lat: 38.7151, lon: -75.0752 },
      { name: 'Cape May', state: 'NJ', lat: 38.9351, lon: -74.9060 },
      { name: 'Atlantic City', state: 'NJ', lat: 39.3643, lon: -74.4229 },
      { name: 'Long Beach Island', state: 'NJ', lat: 39.5596, lon: -74.2435 },
      { name: 'Montauk', state: 'NY', lat: 41.0719, lon: -71.8581 },
      { name: 'Block Island', state: 'RI', lat: 41.1721, lon: -71.5585 },
      { name: 'Nantucket', state: 'MA', lat: 41.2721, lon: -70.0940 },
      { name: 'Martha\'s Vineyard', state: 'MA', lat: 41.3701, lon: -70.6455 },
      { name: 'Cape Cod', state: 'MA', lat: 41.6681, lon: -70.2962 },
      { name: 'Portland', state: 'ME', lat: 43.6591, lon: -70.2568 },
      { name: 'Bar Harbor', state: 'ME', lat: 44.3876, lon: -68.2039 },
      { name: 'San Diego', state: 'CA', lat: 32.7157, lon: -117.1611 },
      { name: 'Los Angeles', state: 'CA', lat: 34.0522, lon: -118.2437 },
      { name: 'San Francisco', state: 'CA', lat: 37.7749, lon: -122.4194 },
      { name: 'Monterey', state: 'CA', lat: 36.6002, lon: -121.8947 },
      { name: 'Seattle', state: 'WA', lat: 47.6062, lon: -122.3321 },
      { name: 'Portland', state: 'OR', lat: 45.5152, lon: -122.6784 },
      { name: 'New Orleans', state: 'LA', lat: 29.9511, lon: -90.0715 },
      { name: 'Galveston', state: 'TX', lat: 29.3013, lon: -94.7977 },
      { name: 'Corpus Christi', state: 'TX', lat: 27.8006, lon: -97.3964 },
      { name: 'Houston', state: 'TX', lat: 29.7604, lon: -95.3698 }
    ];

    let nearest = null;
    let minDistance = Infinity;

    for (const city of majorCities) {
      const distance = this.calculateDistance(
        location.latitude, location.longitude,
        city.lat, city.lon
      );
      
      if (distance < minDistance && distance < 200) { // Within 200 miles
        minDistance = distance;
        nearest = { ...city, distance: Math.round(distance) };
      }
    }

    return nearest;
  }

  private static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private static getCompassDirection(location: Location, city: { lat: number; lon: number }): string {
    const lat1 = location.latitude * Math.PI / 180;
    const lon1 = location.longitude * Math.PI / 180;
    const lat2 = city.lat * Math.PI / 180;
    const lon2 = city.lon * Math.PI / 180;

    const dLon = lon2 - lon1;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

    let bearing = Math.atan2(y, x) * 180 / Math.PI;
    bearing = (bearing + 360) % 360; // Normalize to 0-360

    // Convert bearing to compass direction
    const directions = [
      'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
      'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'
    ];

    const index = Math.round(bearing / 22.5) % 16;
    return directions[index];
  }

  // Get a more detailed description with distance from nearest coastal features
  static async getDetailedLocationDescription(location: Location): Promise<string> {
    try {
      const response = await fetch(
        `${this.NOMINATIM_BASE_URL}?format=json&lat=${location.latitude}&lon=${location.longitude}&zoom=5&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'CarlFish/1.0'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Location service error: ${response.status}`);
      }

      const data: NominatimResponse = await response.json();
      return this.formatDetailedDescription(data, location);
    } catch (error) {
      console.error('Error fetching detailed location description:', error);
      return this.getLocationDescription(location);
    }
  }

  private static formatDetailedDescription(data: NominatimResponse, location: Location): string {
    const address = data.address;
    if (!address) {
      return this.getFallbackDescription(location);
    }

    // Try to find coastal references
    const coastalCities = [
      address.city,
      address.town,
      address.village
    ].filter(Boolean);

    const waterFeatures = [
      address.water,
      address.bay,
      address.sound,
      address.river,
      address.ocean,
      address.sea
    ].filter(Boolean);

    if (waterFeatures.length > 0 && coastalCities.length > 0) {
      return `${waterFeatures[0]}, near ${coastalCities[0]}`;
    }

    if (coastalCities.length > 0) {
      const state = address.state;
      return state ? `Near ${coastalCities[0]}, ${state}` : `Near ${coastalCities[0]}`;
    }

    return this.formatLocationDescription(data, location);
  }

  // Get a simple coastal reference (e.g., "50 miles SE of Miami")
  static async getCoastalReference(location: Location): Promise<string> {
    try {
      // This would require a more sophisticated service or database
      // For now, return a basic description
      return await this.getLocationDescription(location);
    } catch (error) {
      console.error('Error getting coastal reference:', error);
      return this.getFallbackDescription(location);
    }
  }
}
