import { FishingDataService } from '../database';
import { NMEAData } from '../types';
import { testDataService } from './testDataService';

export class NMEA2000Service {
  private static instance: NMEA2000Service;
  private socket: WebSocket | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectInterval: number = 5000;
  private currentSessionId: string | null = null;

  private constructor() {
    // Simple NMEA 2000 parser for browser environment
  }

  static getInstance(): NMEA2000Service {
    if (!NMEA2000Service.instance) {
      NMEA2000Service.instance = new NMEA2000Service();
    }
    return NMEA2000Service.instance;
  }

  async connect(ipAddress: string, port: number = 2000, testMode: boolean = false): Promise<boolean> {
    if (testMode) {
      return this.startTestMode();
    }

    try {
      const wsUrl = `ws://${ipAddress}:${port}`;
      console.log('Connecting to NMEA 2000 gateway at:', wsUrl);
      
      this.socket = new WebSocket(wsUrl);
      
      this.socket.onopen = () => {
        console.log('Connected to NMEA 2000 gateway');
        this.isConnected = true;
        this.reconnectAttempts = 0;
      };

      this.socket.onmessage = (event) => {
        this.handleNMEAData(event.data);
      };

      this.socket.onclose = () => {
        console.log('Disconnected from NMEA 2000 gateway');
        this.isConnected = false;
        this.attemptReconnect(ipAddress, port);
      };

      this.socket.onerror = (error) => {
        console.error('NMEA 2000 gateway connection error:', error);
        this.isConnected = false;
      };

      // Wait for connection to establish
      return new Promise((resolve) => {
        const checkConnection = () => {
          if (this.isConnected) {
            resolve(true);
          } else if (this.socket?.readyState === WebSocket.CLOSED) {
            resolve(false);
          } else {
            setTimeout(checkConnection, 100);
          }
        };
        checkConnection();
      });
    } catch (error) {
      console.error('Error connecting to NMEA 2000 gateway:', error);
      return false;
    }
  }

  private async startTestMode(): Promise<boolean> {
    console.log('Starting NMEA 2000 test mode with simulated data');
    this.isConnected = true;
    this.reconnectAttempts = 0;

    // Clear any old NMEA data to ensure we start fresh with offshore coordinates
    try {
      await FishingDataService.clearNMEAData();
      console.log('Cleared old NMEA data');
    } catch (error) {
      console.error('Error clearing NMEA data:', error);
    }

    testDataService.startSimulation((data) => {
      this.handleNMEAData(data.rawSentence);
    });

    console.log('Test mode started, isConnected:', this.isConnected);
    return true;
  }

  private attemptReconnect(ipAddress: string, port: number): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect to NMEA 2000 gateway (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect(ipAddress, port);
      }, this.reconnectInterval);
    } else {
      console.log('Max reconnection attempts reached');
    }
  }

  private handleNMEAData(rawData: string): void {
    try {
      console.log('[NMEA2000] Received raw data:', rawData);
      
      // Parse NMEA 2000 PGN data (expecting JSON format from test data)
      let parsedPgn: any;
      
      try {
        // Try to parse as JSON first (from our test data)
        parsedPgn = JSON.parse(rawData);
      } catch (jsonError) {
        // If not JSON, try to parse as Actisense format
        parsedPgn = this.parseActisenseFormat(rawData);
      }
      
      if (parsedPgn && parsedPgn.pgn) {
        console.log('[NMEA2000] Parsed PGN:', parsedPgn);
        
        // Convert PGN to NMEAData format
        const nmeaData = this.convertPgnToNmeaData(parsedPgn);
        
        if (nmeaData) {
          this.saveNMEAData(nmeaData);
        }
      } else {
        console.log('[NMEA2000] Failed to parse PGN data');
      }
    } catch (error) {
      console.error('[NMEA2000] Error parsing NMEA 2000 data:', error);
    }
  }

  private parseActisenseFormat(data: string): any | null {
    try {
      // Parse Actisense format: "timestamp,prio,pgn,src,dst,len,data..."
      // Example: "2017-03-13T01:00:00.146Z,2,127245,204,255,8,fc,f8,ff,7f,ff,7f,ff,ff"
      const parts = data.split(',');
      
      if (parts.length < 7) {
        console.log('[NMEA2000] Invalid Actisense format');
        return null;
      }
      
      const timestamp = parts[0];
      const priority = parseInt(parts[1]);
      const pgn = parseInt(parts[2]);
      const source = parseInt(parts[3]);
      const destination = parseInt(parts[4]);
      const length = parseInt(parts[5]);
      const dataBytes = parts.slice(6, 6 + length);
      
      // Convert hex data to numbers
      const dataArray = dataBytes.map((byte: string) => parseInt(byte, 16));
      
      // Basic PGN parsing based on PGN number
      const fields: any = {};
      
      switch (pgn) {
        case 129025: // Position, Rapid Update
          if (dataArray.length >= 8) {
            // Parse latitude (4 bytes, signed, 1e-7 degrees)
            const latRaw = (dataArray[0] | (dataArray[1] << 8) | (dataArray[2] << 16) | (dataArray[3] << 24));
            fields.Latitude = latRaw / 1e7;
            
            // Parse longitude (4 bytes, signed, 1e-7 degrees)
            const lonRaw = (dataArray[4] | (dataArray[5] << 8) | (dataArray[6] << 16) | (dataArray[7] << 24));
            fields.Longitude = lonRaw / 1e7;
          }
          break;
          
        case 130306: // Wind Data
          if (dataArray.length >= 4) {
            // Parse wind speed (2 bytes, unsigned, 0.01 m/s)
            fields.WindSpeed = ((dataArray[0] | (dataArray[1] << 8)) / 100) * 1.94384; // Convert m/s to knots
            // Parse wind angle (2 bytes, unsigned, 0.0001 radians)
            fields.WindAngle = ((dataArray[2] | (dataArray[3] << 8)) / 10000) * (180 / Math.PI); // Convert radians to degrees
          }
          break;
          
        case 128267: // Water Depth
          if (dataArray.length >= 4) {
            // Parse depth (4 bytes, unsigned, 0.01 m)
            fields.Depth = ((dataArray[0] | (dataArray[1] << 8) | (dataArray[2] << 16) | (dataArray[3] << 24)) / 100);
          }
          break;
          
        case 127250: // Vessel Heading
          if (dataArray.length >= 2) {
            // Parse heading (2 bytes, unsigned, 0.0001 radians)
            fields.Heading = ((dataArray[0] | (dataArray[1] << 8)) / 10000) * (180 / Math.PI);
          }
          break;
          
        case 130310: // Environmental Parameters
          if (dataArray.length >= 4) {
            // Parse temperature (2 bytes, signed, 0.01°C)
            fields.Temperature = ((dataArray[0] | (dataArray[1] << 8)) / 100);
            // Parse pressure (2 bytes, unsigned, 1 Pa)
            fields.Pressure = (dataArray[2] | (dataArray[3] << 8)) / 100; // Convert Pa to hPa
          }
          break;
          
        case 127258: // Engine RPM
          if (dataArray.length >= 2) {
            // Parse RPM (2 bytes, unsigned, 0.25 RPM)
            fields.EngineRPM = (dataArray[0] | (dataArray[1] << 8)) / 4;
          }
          break;
          
        default:
          console.log(`[NMEA2000] Unhandled PGN ${pgn} in Actisense format`);
          return null;
      }
      
      return {
        pgn: pgn,
        fields: fields,
        timestamp: timestamp,
        priority: priority,
        source: source,
        destination: destination
      };
      
    } catch (error) {
      console.error('[NMEA2000] Error parsing Actisense format:', error);
      return null;
    }
  }

  private convertPgnToNmeaData(parsedPgn: any): NMEAData | null {
    try {
      const pgn = parsedPgn.pgn;
      const fields = parsedPgn.fields || {};
      
      // Create base NMEAData structure
      const nmeaData: NMEAData = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        rawSentence: JSON.stringify(parsedPgn), // Store raw PGN data
        sessionId: this.currentSessionId || undefined
      };

      // Map specific PGNs to NMEAData fields
      switch (pgn) {
        case 129025: // Position, Rapid Update
          if (fields.Latitude !== undefined && fields.Longitude !== undefined) {
            nmeaData.latitude = fields.Latitude;
            nmeaData.longitude = fields.Longitude;
            console.log('[NMEA2000] GPS Position:', fields.Latitude, fields.Longitude);
          }
          break;

        case 130306: // Wind Data
          if (fields.WindSpeed !== undefined) {
            nmeaData.windSpeed = fields.WindSpeed;
            console.log('[NMEA2000] Wind Speed:', fields.WindSpeed);
          }
          if (fields.WindAngle !== undefined) {
            nmeaData.windDirection = fields.WindAngle;
            console.log('[NMEA2000] Wind Direction:', fields.WindAngle);
          }
          break;

        case 128267: // Water Depth
          if (fields.Depth !== undefined) {
            nmeaData.waterDepth = fields.Depth;
            console.log('[NMEA2000] Water Depth:', fields.Depth);
          }
          break;

        case 127250: // Vessel Heading
          if (fields.Heading !== undefined) {
            nmeaData.heading = fields.Heading;
            console.log('[NMEA2000] Vessel Heading:', fields.Heading);
          }
          break;

        case 127488: // Engine Parameters
          if (fields.EngineTemperature !== undefined) {
            nmeaData.engineTemperature = fields.EngineTemperature;
            console.log('[NMEA2000] Engine Temperature:', fields.EngineTemperature);
          }
          if (fields.EnginePressure !== undefined) {
            nmeaData.enginePressure = fields.EnginePressure;
            console.log('[NMEA2000] Engine Pressure:', fields.EnginePressure);
          }
          break;

        case 130310: // Environmental Parameters
          if (fields.Temperature !== undefined) {
            nmeaData.temperature = fields.Temperature;
            console.log('[NMEA2000] Environmental Temperature:', fields.Temperature);
          }
          if (fields.Pressure !== undefined) {
            nmeaData.pressure = fields.Pressure;
            console.log('[NMEA2000] Environmental Pressure:', fields.Pressure);
          }
          break;

        case 127258: // Engine RPM
          if (fields.EngineRPM !== undefined) {
            nmeaData.engineRpm = fields.EngineRPM;
            console.log('[NMEA2000] Engine RPM:', fields.EngineRPM);
          }
          break;

        case 127505: // Fluid Level
          if (fields.FuelLevel !== undefined) {
            nmeaData.fuelLevel = fields.FuelLevel;
            console.log('[NMEA2000] Fuel Level:', fields.FuelLevel);
          }
          break;

        default:
          console.log(`[NMEA2000] Unhandled PGN ${pgn}:`, fields);
          return null; // Don't save unhandled PGNs
      }

      // Only return data if we have at least one meaningful field
      if (nmeaData.latitude || nmeaData.windSpeed || nmeaData.waterDepth || 
          nmeaData.heading || nmeaData.temperature || nmeaData.engineRpm || 
          nmeaData.fuelLevel) {
        return nmeaData;
      }

      return null;
    } catch (error) {
      console.error('[NMEA2000] Error converting PGN to NMEAData:', error);
      return null;
    }
  }

  private async saveNMEAData(data: NMEAData): Promise<void> {
    try {
      await FishingDataService.saveNMEAData(data);
    } catch (error) {
      console.error('Error saving NMEA 2000 data:', error);
    }
  }

  disconnect(): void {
    console.log('NMEA2000Service: Disconnect called, isConnected:', this.isConnected);
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    if (testDataService.isSimulationRunning()) {
      console.log('NMEA2000Service: Stopping test simulation');
      testDataService.stopSimulation();
    }

    this.isConnected = false;
    this.currentSessionId = null;
    console.log('NMEA2000Service: Disconnected, isConnected:', this.isConnected);
  }

  getConnectionStatus(): { connected: boolean; connecting: boolean } {
    return {
      connected: this.isConnected,
      connecting: this.socket?.readyState === WebSocket.CONNECTING
    };
  }

  setCurrentSession(sessionId: string | null): void {
    this.currentSessionId = sessionId;
  }

  getCurrentSession(): string | null {
    return this.currentSessionId;
  }
}

export const nmea2000Service = NMEA2000Service.getInstance();
