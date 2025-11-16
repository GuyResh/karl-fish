# Check data format for YDWG-02 connection
_Exported on 11/16/2025 at 10:20:30 EST from Cursor (2.0.77)_

---

**User**

The YDWG-02 outputs in Actisense NGT-1 ASCII format over TCP, not raw CAN frames.  Does the current code expect and process that format when connected to the YDWG-02 or some other (raw?) format?

---

**Cursor**

I'll help you understand what format the current code expects when connecting to the YDWG-02. Let me search through the codebase to find the relevant code that handles data from the YDWG-02 device.


Now let me search more specifically for the Actisense format parsing and YDWG-02 connection handling:


Now let me read the full `parseActisenseFormat` method to understand exactly what format it expects:


Now let me also check the Settings component to see what the instructions say about the YDWG-02 configuration:


Based on my analysis of the code, I can now answer your question about the YDWG-02 data format expectations:

## Current Code Format Expectations

The current code **does expect and process the Actisense NGT-1 ASCII format** from the YDWG-02, not raw CAN frames. Here's what I found:

### 1. **Format Support**
The code in `src/services/nmea2000Service.ts` has a dedicated `parseActisenseFormat()` method that specifically handles the Actisense NGT-1 ASCII format. This method expects data in the format:
```
"timestamp,prio,pgn,src,dst,len,data..."
```
Example: `"2017-03-13T01:00:00.146Z,2,127245,204,255,8,fc,f8,ff,7f,ff,7f,ff,ff"`

### 2. **Data Processing Flow**
In the `handleNMEAData()` method (lines 114-149), the code:
1. First tries to parse incoming data as JSON (for test data)
2. If that fails, it falls back to parsing as Actisense format using `parseActisenseFormat()`
3. The Actisense parser extracts PGN data and converts hex bytes to meaningful values

### 3. **Configuration Instructions**
The Settings component (lines 235-236) instructs users to:
- Enable **TCP server** on port 2000
- Select **RAW protocol** (not NMEA 0183)

However, there's a **potential discrepancy** here: the instructions say "RAW protocol" but the code expects Actisense NGT-1 ASCII format, not raw CAN frames.

### 4. **Supported PGNs**
The code handles these NMEA 2000 PGNs in Actisense format:
- PGN 129025 - Position, Rapid Update
- PGN 130306 - Wind Data  
- PGN 128267 - Water Depth
- PGN 127250 - Vessel Heading
- PGN 130310 - Environmental Parameters
- PGN 127258 - Engine RPM

## Conclusion

The current code **correctly expects and processes the Actisense NGT-1 ASCII format** that the YDWG-02 outputs over TCP. The "RAW protocol" mentioned in the setup instructions likely refers to the YDWG-02's setting that outputs NMEA 2000 data in Actisense format rather than NMEA 0183 sentences, not actual raw CAN frames.

The implementation should work correctly with a YDWG-02 configured to output NGT-1 ASCII format over TCP.

```plaintext
"timestamp,prio,pgn,src,dst,len,data..."
```

---

**User**

where is the code that parses the PGN frames?

---

**Cursor**

Let me search for the code that parses PGN frames in the codebase.


Now let me read the complete `convertPgnToNmeaData` method to see all the PGN parsing logic:


Perfect! Now I have a complete picture of where the PGN frame parsing code is located. Let me also check if there are any other PGN parsing methods:


## PGN Frame Parsing Code Location

The PGN frame parsing code is located in **two main places**:

### 1. **Raw PGN Data Parsing** - `src/services/nmea2000Service.ts`

**Method: `parseActisenseFormat()` (lines 181-276)**
- Parses the raw Actisense NGT-1 ASCII format from the YDWG-02
- Extracts PGN numbers and converts hex data bytes to meaningful values
- Handles these PGNs:
  - **PGN 129025** - Position, Rapid Update (GPS coordinates)
  - **PGN 130306** - Wind Data (speed and direction)
  - **PGN 128267** - Water Depth
  - **PGN 127250** - Vessel Heading
  - **PGN 130310** - Environmental Parameters (temperature, pressure)
  - **PGN 127258** - Engine RPM
  - **PGN 127488** - Engine Parameters (temperature, pressure)

### 2. **PGN to NMEAData Conversion** - `src/services/nmea2000Service.ts`

**Method: `convertPgnToNmeaData()` (lines 278-377)**
- Takes the parsed PGN data and converts it to the application's `NMEAData` format
- Maps PGN-specific fields to standardized data structure
- Handles the same PGNs as above, plus:
  - **PGN 127505** - Fluid Level (fuel level)

### 3. **Data Flow**

The complete PGN parsing flow is:
1. **Raw data received** → `handleNMEAData()` (line 114)
2. **Parse Actisense format** → `parseActisenseFormat()` (line 126)
3. **Convert to NMEAData** → `convertPgnToNmeaData()` (line 133)
4. **Save to database** → `saveNMEAData()` (line 136)

### 4. **Additional PGN Generation** - `src/services/testDataService.ts`

There's also test data generation code that creates mock PGN data for testing purposes, but the main parsing logic is in the `nmea2000Service.ts` file.

The PGN parsing is specifically designed to handle the **Actisense NGT-1 ASCII format** that the YDWG-02 outputs over TCP, not raw CAN frames.

---

**User**

what other PGNs might be popular / in use on typical fishing boats?

---

**Cursor**

Let me search for information about popular PGNs used on fishing boats and also check what PGNs are already supported in the codebase.


Let me search for more specific information about additional PGNs that would be useful for fishing boats:


Based on my research and analysis of the current codebase, here are the **additional popular PGNs** that would be valuable for fishing boats beyond what's currently supported:

## Currently Supported PGNs ✅
- **PGN 129025** - Position, Rapid Update (GPS coordinates)
- **PGN 130306** - Wind Data (speed, direction)  
- **PGN 128267** - Water Depth
- **PGN 127250** - Vessel Heading
- **PGN 127488** - Engine Parameters (RPM, temp, pressure)
- **PGN 130310** - Environmental Parameters (temperature, pressure)
- **PGN 127258** - Engine RPM
- **PGN 127505** - Fluid Level (fuel, water, etc.)

## Additional Popular PGNs for Fishing Boats 🎣

### **Navigation & GPS**
- **PGN 129026** - COG & SOG, Rapid Update (Course/Speed Over Ground)
- **PGN 129283** - Cross Track Error (route deviation)
- **PGN 129284** - Navigation Data (bearing/distance to waypoints)
- **PGN 129285** - Navigation — Route/WP Information
- **PGN 129291** - Set & Drift, Rapid Update (current effects)
- **PGN 129539** - GNSS DOPs (GPS quality indicators)
- **PGN 129540** - GNSS Sats in View (satellite count)

### **Environmental & Weather**
- **PGN 130311** - Environmental Parameters (extended)
- **PGN 130312** - Temperature (dedicated temperature sensor)
- **PGN 130313** - Humidity
- **PGN 130314** - Actual Pressure (barometric)
- **PGN 130316** - Temperature, Extended Range

### **Engine & Power**
- **PGN 127489** - Engine Parameters, Dynamic (extended engine data)
- **PGN 127508** - Battery Status (voltage, current, temperature)
- **PGN 127750** - DC Detailed Status (battery bank details)

### **Speed & Performance**
- **PGN 128259** - Speed, Water Referenced (through water speed)
- **PGN 128260** - Distance Log (trip distance)

### **Safety & Communication**
- **PGN 129038** - AIS Class A Position Report
- **PGN 129039** - AIS Class B Position Report
- **PGN 129794** - AIS Class A Static and Voyage Related Data
- **PGN 129809** - AIS Class B "CS" Static Data Report

### **Fishing-Specific (if available)**
- **PGN 130820** - Water Temperature (dedicated sensor)
- **PGN 130821** - Water Salinity
- **PGN 130822** - Water pH
- **PGN 130823** - Water Dissolved Oxygen

## Most Valuable Additions for Fishing

For a fishing application, I'd recommend prioritizing:

1. **PGN 129026** - COG & SOG (navigation performance)
2. **PGN 128259** - Speed through water (fishing speed)
3. **PGN 127508** - Battery status (power management)
4. **PGN 130312** - Dedicated temperature sensor
5. **PGN 129291** - Set & Drift (current effects on fishing)
6. **PGN 129038/129039** - AIS data (safety and vessel awareness)

These would provide more comprehensive data for fishing operations, safety, and vessel performance monitoring.

---

**User**

Update the README.md to include all the PGNs mentioned in the "Planned Features" section so they're not lost

---

**Cursor**

I'll read the current README.md file to see the "Planned Features" section and then update it to include all the PGNs we discussed.


Now I'll update the README.md to include all the additional PGNs we discussed in the "Planned Features" section. I'll add a comprehensive list of planned NMEA 2000 PGNs to ensure they're not lost.


```markdown
# Karl Fish - Fishing Log Application

![Karl Fish](KarlFish.png)
![Karl Fish Share](KarlFishShare.png)

A comprehensive React-based fishing log application that can be deployed as a web app or desktop/tablet application using Tauri. Features integration with NMEA 2000 marine electronics networks for automatic data collection from all connected devices.

## Features

### 🎣 Core Functionality
- **Fishing Session Logging**: Record date, time, location, and environmental conditions
- **Fish Catch Tracking**: Log species, length, weight, condition, bait, and notes
- **Environmental Data**: Track weather conditions, water temperature, depth, and clarity
- **Location Services**: GPS integration for accurate position logging

### 📡 NMEA 2000 Integration
- **NMEA 2000 Network Support**: Automatic data collection from all connected marine electronics via N2K gateway
- **Real-time Data**: Live updates of position, depth, water temperature, weather, and engine data
- **Supported NMEA 2000 PGNs**:
  - PGN 129025 - Position, Rapid Update (GPS coordinates)
  - PGN 130306 - Wind Data (speed, direction)
  - PGN 128267 - Water Depth
  - PGN 127250 - Vessel Heading
  - PGN 127488 - Engine Parameters
  - PGN 130310 - Environmental Parameters (temperature, pressure)
  - PGN 127258 - Engine RPM
  - PGN 127505 - Fluid Level (fuel, water, etc.)

### 💾 Data Management
- **Local Storage**: IndexedDB for offline data storage with user-specific data isolation
- **Data Export**: CSV and JSON export options
- **Email Integration**: Send fishing logs via email
- **Statistics**: Comprehensive fishing statistics and reports
- **Search & Filter**: Find sessions by species, location, or notes
- **Cloud Sync**: Supabase integration for data synchronization and sharing

### 👥 Social Features
- **User Authentication**: Secure user accounts with email verification
- **Friend System**: Add friends and manage friend requests with comprehensive state management
- **Session Sharing**: Share fishing sessions with friends or make them public
- **Privacy Controls**: Control who can see your sessions (private, friends, public)
- **Angler Discovery**: Find and connect with other anglers
- **Interactive Sharing Dashboard**: Filter sessions by users and species with color-coded visualization
- **Live Map Integration**: Interactive Leaflet maps showing catch locations with clustering
- **Real-time Updates**: Live updates when friends share new sessions

### 🖥️ Deployment Options
- **Web Application**: Run in any modern browser
- **Desktop App**: Native desktop application using Tauri
- **Cross-platform**: Windows, macOS, and Linux support
- **Cloud Deployment**: Deploy to Vercel or GitHub Pages
- **Custom Domains**: Support for custom domain configuration

## Installation

### Prerequisites
- Node.js 16+ 
- Rust (for Tauri desktop builds)
- Git
- Supabase account (for cloud features)

### Web Application
```bash
# Clone the repository
git clone <repository-url>
cd karl-fish

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Start development server
npm run dev

# Build for production
npm run build

# Build for specific platforms
npm run build:vercel    # For Vercel deployment
npm run build:github    # For GitHub Pages deployment
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

## Environment Setup

### Supabase Configuration
1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings → API to get your project URL and anon key
3. Create a `.env.local` file in the project root:
```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```
4. Run the database schema setup:
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Copy and paste the contents of `db/supabase-schema.sql`
   - Execute the script to set up tables, functions, and policies

### Deployment

#### Vercel Deployment
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Deploy automatically on every push to main branch
4. Optionally add a custom domain in Vercel settings

#### GitHub Pages Deployment
1. Set up GitHub Actions secrets in your repository:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
2. Push to main branch to trigger automatic deployment
3. Your app will be available at `https://yourusername.github.io/karl-fish/`

## NMEA 2000 Setup

### 1. Gateway Configuration
1. Install a YDWG-02 or similar NMEA 2000 Wi-Fi gateway on your N2K network
2. Connect the gateway to your vessel's NMEA 2000 backbone
3. Power on the gateway and connect to its Wi-Fi network
4. Note the gateway's IP address (typically 192.168.4.1)

### 2. Application Configuration
1. Open Karl Fish application
2. Go to Settings → NMEA 2000 Integration
3. Enter the gateway IP address (default port: 2000)
4. Test the connection to verify data flow
5. Enable auto-connect for automatic data collection

### 3. Supported Data
The application automatically collects from all connected N2K devices:
- GPS position and speed (from GPS/Chartplotters)
- Water depth and temperature (from depth sounders)
- Air temperature and pressure (from weather stations)
- Wind speed and direction (from wind sensors)
- Engine data (RPM, fuel flow, temperature from engine sensors)
- Heading and course data (from compass/autopilot)

## Usage

### Creating a Fishing Session
1. Click "New Session" from the dashboard
2. Enter basic information (date, time, location)
3. Add environmental conditions (weather, water)
4. Log fish catches with details
5. Save the session

### NMEA 2000 Data Integration
1. Ensure NMEA 2000 gateway is connected and configured
2. Start a new fishing session
3. The app will automatically populate from all connected devices:
   - GPS coordinates (from GPS/Chartplotter)
   - Water depth and temperature (from depth sounder)
   - Weather conditions (from weather station)
   - Wind data (from wind sensor)
   - Engine parameters (from engine sensors)

### Data Export
1. Go to the Export page
2. Choose format (CSV or JSON)
3. Select date range (optional)
4. Download or email the data

### User Authentication & Social Features
1. **Create Account**: Click "Sign In" → "Create Account"
2. **Verify Email**: Check your email and click the confirmation link
3. **Add Friends**: Go to Friends page → Search for other anglers → Send friend requests
4. **Share Sessions**: Mark sessions as "shared" to make them visible to friends
5. **View Shared Sessions**: Go to Share page to see friends' fishing sessions with interactive filtering
6. **Interactive Maps**: View catch locations on interactive Leaflet maps with species color-coding
7. **Species Filtering**: Filter shared sessions by species with color-coded swatches
8. **Privacy Settings**: Control who can see your sessions (private, friends, public)

### Cloud Synchronization
1. **Automatic Sync**: Your data syncs to the cloud when you're online
2. **Offline Mode**: Continue logging sessions when offline - data syncs when reconnected
3. **User-Specific Data**: Each user's data is isolated and secure
4. **Cross-Device Access**: Access your data from any device with the same account

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

### NMEA 2000 Service
```typescript
// Connect to NMEA 2000 gateway
await nmea2000Service.connect('192.168.4.1', 2000);

// Check connection status
const status = nmea2000Service.getConnectionStatus();

// Disconnect
nmea2000Service.disconnect();
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
├── components/         # React components
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
- **Supabase** - Backend-as-a-Service (authentication, database, real-time)
- **PostgreSQL** - Cloud database with Row Level Security
- **Custom NMEA 2000 Parser** - Browser-compatible NMEA 2000 PGN parsing
- **Lucide React** - Icons
- **Date-fns** - Date utilities
- **Vite** - Build tool and development server
- **Leaflet + React-Leaflet** - Interactive maps with clustering and custom markers
- **Nodemailer** - Server-side email functionality

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

### ✅ Completed Features
- [x] User authentication and account management
- [x] Cloud synchronization with Supabase
- [x] Friend system and social features with comprehensive state management
- [x] Session sharing with privacy controls
- [x] Interactive sharing dashboard with user and species filtering
- [x] Leaflet map integration with catch location visualization
- [x] Color-coded species identification across all interfaces
- [x] Offline-first data storage
- [x] Cross-platform deployment (Vercel, GitHub Pages)
- [x] User-specific data isolation
- [x] Server-side email export via Vercel API

### 🚧 In Progress
- [ ] Real-time notifications for friend activity
- [ ] Advanced sharing filters and search
- [ ] Session collaboration features

### 📋 Planned Features
- [ ] Photo integration for fish catches
- [ ] Advanced analytics and charts
- [ ] Mobile app version (React Native)
- [ ] Additional NMEA 2000 device support
- [ ] Fishing spot recommendations
- [ ] Weather forecast integration
- [ ] Live fishing session streaming
- [ ] Tournament and competition features
- [ ] Fishing gear and tackle management
- [ ] Advanced mapping and GPS features

#### 🚢 Planned NMEA 2000 PGN Support
**Navigation & GPS:**
- [ ] PGN 129026 - COG & SOG, Rapid Update (Course/Speed Over Ground)
- [ ] PGN 129283 - Cross Track Error (route deviation)
- [ ] PGN 129284 - Navigation Data (bearing/distance to waypoints)
- [ ] PGN 129285 - Navigation — Route/WP Information
- [ ] PGN 129291 - Set & Drift, Rapid Update (current effects)
- [ ] PGN 129539 - GNSS DOPs (GPS quality indicators)
- [ ] PGN 129540 - GNSS Sats in View (satellite count)

**Environmental & Weather:**
- [ ] PGN 130311 - Environmental Parameters (extended)
- [ ] PGN 130312 - Temperature (dedicated temperature sensor)
- [ ] PGN 130313 - Humidity
- [ ] PGN 130314 - Actual Pressure (barometric)
- [ ] PGN 130316 - Temperature, Extended Range

**Engine & Power:**
- [ ] PGN 127489 - Engine Parameters, Dynamic (extended engine data)
- [ ] PGN 127508 - Battery Status (voltage, current, temperature)
- [ ] PGN 127750 - DC Detailed Status (battery bank details)

**Speed & Performance:**
- [ ] PGN 128259 - Speed, Water Referenced (through water speed)
- [ ] PGN 128260 - Distance Log (trip distance)

**Safety & Communication:**
- [ ] PGN 129038 - AIS Class A Position Report
- [ ] PGN 129039 - AIS Class B Position Report
- [ ] PGN 129794 - AIS Class A Static and Voyage Related Data
- [ ] PGN 129809 - AIS Class B "CS" Static Data Report

**Fishing-Specific (if available):**
- [ ] PGN 130820 - Water Temperature (dedicated sensor)
- [ ] PGN 130821 - Water Salinity
- [ ] PGN 130822 - Water pH
- [ ] PGN 130823 - Water Dissolved Oxygen


```

Perfect! I've successfully updated the README.md file to include a comprehensive "Planned NMEA 2000 PGN Support" section under the "Planned Features" area. This ensures that all the additional PGNs we discussed are documented and won't be lost.

The new section includes:

## **🚢 Planned NMEA 2000 PGN Support**

**Navigation & GPS:**
- 7 additional PGNs for enhanced navigation and GPS functionality

**Environmental & Weather:**
- 5 additional PGNs for comprehensive weather and environmental monitoring

**Engine & Power:**
- 3 additional PGNs for detailed engine and power system monitoring

**Speed & Performance:**
- 2 additional PGNs for speed and performance tracking

**Safety & Communication:**
- 4 additional PGNs for AIS and safety features

**Fishing-Specific:**
- 4 additional PGNs for specialized fishing-related water quality data

This organized list provides a clear roadmap for future NMEA 2000 PGN support and ensures that all the valuable PGNs we identified for fishing boats are properly documented and tracked for future implementation.

