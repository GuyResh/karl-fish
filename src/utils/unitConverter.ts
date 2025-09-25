import { AppSettings } from '../types';

export class UnitConverter {
  private static settings: AppSettings | null = null;

  static setSettings(settings: AppSettings | null) {
    this.settings = settings;
  }

  // Temperature conversions
  static convertTemperature(celsius: number): number {
    if (!this.settings || this.settings.units.temperature === 'celsius') {
      return Math.round(celsius * 10) / 10;
    }
    return Math.round(((celsius * 9/5) + 32) * 10) / 10; // Convert to Fahrenheit
  }

  static getTemperatureUnit(): string {
    if (!this.settings || this.settings.units.temperature === 'celsius') {
      return '°C';
    }
    return '°F';
  }

  static getTemperatureLabel(): string {
    if (!this.settings || this.settings.units.temperature === 'celsius') {
      return 'Temperature (°C)';
    }
    return 'Temperature (°F)';
  }

  // Distance conversions
  static convertDistance(meters: number): number {
    if (!this.settings || this.settings.units.distance === 'metric') {
      return Math.round(meters * 10) / 10;
    }
    return Math.round((meters * 3.28084) * 10) / 10; // Convert to feet
  }

  static getDistanceUnit(): string {
    if (!this.settings || this.settings.units.distance === 'metric') {
      return 'm';
    }
    return 'ft';
  }

  static getDistanceLabel(): string {
    if (!this.settings || this.settings.units.distance === 'metric') {
      return 'Depth (m)';
    }
    return 'Depth (ft)';
  }

  // Length conversions (for fish length)
  static convertLength(cm: number): number {
    if (!this.settings || this.settings.units.distance === 'metric') {
      return Math.round(cm * 10) / 10;
    }
    return Math.round((cm * 0.393701) * 10) / 10; // Convert to inches
  }

  static getLengthUnit(): string {
    if (!this.settings || this.settings.units.distance === 'metric') {
      return 'cm';
    }
    return 'in';
  }

  static getLengthLabel(): string {
    if (!this.settings || this.settings.units.distance === 'metric') {
      return 'Length (cm)';
    }
    return 'Length (in)';
  }

  // Weight conversions (for fish weight)
  static convertWeight(kg: number): number {
    if (!this.settings || this.settings.units.weight === 'metric') {
      return Math.round(kg * 10) / 10;
    }
    return Math.round((kg * 2.20462) * 10) / 10; // Convert to pounds
  }

  static getWeightUnit(): string {
    if (!this.settings || this.settings.units.weight === 'metric') {
      return 'kg';
    }
    return 'lbs';
  }

  static getWeightLabel(): string {
    if (!this.settings || this.settings.units.weight === 'metric') {
      return 'Weight (kg)';
    }
    return 'Weight (lbs)';
  }

  // Pressure conversions
  static convertPressure(hpa: number): number {
    if (!this.settings || this.settings.units.pressure === 'hpa') {
      return Math.round(hpa * 10) / 10;
    }
    return Math.round((hpa * 0.02953) * 10) / 10; // Convert to inHg
  }

  static getPressureUnit(): string {
    if (!this.settings || this.settings.units.pressure === 'hpa') {
      return 'hPa';
    }
    return 'inHg';
  }

  static getPressureLabel(): string {
    if (!this.settings || this.settings.units.pressure === 'hpa') {
      return 'Pressure (hPa)';
    }
    return 'Pressure (inHg)';
  }

  // Speed conversions (for wind speed)
  static convertSpeed(knots: number): number {
    if (!this.settings || this.settings.units.distance === 'metric') {
      return Math.round(knots * 10) / 10;
    }
    return Math.round((knots * 1.15078) * 10) / 10; // Convert to mph
  }

  static getSpeedUnit(): string {
    if (!this.settings || this.settings.units.distance === 'metric') {
      return 'kts';
    }
    return 'mph';
  }

  static getSpeedLabel(): string {
    if (!this.settings || this.settings.units.distance === 'metric') {
      return 'Wind Speed (kts)';
    }
    return 'Wind Speed (mph)';
  }

  // Visibility conversions
  static convertVisibility(nauticalMiles: number): number {
    if (!this.settings || this.settings.units.distance === 'metric') {
      return Math.round((nauticalMiles * 1.852) * 10) / 10; // Convert to km
    }
    return Math.round((nauticalMiles * 1.15078) * 10) / 10; // Convert to miles
  }

  static getVisibilityUnit(): string {
    if (!this.settings || this.settings.units.distance === 'metric') {
      return 'km';
    }
    return 'mi';
  }

  static getVisibilityLabel(): string {
    if (!this.settings || this.settings.units.distance === 'metric') {
      return 'Visibility (km)';
    }
    return 'Visibility (mi)';
  }

  // Reverse conversions (from display units back to storage units)
  static convertToStorageTemperature(displayTemp: number): number {
    if (!this.settings || this.settings.units.temperature === 'celsius') {
      return Math.round(displayTemp * 10) / 10;
    }
    return Math.round(((displayTemp - 32) * 5/9) * 10) / 10; // Convert from Fahrenheit to Celsius
  }

  static convertToStorageLength(displayLength: number): number {
    if (!this.settings || this.settings.units.distance === 'metric') {
      return Math.round(displayLength * 10) / 10;
    }
    return Math.round((displayLength / 0.393701) * 10) / 10; // Convert from inches to cm
  }

  static convertToStorageWeight(displayWeight: number): number {
    if (!this.settings || this.settings.units.weight === 'metric') {
      return Math.round(displayWeight * 10) / 10;
    }
    return Math.round((displayWeight / 2.20462) * 10) / 10; // Convert from pounds to kg
  }

  static convertToStoragePressure(displayPressure: number): number {
    if (!this.settings || this.settings.units.pressure === 'hpa') {
      return Math.round(displayPressure * 10) / 10;
    }
    return Math.round((displayPressure / 0.02953) * 10) / 10; // Convert from inHg to hPa
  }

  static convertToStorageSpeed(displaySpeed: number): number {
    if (!this.settings || this.settings.units.distance === 'metric') {
      return Math.round(displaySpeed * 10) / 10;
    }
    return Math.round((displaySpeed / 1.15078) * 10) / 10; // Convert from mph to knots
  }

  static convertToStorageVisibility(displayVisibility: number): number {
    if (!this.settings || this.settings.units.distance === 'metric') {
      return Math.round((displayVisibility / 1.852) * 10) / 10; // Convert from km to nautical miles
    }
    return Math.round((displayVisibility / 1.15078) * 10) / 10; // Convert from miles to nautical miles
  }

  // Depth conversions
  static convertDepth(meters: number): number {
    if (!this.settings || this.settings.units.distance === 'metric') {
      return Math.round(meters * 10) / 10;
    }
    return Math.round((meters * 3.28084) * 10) / 10; // Convert to feet
  }

  static getDepthUnit(): string {
    if (!this.settings || this.settings.units.distance === 'metric') {
      return 'm';
    }
    return 'ft';
  }

  static getDepthLabel(): string {
    if (!this.settings || this.settings.units.distance === 'metric') {
      return 'Depth (m)';
    }
    return 'Depth (ft)';
  }

  static convertToStorageDepth(displayDepth: number): number {
    if (!this.settings || this.settings.units.distance === 'metric') {
      return Math.round(displayDepth * 10) / 10;
    }
    return Math.round((displayDepth / 3.28084) * 10) / 10; // Convert from feet to meters
  }
}
