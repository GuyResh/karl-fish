import { NMEAData } from '../types';

export class TestDataService {
  private static instance: TestDataService;
  private isRunning = false;
  private intervalId: number | null = null;
  private onDataCallback: ((data: NMEAData) => void) | null = null;
  
  // State variables for realistic incremental changes
  private currentLat = 41.0;
  private currentLon = -70.8;
  private currentHeading = 180; // Start heading south
  private currentDepth = 25; // Start at 25 meters
  private currentWindSpeed = 12;
  private currentWindDirection = 180;
  private currentAirTemp = 22;
  private currentPressure = 1015;

  private constructor() {}

  static getInstance(): TestDataService {
    if (!TestDataService.instance) {
      TestDataService.instance = new TestDataService();
    }
    return TestDataService.instance;
  }

  startSimulation(callback: (data: NMEAData) => void) {
    console.log('TestDataService: Starting simulation');
    this.onDataCallback = callback;
    this.isRunning = true;
    
    // Reset state to initial values
    this.resetState();
    
    // Generate initial data
    this.generateTestData();
    
    // Generate new data every 2 seconds for more realistic updates
    this.intervalId = setInterval(() => {
      this.generateTestData();
    }, 2000);
    console.log('TestDataService: Simulation started, interval ID:', this.intervalId);
  }

  stopSimulation() {
    console.log('TestDataService: Stopping simulation, was running:', this.isRunning);
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('TestDataService: Simulation stopped');
    }
  }

  private generateTestData() {
    if (!this.onDataCallback) return;

    const now = new Date();
    
    // Simulate realistic incremental changes for marine data
    
    // GPS Position - small random drift (vessel movement)
    this.currentLat += (Math.random() - 0.5) * 0.0001; // ~10m drift
    this.currentLon += (Math.random() - 0.5) * 0.0001;
    
    console.log('TestDataService: Generating GPS coordinates:', this.currentLat.toFixed(6), this.currentLon.toFixed(6));
    
    // Generate NMEA 2000 PGN data
    // PGN 129025 - Position, Rapid Update
    const positionPgn = this.generatePositionPgn(this.currentLat, this.currentLon, now);
    this.onDataCallback(positionPgn);

    // PGN 130306 - Wind Data - gradual changes
    this.currentWindSpeed += (Math.random() - 0.5) * 0.5; // ±0.25 knots per update
    this.currentWindSpeed = Math.max(5, Math.min(25, this.currentWindSpeed)); // Clamp 5-25 knots
    this.currentWindDirection += (Math.random() - 0.5) * 2; // ±1 degree per update
    this.currentWindDirection = ((this.currentWindDirection % 360) + 360) % 360; // Normalize 0-360
    
    const windPgn = this.generateWindPgn(this.currentWindSpeed, this.currentWindDirection, now);
    this.onDataCallback(windPgn);

    // PGN 128267 - Water Depth - gradual changes (±3 meters max)
    this.currentDepth += (Math.random() - 0.5) * 6; // ±3 meters per update
    this.currentDepth = Math.max(10, Math.min(50, this.currentDepth)); // Clamp 10-50 meters
    
    const depthPgn = this.generateDepthPgn(this.currentDepth, now);
    this.onDataCallback(depthPgn);

    // PGN 130310 - Environmental Parameters - very gradual changes
    this.currentAirTemp += (Math.random() - 0.5) * 0.2; // ±0.1°C per update
    this.currentAirTemp = Math.max(15, Math.min(30, this.currentAirTemp)); // Clamp 15-30°C
    this.currentPressure += (Math.random() - 0.5) * 0.5; // ±0.25 hPa per update
    this.currentPressure = Math.max(1000, Math.min(1040, this.currentPressure)); // Clamp 1000-1040 hPa
    
    const envPgn = this.generateEnvironmentalPgn(this.currentAirTemp, this.currentPressure, now);
    this.onDataCallback(envPgn);

    // PGN 127250 - Vessel Heading - very small changes (±2 degrees max)
    this.currentHeading += (Math.random() - 0.5) * 4; // ±2 degrees per update
    this.currentHeading = ((this.currentHeading % 360) + 360) % 360; // Normalize 0-360
    
    const headingPgn = this.generateHeadingPgn(this.currentHeading, now);
    this.onDataCallback(headingPgn);

    // PGN 127258 - Engine RPM (occasionally) - gradual changes
    if (Math.random() < 0.3) { // 30% chance
      const rpm = 1200 + Math.random() * 800; // 1200-2000 RPM
      const enginePgn = this.generateEnginePgn(rpm, now);
      this.onDataCallback(enginePgn);
    }
  }







  isSimulationRunning(): boolean {
    return this.isRunning;
  }

  private resetState(): void {
    // Reset to initial values for realistic simulation
    this.currentLat = 41.0;
    this.currentLon = -70.8;
    this.currentHeading = 180; // Start heading south
    this.currentDepth = 25; // Start at 25 meters
    this.currentWindSpeed = 12;
    this.currentWindDirection = 180;
    this.currentAirTemp = 22;
    this.currentPressure = 1015;
  }

  // NMEA 2000 PGN generation methods
  private generatePositionPgn(lat: number, lon: number, time: Date): NMEAData {
    // PGN 129025 - Position, Rapid Update
    const pgnData = {
      pgn: 129025,
      fields: {
        Latitude: lat,
        Longitude: lon,
        PositionAccuracy: 1, // GPS fix
        Timestamp: time.toISOString()
      }
    };

    return {
      id: crypto.randomUUID(),
      timestamp: time,
      latitude: lat,
      longitude: lon,
      rawSentence: JSON.stringify(pgnData)
    };
  }

  private generateWindPgn(windSpeed: number, windDirection: number, time: Date): NMEAData {
    // PGN 130306 - Wind Data
    const pgnData = {
      pgn: 130306,
      fields: {
        WindSpeed: windSpeed,
        WindAngle: windDirection,
        Reference: 0, // Apparent wind
        Timestamp: time.toISOString()
      }
    };

    return {
      id: crypto.randomUUID(),
      timestamp: time,
      windSpeed: windSpeed,
      windDirection: windDirection,
      rawSentence: JSON.stringify(pgnData)
    };
  }

  private generateDepthPgn(depth: number, time: Date): NMEAData {
    // PGN 128267 - Water Depth
    const pgnData = {
      pgn: 128267,
      fields: {
        Depth: depth,
        Offset: 0, // Transducer offset
        Range: 0, // Max range
        Timestamp: time.toISOString()
      }
    };

    return {
      id: crypto.randomUUID(),
      timestamp: time,
      waterDepth: depth,
      rawSentence: JSON.stringify(pgnData)
    };
  }

  private generateEnvironmentalPgn(temperature: number, pressure: number, time: Date): NMEAData {
    // PGN 130310 - Environmental Parameters
    const pgnData = {
      pgn: 130310,
      fields: {
        Temperature: temperature,
        Pressure: pressure,
        Humidity: 60 + Math.random() * 20, // 60-80% humidity
        Timestamp: time.toISOString()
      }
    };

    return {
      id: crypto.randomUUID(),
      timestamp: time,
      temperature: temperature,
      pressure: pressure,
      rawSentence: JSON.stringify(pgnData)
    };
  }

  private generateHeadingPgn(heading: number, time: Date): NMEAData {
    // PGN 127250 - Vessel Heading
    const pgnData = {
      pgn: 127250,
      fields: {
        Heading: heading,
        Deviation: 0, // Magnetic deviation
        Variation: 0, // Magnetic variation
        Timestamp: time.toISOString()
      }
    };

    return {
      id: crypto.randomUUID(),
      timestamp: time,
      heading: heading,
      rawSentence: JSON.stringify(pgnData)
    };
  }

  private generateEnginePgn(rpm: number, time: Date): NMEAData {
    // PGN 127258 - Engine RPM
    const pgnData = {
      pgn: 127258,
      fields: {
        EngineRPM: rpm,
        EngineInstance: 0, // Primary engine
        Timestamp: time.toISOString()
      }
    };

    return {
      id: crypto.randomUUID(),
      timestamp: time,
      engineRpm: rpm,
      rawSentence: JSON.stringify(pgnData)
    };
  }
}

export const testDataService = TestDataService.getInstance();
