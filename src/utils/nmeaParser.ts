import { NMEAData } from '../types';

export class NMEAParser {
  private static parseLatitude(lat: string, ns: string): number | undefined {
    if (!lat || !ns) return undefined;
    
    const degrees = parseInt(lat.substring(0, 2));
    const minutes = parseFloat(lat.substring(2));
    const decimal = degrees + (minutes / 60);
    
    return ns === 'S' ? -decimal : decimal;
  }

  private static parseLongitude(lon: string, ew: string): number | undefined {
    if (!lon || !ew) return undefined;
    
    const degrees = parseInt(lon.substring(0, 3));
    const minutes = parseFloat(lon.substring(3));
    const decimal = degrees + (minutes / 60);
    
    return ew === 'W' ? -decimal : decimal;
  }

  private static parseTime(time: string): Date {
    const now = new Date();
    const hours = parseInt(time.substring(0, 2));
    const minutes = parseInt(time.substring(2, 4));
    const seconds = parseInt(time.substring(4, 6));
    
    const date = new Date(now);
    date.setHours(hours, minutes, seconds, 0);
    return date;
  }

  private static parseGGA(sentence: string): Partial<NMEAData> {
    const parts = sentence.split(',');
    if (parts.length < 15) return { rawSentence: sentence };

    const data: Partial<NMEAData> = {
      rawSentence: sentence,
      timestamp: this.parseTime(parts[1]),
      latitude: this.parseLatitude(parts[2], parts[3]),
      longitude: this.parseLongitude(parts[4], parts[5]),
    };

    // GPS quality indicator
    const quality = parseInt(parts[6]);
    if (quality === 0) {
      // No GPS fix
      data.latitude = undefined;
      data.longitude = undefined;
    }

    return data;
  }

  private static parseRMC(sentence: string): Partial<NMEAData> {
    const parts = sentence.split(',');
    if (parts.length < 12) return { rawSentence: sentence };

    const data: Partial<NMEAData> = {
      rawSentence: sentence,
      timestamp: this.parseTime(parts[1]),
      latitude: this.parseLatitude(parts[3], parts[4]),
      longitude: this.parseLongitude(parts[5], parts[6]),
      speed: parts[7] ? parseFloat(parts[7]) : undefined,
      heading: parts[8] ? parseFloat(parts[8]) : undefined,
    };

    return data;
  }

  private static parseDBT(sentence: string): Partial<NMEAData> {
    const parts = sentence.split(',');
    if (parts.length < 4) return { rawSentence: sentence };

    return {
      rawSentence: sentence,
      depth: parts[3] ? parseFloat(parts[3]) : undefined,
    };
  }

  private static parseMTW(sentence: string): Partial<NMEAData> {
    const parts = sentence.split(',');
    if (parts.length < 3) return { rawSentence: sentence };

    return {
      rawSentence: sentence,
      waterTemperature: parts[1] ? parseFloat(parts[1]) : undefined,
    };
  }

  private static parseMDA(sentence: string): Partial<NMEAData> {
    const parts = sentence.split(',');
    if (parts.length < 15) return { rawSentence: sentence };

    return {
      rawSentence: sentence,
      pressure: parts[1] ? parseFloat(parts[1]) : undefined,
      airTemperature: parts[3] ? parseFloat(parts[3]) : undefined,
      waterTemperature: parts[4] ? parseFloat(parts[4]) : undefined,
      windSpeed: parts[7] ? parseFloat(parts[7]) : undefined,
      windDirection: parts[8] ? parseFloat(parts[8]) : undefined,
    };
  }

  private static parseMWV(sentence: string): Partial<NMEAData> {
    const parts = sentence.split(',');
    if (parts.length < 6) return { rawSentence: sentence };

    return {
      rawSentence: sentence,
      windSpeed: parts[3] ? parseFloat(parts[3]) : undefined,
      windDirection: parts[1] ? parseFloat(parts[1]) : undefined,
    };
  }

  private static parseVHW(sentence: string): Partial<NMEAData> {
    const parts = sentence.split(',');
    if (parts.length < 8) return { rawSentence: sentence };

    return {
      rawSentence: sentence,
      heading: parts[1] ? parseFloat(parts[1]) : undefined,
    };
  }

  private static parseVWR(sentence: string): Partial<NMEAData> {
    const parts = sentence.split(',');
    if (parts.length < 8) return { rawSentence: sentence };

    return {
      rawSentence: sentence,
      windSpeed: parts[3] ? parseFloat(parts[3]) : undefined,
      windDirection: parts[1] ? parseFloat(parts[1]) : undefined,
    };
  }

  static parse(sentence: string): NMEAData | null {
    if (!sentence || !sentence.startsWith('$')) {
      return null;
    }

    // Remove checksum and validate
    const parts = sentence.split('*');
    if (parts.length === 2) {
      const calculatedChecksum = this.calculateChecksum(parts[0]);
      const receivedChecksum = parseInt(parts[1], 16);
      if (calculatedChecksum !== receivedChecksum) {
        console.warn('NMEA checksum mismatch:', sentence);
        return null;
      }
    }

    const sentenceType = sentence.substring(1, 6);
    let parsedData: Partial<NMEAData> = { rawSentence: sentence };

    try {
      switch (sentenceType) {
        case 'GPGGA':
          parsedData = { ...parsedData, ...this.parseGGA(sentence) };
          break;
        case 'GPRMC':
          parsedData = { ...parsedData, ...this.parseRMC(sentence) };
          break;
        case 'SDDBT':
        case 'YDBT':
          parsedData = { ...parsedData, ...this.parseDBT(sentence) };
          break;
        case 'SDMTW':
        case 'YMTW':
          parsedData = { ...parsedData, ...this.parseMTW(sentence) };
          break;
        case 'SDMDA':
        case 'YMDA':
          parsedData = { ...parsedData, ...this.parseMDA(sentence) };
          break;
        case 'SDMWV':
        case 'YMWV':
          parsedData = { ...parsedData, ...this.parseMWV(sentence) };
          break;
        case 'SDVHW':
        case 'YVHW':
          parsedData = { ...parsedData, ...this.parseVHW(sentence) };
          break;
        case 'SDVWR':
        case 'YVWR':
          parsedData = { ...parsedData, ...this.parseVWR(sentence) };
          break;
        default:
          console.log('Unsupported NMEA sentence type:', sentenceType);
          return null;
      }
    } catch (error) {
      console.error('Error parsing NMEA sentence:', error, sentence);
      return null;
    }

    return parsedData as NMEAData;
  }

  private static calculateChecksum(sentence: string): number {
    let checksum = 0;
    for (let i = 1; i < sentence.length; i++) {
      checksum ^= sentence.charCodeAt(i);
    }
    return checksum;
  }

  static parseMultiple(sentences: string[]): NMEAData[] {
    return sentences
      .map(sentence => this.parse(sentence))
      .filter((data): data is NMEAData => data !== null);
  }
}
