# NMEA 2000 PGN Simulator

A Python-based simulator that mimics the YDWG-02 NMEA 2000 Wi-Fi gateway, serving PGN messages in Actisense NGT-1 ASCII format over TCP.

## Purpose

This simulator allows you to test the Android app's NMEA 2000 integration before deploying on the boat. It serves all the PGN messages that the app expects, formatted exactly as the YDWG-02 gateway outputs them.

## Supported PGNs

The simulator generates the following NMEA 2000 PGNs:

- **PGN 129025** - Position, Rapid Update (GPS coordinates)
- **PGN 130306** - Wind Data (speed and direction)
- **PGN 128267** - Water Depth
- **PGN 127250** - Vessel Heading
- **PGN 130310** - Environmental Parameters (temperature, pressure)
- **PGN 127258** - Engine RPM
- **PGN 127488** - Engine Parameters (temperature, pressure)
- **PGN 127505** - Fluid Level (fuel level)

## Requirements

- Python 3.7 or higher
- `websockets` library (install with: `pip install websockets`)

## Usage

### Basic Usage

```bash
python src/n2k/simulator.py
```

This will start the simulator listening on `192.168.1.200:2000` (default PC IP, port 2000).

### Custom Host/Port

```bash
python src/n2k/simulator.py --host 192.168.1.100 --port 2000
```

### Command Line Options

- `--host HOST` - Host to bind to (default: `192.168.1.200`)
- `--port PORT` - Port to listen on (default: `2000`)

## Connecting from Android App

1. Make sure your Android device/tablet is on the same network as the computer running the simulator
2. Find the IP address of the computer running the simulator
3. In the app's Settings, configure:
   - **NMEA 2000 IP Address**: The IP address of the computer (e.g., `192.168.1.100`)
   - **Port**: `2000`
4. Enable NMEA 2000 and connect

## Message Format

The simulator outputs messages in Actisense NGT-1 ASCII format, exactly as the YDWG-02 does:

```
timestamp,priority,pgn,source,destination,length,data...
```

Example:
```
2025-01-16T12:34:56.789Z,2,129025,204,255,8,8a,8c,0f,02,00,00,00,00
```

## Simulation Behavior

The simulator:
- Sends all supported PGNs at approximately 1 Hz
- Adds small random variations to simulate real-world data drift
- Supports multiple simultaneous client connections
- Automatically handles client disconnections

## Default Values

The simulator starts with realistic default values:
- **Position**: 41.0°N, 70.8°W (Nantucket Sound area)
- **Heading**: 180° (south)
- **Depth**: 12 meters
- **Wind Speed**: 8.5 knots
- **Wind Angle**: 45°
- **Temperature**: 20°C
- **Pressure**: 1013.25 hPa
- **Engine RPM**: 1200
- **Engine Temperature**: 85°C
- **Engine Pressure**: 4.5 bar
- **Fuel Level**: 75%

These values slowly vary over time to simulate realistic boat data.

## Stopping the Simulator

Press `Ctrl+C` to gracefully stop the simulator.

## Troubleshooting

### Connection Issues

- Ensure the Android device and computer are on the same network
- Check that the firewall allows connections on port 2000
- Verify the IP address is correct (use `ipconfig` on Windows or `ifconfig` on Linux/Mac)

### No Data Received

- Check that the simulator is running and shows "Client connected" when the app connects
- Verify the app is configured with the correct IP address and port
- Check the app's console logs for connection errors

## Notes

- The simulator uses **WebSocket** to match the app's connection method (`ws://`)
- The actual YDWG-02 uses raw TCP, but the app currently connects via WebSocket
- All data encoding follows NMEA 2000 specifications as implemented in the app's parser
- Messages are sent in Actisense NGT-1 ASCII format, exactly as YDWG-02 outputs them

