import { WeatherConditions, WaterConditions } from '../types';

interface OpenWeatherResponse {
  main: {
    temp: number;
    pressure: number;
    humidity: number;
  };
  wind: {
    speed: number;
    deg: number;
  };
  weather: Array<{
    description: string;
  }>;
  visibility: number;
  clouds: {
    all: number;
  };
}

interface WaterTemperatureResponse {
  data: Array<{
    lat: number;
    lon: number;
    value: number;
  }>;
}

export class WeatherService {
  private static readonly OPENWEATHER_API_KEY = 'demo'; // You'll need to get a real API key
  private static readonly OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';
  private static readonly WATER_TEMP_API_URL = 'https://api.openweathermap.org/data/2.5/onecall';

  static async getWeatherConditions(latitude: number, longitude: number): Promise<WeatherConditions | null> {
    try {
      // For demo purposes, return mock data
      // In production, you would use a real weather API
      return this.getMockWeatherData();
      
      // Real API call (commented out for demo):
      /*
      const response = await fetch(
        `${this.OPENWEATHER_BASE_URL}?lat=${latitude}&lon=${longitude}&appid=${this.OPENWEATHER_API_KEY}&units=metric`
      );
      
      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }
      
      const data: OpenWeatherResponse = await response.json();
      
      return {
        temperature: Math.round(data.main.temp),
        humidity: data.main.humidity,
        pressure: data.main.pressure,
        windSpeed: Math.round(data.wind.speed * 1.94384), // Convert m/s to knots
        windDirection: data.wind.deg,
        visibility: Math.round(data.visibility / 1852), // Convert meters to nautical miles
        cloudCover: data.clouds.all,
        description: data.weather[0]?.description || 'Unknown'
      };
      */
    } catch (error) {
      console.error('Error fetching weather data:', error);
      return null;
    }
  }

  static async getWaterConditions(latitude: number, longitude: number): Promise<WaterConditions | null> {
    try {
      // For demo purposes, return mock data
      // In production, you would use a marine weather API
      return this.getMockWaterData();
      
      // Real API call would go here
    } catch (error) {
      console.error('Error fetching water data:', error);
      return null;
    }
  }

  private static getMockWeatherData(): WeatherConditions {
    // Generate realistic mock weather data
    const baseTemp = 20 + Math.random() * 10; // 20-30°C
    const windSpeed = 5 + Math.random() * 15; // 5-20 knots
    const windDirection = Math.random() * 360;
    const pressure = 1010 + Math.random() * 20; // 1010-1030 hPa
    const humidity = 60 + Math.random() * 30; // 60-90%
    
    return {
      temperature: Math.round(baseTemp),
      humidity: Math.round(humidity),
      pressure: Math.round(pressure),
      windSpeed: Math.round(windSpeed),
      windDirection: Math.round(windDirection),
      visibility: 5 + Math.random() * 10, // 5-15 nautical miles
      cloudCover: Math.round(Math.random() * 100),
      description: this.getRandomWeatherDescription()
    };
  }

  private static getMockWaterData(): WaterConditions {
    // Generate realistic mock water data
    const waterTemp = 18 + Math.random() * 8; // 18-26°C
    const depth = 15 + Math.random() * 30; // 15-45 meters
    const clarityOptions = ['clear', 'slightly_murky', 'murky', 'very_murky'] as const;
    const tideOptions = ['high', 'rising', 'falling', 'low'] as const;
    
    return {
      temperature: Math.round(waterTemp),
      depth: Math.round(depth),
      clarity: clarityOptions[Math.floor(Math.random() * clarityOptions.length)],
      current: Math.random() * 2, // 0-2 knots
      currentDirection: Math.random() * 360,
      tide: tideOptions[Math.floor(Math.random() * tideOptions.length)],
      waveHeight: Math.random() * 2, // 0-2 meters
      wavePeriod: 3 + Math.random() * 7 // 3-10 seconds
    };
  }

  private static getRandomWeatherDescription(): string {
    const descriptions = [
      'Clear sky',
      'Partly cloudy',
      'Overcast',
      'Light rain',
      'Moderate rain',
      'Heavy rain',
      'Thunderstorm',
      'Fog',
      'Mist',
      'Haze'
    ];
    return descriptions[Math.floor(Math.random() * descriptions.length)];
  }

  // Method to get weather data for a specific location
  static async getLocationWeatherData(latitude: number, longitude: number): Promise<{
    weather: WeatherConditions;
    water: WaterConditions;
  } | null> {
    try {
      const [weather, water] = await Promise.all([
        this.getWeatherConditions(latitude, longitude),
        this.getWaterConditions(latitude, longitude)
      ]);

      if (!weather || !water) {
        return null;
      }

      return { weather, water };
    } catch (error) {
      console.error('Error fetching location weather data:', error);
      return null;
    }
  }
}
