import { NMEAParser } from '../utils/nmeaParser';
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

  private constructor() {}

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
      // Parse NMEA 2000 data (this will need to be enhanced for PGN parsing)
      const nmeaData = NMEAParser.parse(rawData);
      if (nmeaData) {
        this.saveNMEAData(nmeaData);
      }
    } catch (error) {
      console.error('Error parsing NMEA 2000 data:', error);
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
