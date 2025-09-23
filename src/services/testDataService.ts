import { NMEAData } from '../types';

export class TestDataService {
  private static instance: TestDataService;
  private isRunning = false;
  private intervalId: number | null = null;
  private onDataCallback: ((data: NMEAData) => void) | null = null;

  private constructor() {}

  static getInstance(): TestDataService {
    if (!TestDataService.instance) {
      TestDataService.instance = new TestDataService();
    }
    return TestDataService.instance;
  }

  startSimulation(callback: (data: NMEAData) => void) {
    this.onDataCallback = callback;
    this.isRunning = true;
    
    // Generate initial data
    this.generateTestData();
    
    // Generate new data every 5 seconds
    this.intervalId = setInterval(() => {
      this.generateTestData();
    }, 5000);
  }

  stopSimulation() {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private generateTestData() {
    if (!this.onDataCallback) return;

    const now = new Date();
    
    // Simulate realistic fishing data
    const baseLat = 40.7128 + (Math.random() - 0.5) * 0.01; // NYC area
    const baseLon = -74.0060 + (Math.random() - 0.5) * 0.01;
    
    // Generate GPS data (GPGGA)
    const ggaData: NMEAData = {
      id: crypto.randomUUID(),
      timestamp: now,
      latitude: baseLat,
      longitude: baseLon,
      rawSentence: this.generateGGASentence(baseLat, baseLon, now)
    };
    this.onDataCallback(ggaData);

    // Generate depth data (SDDBT)
    const depth = 15 + Math.random() * 30; // 15-45 meters
    const dbtData: NMEAData = {
      id: crypto.randomUUID(),
      timestamp: now,
      depth: depth,
      rawSentence: this.generateDBTSentence(depth)
    };
    this.onDataCallback(dbtData);

    // Generate water temperature (SDMTW)
    const waterTemp = 18 + Math.random() * 8; // 18-26°C
    const mtwData: NMEAData = {
      id: crypto.randomUUID(),
      timestamp: now,
      waterTemperature: waterTemp,
      rawSentence: this.generateMTWSentence(waterTemp)
    };
    this.onDataCallback(mtwData);

    // Generate wind data (SDMWV)
    const windSpeed = 5 + Math.random() * 15; // 5-20 knots
    const windDirection = Math.random() * 360;
    const mwvData: NMEAData = {
      id: crypto.randomUUID(),
      timestamp: now,
      windSpeed: windSpeed,
      windDirection: windDirection,
      rawSentence: this.generateMWVSentence(windDirection, windSpeed)
    };
    this.onDataCallback(mwvData);

    // Generate meteorological data (SDMDA)
    const airTemp = 20 + Math.random() * 10; // 20-30°C
    const pressure = 1010 + Math.random() * 20; // 1010-1030 hPa
    const mdaData: NMEAData = {
      id: crypto.randomUUID(),
      timestamp: now,
      airTemperature: airTemp,
      waterTemperature: waterTemp,
      pressure: pressure,
      windSpeed: windSpeed,
      windDirection: windDirection,
      rawSentence: this.generateMDASentence(pressure, airTemp, waterTemp, windSpeed, windDirection)
    };
    this.onDataCallback(mdaData);
  }

  private generateGGASentence(lat: number, lon: number, time: Date): string {
    const timeStr = time.toTimeString().slice(0, 8).replace(/:/g, '');
    const ns = lat >= 0 ? 'N' : 'S';
    const ew = lon >= 0 ? 'E' : 'W';
    const latStr = this.formatLatitude(Math.abs(lat));
    const lonStr = this.formatLongitude(Math.abs(lon));
    const core = `$GPGGA,${timeStr},${latStr},${ns},${lonStr},${ew},1,08,1.0,545.4,M,46.9,M,,`;
    return this.appendChecksum(core);
  }

  private generateDBTSentence(depth: number): string {
    const feet = depth * 3.28084;
    const fathoms = depth * 0.546807;
    const core = `$SDDBT,${feet.toFixed(1)},f,${depth.toFixed(1)},M,${fathoms.toFixed(1)},F`;
    return this.appendChecksum(core);
  }

  private generateMTWSentence(temp: number): string {
    const core = `$SDMTW,${temp.toFixed(1)},C`;
    return this.appendChecksum(core);
  }

  private generateMWVSentence(direction: number, speed: number): string {
    const core = `$SDMWV,${direction.toFixed(1)},T,${speed.toFixed(1)},N,A`;
    return this.appendChecksum(core);
  }

  private generateMDASentence(pressure: number, airTemp: number, waterTemp: number, windSpeed: number, windDirection: number): string {
    const core = `$SDMDA,${pressure.toFixed(1)},I,${airTemp.toFixed(1)},C,${waterTemp.toFixed(1)},C,,,,,,,,,${windSpeed.toFixed(1)},N,${windDirection.toFixed(1)},M`;
    return this.appendChecksum(core);
  }

  private formatLatitude(lat: number): string {
    const degrees = Math.floor(Math.abs(lat));
    const minutes = (Math.abs(lat) - degrees) * 60;
    return `${degrees.toString().padStart(2, '0')}${minutes.toFixed(4)}`;
  }

  private formatLongitude(lon: number): string {
    const degrees = Math.floor(Math.abs(lon));
    const minutes = (Math.abs(lon) - degrees) * 60;
    return `${degrees.toString().padStart(3, '0')}${minutes.toFixed(4)}`;
  }

  private appendChecksum(sentenceWithDollarNoChecksum: string): string {
    // Compute XOR of all chars between $ and * (we don't have * yet)
    let checksum = 0;
    for (let i = 1; i < sentenceWithDollarNoChecksum.length; i++) {
      checksum ^= sentenceWithDollarNoChecksum.charCodeAt(i);
    }
    const hex = checksum.toString(16).toUpperCase().padStart(2, '0');
    return `${sentenceWithDollarNoChecksum}*${hex}`;
  }

  isSimulationRunning(): boolean {
    return this.isRunning;
  }
}

export const testDataService = TestDataService.getInstance();
