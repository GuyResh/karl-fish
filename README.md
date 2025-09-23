# Carl Fish - Fishing Log Application

A comprehensive React-based fishing log application that can be deployed as a web app or desktop application using Tauri. Features integration with Furuno multi-function displays for automatic data collection.

## Features

### 🎣 Core Functionality
- **Fishing Session Logging**: Record date, time, location, and environmental conditions
- **Fish Catch Tracking**: Log species, length, weight, condition, bait, and notes
- **Environmental Data**: Track weather conditions, water temperature, depth, and clarity
- **Location Services**: GPS integration for accurate position logging

### 📡 Furuno Integration
- **NMEA 0183/2000 Support**: Automatic data collection from Furuno unit via WiFi
- **Real-time Data**: Live updates of position, depth, water temperature, and weather
- **Supported NMEA Sentences**:
  - GPGGA - GPS Fix Data
  - GPRMC - Recommended Minimum
  - SDDBT/YDBT - Depth Below Transducer
  - SDMTW/YMTW - Water Temperature
  - SDMDA/YMDA - Meteorological Composite
  - SDMWV/YMWV - Wind Speed and Direction
  - SDVHW/YVHW - Water Speed and Heading
  - SDVWR/YVWR - Relative Wind Speed and Angle

### 💾 Data Management
- **Local Storage**: IndexedDB for offline data storage
- **Data Export**: CSV and JSON export options
- **Email Integration**: Send fishing logs via email
- **Statistics**: Comprehensive fishing statistics and reports
- **Search & Filter**: Find sessions by species, location, or notes

### 🖥️ Deployment Options
- **Web Application**: Run in any modern browser
- **Desktop App**: Native desktop application using Tauri
- **Cross-platform**: Windows, macOS, and Linux support

## Installation

### Prerequisites
- Node.js 16+ 
- Rust (for Tauri desktop builds)
- Git

### Web Application
```bash
# Clone the repository
git clone <repository-url>
cd carl-fish

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Desktop Application (Tauri)
```bash
# Install Tauri CLI
npm install -g @tauri-apps/cli

# Run in development mode
npm run tauri:dev

# Build desktop application
npm run tauri:build
```

## Furuno Setup

### 1. Network Configuration
1. Connect your Furuno unit to the same network as your device
2. Note the device's IP address from the Furuno network settings
3. Enable NMEA 0183 output on the Furuno device

### 2. Application Configuration
1. Open Carl Fish application
2. Go to Settings → Furuno Integration
3. Enter the Furuno device IP address (default port: 10110)
4. Test the connection to verify data flow
5. Enable auto-connect for automatic data collection

### 3. Supported Data
The application automatically collects:
- GPS position and speed
- Water depth and temperature
- Air temperature and pressure
- Wind speed and direction
- Heading and course data

## Usage

### Creating a Fishing Session
1. Click "New Session" from the dashboard
2. Enter basic information (date, time, location)
3. Add environmental conditions (weather, water)
4. Log fish catches with details
5. Save the session

### Furuno Data Integration
1. Ensure Furuno device is connected and configured
2. Start a new fishing session
3. The app will automatically populate:
   - GPS coordinates
   - Water depth and temperature
   - Weather conditions
   - Wind data

### Data Export
1. Go to the Export page
2. Choose format (CSV or JSON)
3. Select date range (optional)
4. Download or email the data

## Data Structure

### Fishing Session
```typescript
interface FishingSession {
  id: string;
  date: Date;
  startTime: Date;
  endTime?: Date;
  location: Location;
  weather: WeatherConditions;
  water: WaterConditions;
  catches: FishCatch[];
  notes?: string;
}
```

### Fish Catch
```typescript
interface FishCatch {
  id: string;
  species: string;
  length: number; // cm
  weight?: number; // kg
  condition: 'alive' | 'released' | 'kept' | 'dead';
  bait?: string;
  lure?: string;
  technique?: string;
  notes?: string;
}
```

## API Reference

### Furuno Service
```typescript
// Connect to Furuno device
await furunoService.connect('192.168.1.100', 10110);

// Check connection status
const status = furunoService.getConnectionStatus();

// Disconnect
furunoService.disconnect();
```

### Data Service
```typescript
// Create new session
const sessionId = await FishingDataService.createSession(sessionData);

// Get all sessions
const sessions = await FishingDataService.getAllSessions();

// Search sessions
const results = await FishingDataService.searchSessions('bass');

// Get statistics
const stats = await FishingDataService.getSessionStats();
```

## Development

### Project Structure
```
src/
├── components/          # React components
├── database/           # IndexedDB data layer
├── services/           # Business logic services
├── types/              # TypeScript interfaces
├── utils/              # Utility functions
└── App.tsx             # Main application component
```

### Key Technologies
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Dexie** - IndexedDB wrapper
- **Tauri** - Desktop app framework
- **Lucide React** - Icons
- **Date-fns** - Date utilities

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions:
1. Check the documentation
2. Search existing issues
3. Create a new issue with detailed information

## Roadmap

- [ ] Photo integration for fish catches
- [ ] Advanced analytics and charts
- [ ] Cloud synchronization
- [ ] Mobile app version
- [ ] Additional marine electronics support
- [ ] Fishing spot recommendations
- [ ] Weather forecast integration
