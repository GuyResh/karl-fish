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
  userId?: string; // User who owns this catch
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
  userId?: string; // User who owns this session
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
  shared?: boolean;
  // Sync-related fields
  dbId?: string; // Database row ID (null if not synced to cloud)
  lastModified?: Date; // Last modification timestamp
}

export interface NMEAData {
  id?: string;
  userId?: string; // User who owns this NMEA data
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
  sessionId?: string; // Link to current fishing session
  
  // NMEA 2000 specific fields
  waterDepth?: number; // Water depth from PGN 128267
  temperature?: number; // Environmental temperature from PGN 130310
  engineTemperature?: number; // Engine temperature from PGN 127488
  enginePressure?: number; // Engine pressure from PGN 127488
  engineRpm?: number; // Engine RPM from PGN 127258
  fuelLevel?: number; // Fuel level from PGN 127505
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
  angler: {
    login?: string;
    password?: string;
    name?: string;
  };
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
