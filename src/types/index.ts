export interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  heading?: number;
  speed?: number;
  description?: string; // Human-readable location description
}

export interface WeatherConditions {
  temperature?: number; // Air temperature in Celsius
  humidity?: number; // Relative humidity percentage
  pressure?: number; // Atmospheric pressure in hPa
  windSpeed?: number; // Wind speed in knots
  windDirection?: number; // Wind direction in degrees
  visibility?: number; // Visibility in nautical miles
  cloudCover?: number; // Cloud cover percentage
  precipitation?: number; // Precipitation in mm
  description?: string; // Weather description
}

export interface WaterConditions {
  temperature?: number; // Water temperature in Celsius
  depth?: number; // Water depth in meters
  clarity?: 'clear' | 'slightly_murky' | 'murky' | 'very_murky';
  current?: number; // Current speed in knots
  currentDirection?: number; // Current direction in degrees
  tide?: 'high' | 'rising' | 'falling' | 'low';
  waveHeight?: number; // Wave height in meters
  wavePeriod?: number; // Wave period in seconds
}

export interface FishCatch {
  id: string;
  sessionId?: string; // Link to parent session
  species: string;
  length: number; // Length in cm
  weight?: number; // Weight in kg
  condition: 'alive' | 'released' | 'kept' | 'dead';
  bait?: string;
  lure?: string;
  technique?: string;
  notes?: string;
  photoUrl?: string;
}

export interface FishingSession {
  id: string;
  date: Date;
  startTime: Date;
  endTime?: Date;
  location: Location;
  weather: WeatherConditions;
  water: WaterConditions;
  catches: FishCatch[];
  notes?: string;
  equipment?: string[];
  fishingMethod?: string;
  success?: boolean;
}

export interface NMEAData {
  id?: string;
  timestamp: Date;
  latitude?: number;
  longitude?: number;
  speed?: number;
  heading?: number;
  depth?: number;
  waterTemperature?: number;
  airTemperature?: number;
  windSpeed?: number;
  windDirection?: number;
  pressure?: number;
  rawSentence: string;
}

export interface ExportOptions {
  format: 'csv' | 'json' | 'email';
  dateRange?: {
    start: Date;
    end: Date;
  };
  includePhotos?: boolean;
  emailRecipients?: string[];
  emailSubject?: string;
}

export interface AppSettings {
  units: {
    temperature: 'celsius' | 'fahrenheit';
    distance: 'metric' | 'imperial';
    weight: 'metric' | 'imperial';
    pressure: 'hpa' | 'inHg';
  };
  nmea2000: {
    enabled: boolean;
    ipAddress?: string;
    port?: number;
    autoConnect: boolean;
  };
  export: {
    defaultFormat: 'csv' | 'json';
    autoBackup: boolean;
    backupInterval: number; // days
  };
}
