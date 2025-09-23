import { NMEAParser } from '../utils/nmeaParser';
import { FishingDataService } from '../database';
import { NMEAData, Location, WeatherConditions, WaterConditions } from '../types';
import { testDataService } from './testDataService';

export class FurunoService {
  private static instance: FurunoService;
  private socket: WebSocket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000; // 5 seconds
  private currentSessionId: string | null = null;

  private constructor() {}

  static getInstance(): FurunoService {
    if (!FurunoService.instance) {
      FurunoService.instance = new FurunoService();
    }
    return FurunoService.instance;
  }

  async connect(ipAddress: string, port: number = 10110, testMode: boolean = false): Promise<boolean> {
    if (testMode) {
      return this.startTestMode();
    }

    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `ws://${ipAddress}:${port}`;
        this.socket = new WebSocket(wsUrl);

        this.socket.onopen = () => {
          console.log('Connected to Furuno unit');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          resolve(true);
        };

        this.socket.onmessage = (event) => {
          this.handleNMEAData(event.data);
        };

        this.socket.onclose = () => {
          console.log('Disconnected from Furuno unit');
          this.isConnected = false;
          this.handleReconnect(ipAddress, port);
        };

        this.socket.onerror = (error) => {
          console.error('Furuno connection error:', error);
          this.isConnected = false;
          reject(error);
        };

        // Set connection timeout
        setTimeout(() => {
          if (!this.isConnected) {
            this.socket?.close();
            reject(new Error('Connection timeout'));
          }
        }, 10000);

      } catch (error) {
        reject(error);
      }
    });
  }

  private async handleReconnect(ipAddress: string, port: number): Promise<void> {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        this.connect(ipAddress, port).catch(console.error);
      }, this.reconnectDelay);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  private async handleNMEAData(data: string): Promise<void> {
    try {
      // Split multiple NMEA sentences if they come in a single message
      const sentences = data.trim().split('\n').filter(sentence => sentence.trim());
      
      for (const sentence of sentences) {
        const nmeaData = NMEAParser.parse(sentence);
        if (nmeaData) {
          await FishingDataService.addNMEAData(nmeaData);
          this.updateCurrentSession(nmeaData);
        }
      }
    } catch (error) {
      console.error('Error handling NMEA data:', error);
    }
  }

  private async updateCurrentSession(nmeaData: NMEAData): Promise<void> {
    if (!this.currentSessionId) return;

    try {
      const session = await FishingDataService.getSession(this.currentSessionId);
      if (!session) return;

      const updates: Partial<typeof session> = {};

      // Update location if GPS data is available
      if (nmeaData.latitude && nmeaData.longitude) {
        updates.location = {
          ...session.location,
          latitude: nmeaData.latitude,
          longitude: nmeaData.longitude,
          accuracy: nmeaData.accuracy,
          heading: nmeaData.heading,
          speed: nmeaData.speed
        };
      }

      // Update weather conditions
      if (nmeaData.airTemperature || nmeaData.windSpeed || nmeaData.windDirection || nmeaData.pressure) {
        updates.weather = {
          ...session.weather,
          ...(nmeaData.airTemperature && { temperature: nmeaData.airTemperature }),
          ...(nmeaData.windSpeed && { windSpeed: nmeaData.windSpeed }),
          ...(nmeaData.windDirection && { windDirection: nmeaData.windDirection }),
          ...(nmeaData.pressure && { pressure: nmeaData.pressure })
        };
      }

      // Update water conditions
      if (nmeaData.waterTemperature || nmeaData.depth) {
        updates.water = {
          ...session.water,
          ...(nmeaData.waterTemperature && { temperature: nmeaData.waterTemperature }),
          ...(nmeaData.depth && { depth: nmeaData.depth })
        };
      }

      // Only update if there are changes
      if (Object.keys(updates).length > 0) {
        await FishingDataService.updateSession(this.currentSessionId, updates);
      }
    } catch (error) {
      console.error('Error updating current session:', error);
    }
  }

  setCurrentSession(sessionId: string | null): void {
    this.currentSessionId = sessionId;
  }

  private async startTestMode(): Promise<boolean> {
    console.log('Starting Furuno test mode with simulated data');
    this.isConnected = true;
    this.reconnectAttempts = 0;
    
    testDataService.startSimulation((data) => {
      this.handleNMEAData(data.rawSentence);
    });
    
    return true;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    if (testDataService.isSimulationRunning()) {
      testDataService.stopSimulation();
    }
    
    this.isConnected = false;
    this.currentSessionId = null;
  }

  isConnectedToFuruno(): boolean {
    return this.isConnected;
  }

  // Method to manually send commands to Furuno (if supported)
  sendCommand(command: string): void {
    if (this.socket && this.isConnected) {
      this.socket.send(command);
    } else {
      console.warn('Not connected to Furuno device');
    }
  }

  // Get current connection status
  getConnectionStatus(): {
    connected: boolean;
    reconnectAttempts: number;
    currentSession: string | null;
  } {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      currentSession: this.currentSessionId
    };
  }
}

// Export singleton instance
export const furunoService = FurunoService.getInstance();
