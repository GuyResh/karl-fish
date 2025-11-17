import { FishingDataService } from '../database';
import { NMEAData } from '../types';
import { testDataService } from './testDataService';

export interface ConnectionError {
  code?: number;
  reason?: string;
  message?: string;
  type?: string;
  target?: any;
  wasClean?: boolean;
  url?: string;
  readyState?: number;
}

export class NMEA2000Service {
  private static instance: NMEA2000Service;
  private socket: WebSocket | null = null;
  private isConnected: boolean = false;
  private currentSessionId: string | null = null;
  private messageListeners: Array<(payload: { raw: string; parsed?: any }) => void> = [];
  private recentMessages: Array<{ timestamp: number; raw: string; parsed?: any }> = [];
  private recentMessagesLimit: number = 1000;
  private lastError: ConnectionError | null = null;

  private constructor() {
    // Simple NMEA 2000 parser for browser environment
  }

  static getInstance(): NMEA2000Service {
    if (!NMEA2000Service.instance) {
      NMEA2000Service.instance = new NMEA2000Service();
    }
    return NMEA2000Service.instance;
  }

  getLastError(): ConnectionError | null {
    return this.lastError;
  }

  private getErrorMessage(error: ConnectionError | null): string {
    if (!error) {
      return 'Unknown connection error';
    }

    // Check for Android-specific issues
    const isAndroid = /Android/i.test(navigator.userAgent);
    
    // WebSocket close codes
    if (error.code !== undefined) {
      switch (error.code) {
        case 1006: // Abnormal closure (no close frame)
          if (isAndroid) {
            return 'Connection blocked. This may be due to Android security settings blocking cleartext traffic (ws://). Check network security configuration.';
          }
          return 'Connection closed abnormally. The server may not be reachable or the connection was blocked.';
        case 1000: // Normal closure
          return 'Connection closed normally.';
        case 1001: // Going away
          return 'Server is going away.';
        case 1002: // Protocol error
          return 'Protocol error. The server may not support WebSocket connections.';
        case 1003: // Unsupported data
          return 'Unsupported data type.';
        case 1004: // Reserved
          return 'Connection closed (reserved code).';
        case 1005: // No status code
          return 'No status code received.';
        case 1007: // Invalid frame payload data
          return 'Invalid data received from server.';
        case 1008: // Policy violation
          if (isAndroid) {
            return 'Connection blocked by security policy. Android may be blocking cleartext WebSocket (ws://) connections. Check network security configuration.';
          }
          return 'Connection blocked by security policy.';
        case 1009: // Message too big
          return 'Message too large.';
        case 1010: // Missing extension
          return 'Missing required extension.';
        case 1011: // Internal error
          return 'Server internal error.';
        case 1012: // Service restart
          return 'Server is restarting.';
        case 1013: // Try again later
          return 'Server is busy, try again later.';
        case 1014: // Bad gateway
          return 'Bad gateway.';
        case 1015: // TLS handshake failure
          return 'TLS handshake failed.';
      }
    }

    // Check readyState for connection issues
    if (error.readyState === WebSocket.CLOSED && !error.wasClean) {
      if (isAndroid) {
        return 'Connection failed immediately. This may indicate Android is blocking cleartext WebSocket (ws://) connections. Check network security configuration in AndroidManifest.xml.';
      }
      return 'Connection failed. The server may not be reachable or the connection was refused.';
    }

    // Generic error messages
    if (error.message) {
      if (error.message.includes('Failed to construct') || error.message.includes('NetworkError')) {
        if (isAndroid) {
          return `Network error: ${error.message}. Android may be blocking cleartext traffic. Check network security configuration.`;
        }
        return `Network error: ${error.message}`;
      }
      return error.message;
    }

    if (error.reason) {
      return error.reason;
    }

    return 'Connection failed. Please check your network connection and server settings.';
  }

  async connect(ipAddress: string, port: number = 2000, testMode: boolean = false): Promise<{ success: boolean; error?: ConnectionError; errorMessage?: string }> {
    if (testMode) {
      return await this.startTestMode();
    }

    // Clear previous error
    this.lastError = null;

    try {
      const wsUrl = `ws://${ipAddress}:${port}`;
      console.log('[NMEA2000] Connecting to NMEA 2000 gateway at:', wsUrl);
      
      this.socket = new WebSocket(wsUrl);
      
      this.socket.onopen = () => {
        console.log('[NMEA2000] Connected to NMEA 2000 gateway');
        this.isConnected = true;
        this.lastError = null; // Clear error on successful connection
      };

      this.socket.onmessage = (event) => {
        this.handleNMEAData(event.data);
      };

      this.socket.onclose = (event) => {
        console.log('[NMEA2000] Disconnected from NMEA 2000 gateway');
        const error: ConnectionError = {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
          url: wsUrl,
          readyState: this.socket?.readyState
        };
        this.lastError = error;
        console.log('[NMEA2000] Close event details:', error);
        this.isConnected = false;
        // Don't auto-reconnect - let the UI handle retries
        // this.attemptReconnect(ipAddress, port);
      };

      this.socket.onerror = (error) => {
        console.error('[NMEA2000] WebSocket connection error:', error);
        const errorEvent = error as Event;
        const errorDetails: ConnectionError = {
          type: errorEvent.type,
          target: errorEvent.target,
          readyState: this.socket?.readyState,
          url: wsUrl,
          message: 'WebSocket connection error'
        };
        this.lastError = errorDetails;
        console.error('[NMEA2000] Error details:', errorDetails);
        this.isConnected = false;
      };

      // Wait for connection to establish with timeout
      return new Promise((resolve) => {
        let resolved = false;
        
        const checkConnection = () => {
          if (resolved) return;
          
          if (this.isConnected) {
            resolved = true;
            resolve({ success: true });
          } else if (this.socket?.readyState === WebSocket.CLOSED || this.socket?.readyState === WebSocket.CLOSING) {
            resolved = true;
            const error = this.lastError || { url: wsUrl, readyState: this.socket?.readyState };
            resolve({ 
              success: false, 
              error,
              errorMessage: this.getErrorMessage(error)
            });
          } else {
            setTimeout(checkConnection, 100);
          }
        };
        
        // Start checking after a short delay to allow WebSocket to initialize
        setTimeout(checkConnection, 100);
        
        // Set up a longer timeout to match UI expectations
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            console.log('[NMEA2000] Connection attempt timed out');
            const error: ConnectionError = { 
              url: wsUrl, 
              message: 'Connection timeout',
              readyState: this.socket?.readyState 
            };
            this.lastError = error;
            resolve({ 
              success: false, 
              error,
              errorMessage: this.getErrorMessage(error)
            });
          }
        }, 12000); // 12 second timeout to allow UI 10-second timeout to work
      });
    } catch (error) {
      console.error('[NMEA2000] Error connecting to NMEA 2000 gateway:', error);
      const errorDetails: ConnectionError = {
        message: (error as Error)?.message || 'Unknown error',
        url: `ws://${ipAddress}:${port}`
      };
      this.lastError = errorDetails;
      return { 
        success: false, 
        error: errorDetails,
        errorMessage: this.getErrorMessage(errorDetails)
      };
    }
  }

  private async startTestMode(): Promise<{ success: boolean; error?: ConnectionError; errorMessage?: string }> {
    console.log('[NMEA2000] Starting NMEA 2000 test mode with simulated data');
    this.isConnected = true;
    this.lastError = null; // Clear any previous errors

    // Clear any old NMEA data to ensure we start fresh with offshore coordinates
    try {
      await FishingDataService.clearNMEAData();
      console.log('[NMEA2000] Cleared old NMEA data');
    } catch (error) {
      console.error('[NMEA2000] Error clearing NMEA data:', error);
    }

    testDataService.startSimulation((data) => {
      this.handleNMEAData(data.rawSentence);
    });

    console.log('[NMEA2000] Test mode started, isConnected:', this.isConnected);
    return { success: true };
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

        // Notify listeners and store recent messages
        this.pushMessage(rawData, parsedPgn);
      } else {
        console.log('[NMEA2000] Failed to parse PGN data');
        this.pushMessage(rawData);
      }
    } catch (error) {
      console.error('[NMEA2000] Error parsing NMEA 2000 data:', error);
      this.pushMessage(rawData);
    }
  }

  private pushMessage(raw: string, parsed?: any) {
    const entry = { timestamp: Date.now(), raw, parsed };
    this.recentMessages.push(entry);
    if (this.recentMessages.length > this.recentMessagesLimit) {
      this.recentMessages.splice(0, this.recentMessages.length - this.recentMessagesLimit);
    }
    for (const listener of this.messageListeners) {
      try { listener({ raw, parsed }); } catch {}
    }
  }

  subscribeMessages(listener: (payload: { raw: string; parsed?: any }) => void): () => void {
    this.messageListeners.push(listener);
    return () => {
      this.messageListeners = this.messageListeners.filter(l => l !== listener);
    };
  }

  getRecentMessages(): Array<{ timestamp: number; raw: string; parsed?: any }> {
    return [...this.recentMessages];
  }

  clearMessages(): void {
    this.recentMessages = [];
    // Inform listeners that messages were cleared so UIs can update
    for (const listener of this.messageListeners) {
      try { listener({ raw: '', parsed: undefined }); } catch {}
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
