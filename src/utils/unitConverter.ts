import { AppSettings } from '../types';

export class UnitConverter {
  private static settings: AppSettings | null = null;

  static setSettings(settings: AppSettings | null) {
    this.settings = settings;
  }

  // Temperature conversions
  static convertTemperature(celsius: number): number {
    if (!this.settings || this.settings.units.temperature === 'celsius') {
      return celsius;
    }
    return (celsius * 9/5) + 32; // Convert to Fahrenheit
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
      return meters;
    }
    return meters * 3.28084; // Convert to feet
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
      return cm;
    }
    return cm * 0.393701; // Convert to inches
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
      return kg;
    }
    return kg * 2.20462; // Convert to pounds
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
      return hpa;
    }
    return hpa * 0.02953; // Convert to inHg
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
      return knots;
    }
    return knots * 1.15078; // Convert to mph
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
      return nauticalMiles * 1.852; // Convert to km
    }
    return nauticalMiles * 1.15078; // Convert to miles
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
}
