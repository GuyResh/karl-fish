#!/usr/bin/env python3
"""
NMEA 2000 PGN Simulator
Simulates YDWG-02 gateway output in Actisense NGT-1 ASCII format over WebSocket.

This script serves PGN messages exactly as the YDWG-02 does, allowing testing
of the Android app before deployment on the boat.

The app uses WebSocket (ws://) for connection, so this simulator supports WebSocket
to match the app's connection method.

Usage:
    python src/n2k/simulator.py [--host HOST] [--port PORT]

Default: listens on 192.168.1.200:2000

Requirements:
    pip install websockets
"""

import asyncio
import time
import datetime
import struct
import math
import argparse
import random
import websockets
from websockets.server import serve

# NMEA 2000 PGN definitions
PGN_POSITION_RAPID_UPDATE = 129025
PGN_WIND_DATA = 130306
PGN_WATER_DEPTH = 128267
PGN_VESSEL_HEADING = 127250
PGN_ENGINE_PARAMETERS = 127488
PGN_ENVIRONMENTAL_PARAMETERS = 130310
PGN_ENGINE_RPM = 127258
PGN_FLUID_LEVEL = 127505

# Default values for simulation
DEFAULT_LATITUDE = 41.0  # Nantucket Sound area
DEFAULT_LONGITUDE = -70.8
DEFAULT_HEADING = 180.0  # degrees
DEFAULT_DEPTH = 12.0  # meters
DEFAULT_WIND_SPEED = 8.5  # knots
DEFAULT_WIND_ANGLE = 45.0  # degrees
DEFAULT_TEMPERATURE = 20.0  # Celsius
DEFAULT_PRESSURE = 1013.25  # hPa
DEFAULT_ENGINE_RPM = 1200
DEFAULT_ENGINE_TEMP = 85.0  # Celsius
DEFAULT_ENGINE_PRESSURE = 4.5  # bar
DEFAULT_FUEL_LEVEL = 75.0  # percent


class NMEA2000Simulator:
  def __init__(self, host='192.168.1.200', port=2000):
    self.host = host
    self.port = port
    self.clients = set()
    
    # Simulation state
    self.latitude = DEFAULT_LATITUDE
    self.longitude = DEFAULT_LONGITUDE
    self.heading = DEFAULT_HEADING
    self.depth = DEFAULT_DEPTH
    self.wind_speed = DEFAULT_WIND_SPEED
    self.wind_angle = DEFAULT_WIND_ANGLE
    self.temperature = DEFAULT_TEMPERATURE
    self.pressure = DEFAULT_PRESSURE
    self.engine_rpm = DEFAULT_ENGINE_RPM
    self.engine_temp = DEFAULT_ENGINE_TEMP
    self.engine_pressure = DEFAULT_ENGINE_PRESSURE
    self.fuel_level = DEFAULT_FUEL_LEVEL
    
    # Source address (typical for GPS/NMEA devices)
    self.source_addr = 204
    self.destination_addr = 255  # Broadcast
    
  def encode_signed_int32(self, value, scale=1e7):
    """Encode signed 32-bit integer with scale factor."""
    raw = int(value * scale)
    # Handle two's complement for signed 32-bit
    if raw < 0:
      raw = (1 << 32) + raw
    return struct.pack('<I', raw & 0xFFFFFFFF)
  
  def encode_unsigned_int32(self, value, scale=100):
    """Encode unsigned 32-bit integer with scale factor."""
    raw = int(value * scale)
    return struct.pack('<I', raw & 0xFFFFFFFF)
  
  def encode_unsigned_int16(self, value, scale=10000):
    """Encode unsigned 16-bit integer with scale factor."""
    raw = int(value * scale)
    return struct.pack('<H', raw & 0xFFFF)
  
  def encode_signed_int16(self, value, scale=100):
    """Encode signed 16-bit integer with scale factor."""
    raw = int(value * scale)
    # Handle two's complement for signed 16-bit
    if raw < 0:
      raw = (1 << 16) + raw
    return struct.pack('<H', raw & 0xFFFF)
  
  def format_actisense(self, timestamp, priority, pgn, src, dst, data_bytes):
    """Format message in Actisense NGT-1 ASCII format."""
    data_hex = ','.join([f'{b:02x}' for b in data_bytes])
    return f"{timestamp},{priority},{pgn},{src},{dst},{len(data_bytes)},{data_hex}\n"
  
  def generate_position_rapid_update(self):
    """Generate PGN 129025 - Position, Rapid Update."""
    # Latitude: 4 bytes, signed, 1e-7 degrees
    # Longitude: 4 bytes, signed, 1e-7 degrees
    lat_bytes = self.encode_signed_int32(self.latitude, 1e7)
    lon_bytes = self.encode_signed_int32(self.longitude, 1e7)
    data = lat_bytes + lon_bytes
    
    timestamp = datetime.datetime.now(datetime.UTC).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
    return self.format_actisense(timestamp, 2, PGN_POSITION_RAPID_UPDATE, 
                                 self.source_addr, self.destination_addr, data)
  
  def generate_wind_data(self):
    """Generate PGN 130306 - Wind Data."""
    # Wind Speed: 2 bytes, unsigned, 0.01 m/s
    # Wind Angle: 2 bytes, unsigned, 0.0001 radians
    wind_speed_ms = self.wind_speed / 1.94384  # Convert knots to m/s
    wind_angle_rad = math.radians(self.wind_angle)
    
    speed_bytes = self.encode_unsigned_int16(wind_speed_ms, 100)
    angle_bytes = self.encode_unsigned_int16(wind_angle_rad, 10000)
    data = speed_bytes + angle_bytes
    
    timestamp = datetime.datetime.now(datetime.UTC).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
    return self.format_actisense(timestamp, 2, PGN_WIND_DATA, 
                                 self.source_addr, self.destination_addr, data)
  
  def generate_water_depth(self):
    """Generate PGN 128267 - Water Depth."""
    # Depth: 4 bytes, unsigned, 0.01 m
    depth_bytes = self.encode_unsigned_int32(self.depth, 100)
    # Add offset (2 bytes) and max range (2 bytes) - set to 0 for simplicity
    data = depth_bytes + b'\x00\x00\x00\x00'
    
    timestamp = datetime.datetime.now(datetime.UTC).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
    return self.format_actisense(timestamp, 2, PGN_WATER_DEPTH, 
                                 self.source_addr, self.destination_addr, data)
  
  def generate_vessel_heading(self):
    """Generate PGN 127250 - Vessel Heading."""
    # Heading: 2 bytes, unsigned, 0.0001 radians
    heading_rad = math.radians(self.heading)
    heading_bytes = self.encode_unsigned_int16(heading_rad, 10000)
    # Add deviation and variation (2 bytes each) - set to 0x7FFF (not available)
    data = heading_bytes + b'\xff\x7f\xff\x7f'
    
    timestamp = datetime.datetime.now(datetime.UTC).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
    return self.format_actisense(timestamp, 2, PGN_VESSEL_HEADING, 
                                 self.source_addr, self.destination_addr, data)
  
  def generate_environmental_parameters(self):
    """Generate PGN 130310 - Environmental Parameters."""
    # Temperature: 2 bytes, signed, 0.01°C
    # Pressure: 2 bytes, unsigned, 1 Pa
    temp_bytes = self.encode_signed_int16(self.temperature, 100)
    pressure_pa = int(self.pressure * 100)  # Convert hPa to Pa
    pressure_bytes = struct.pack('<H', pressure_pa & 0xFFFF)
    data = temp_bytes + pressure_bytes
    
    timestamp = datetime.datetime.now(datetime.UTC).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
    return self.format_actisense(timestamp, 2, PGN_ENVIRONMENTAL_PARAMETERS, 
                                 self.source_addr, self.destination_addr, data)
  
  def generate_engine_rpm(self):
    """Generate PGN 127258 - Engine RPM."""
    # RPM: 2 bytes, unsigned, 0.25 RPM
    rpm_raw = int(self.engine_rpm * 4)
    rpm_bytes = struct.pack('<H', rpm_raw & 0xFFFF)
    data = rpm_bytes
    
    timestamp = datetime.datetime.now(datetime.UTC).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
    return self.format_actisense(timestamp, 2, PGN_ENGINE_RPM, 
                                 self.source_addr, self.destination_addr, data)
  
  def generate_engine_parameters(self):
    """Generate PGN 127488 - Engine Parameters."""
    # Engine Temperature: 2 bytes, signed, 0.01°C
    # Engine Pressure: 2 bytes, unsigned, 0.1 kPa (1 bar = 100 kPa)
    temp_bytes = self.encode_signed_int16(self.engine_temp, 100)
    pressure_kpa = int(self.engine_pressure * 100)  # Convert bar to kPa
    pressure_raw = int(pressure_kpa * 10)  # Scale by 0.1
    pressure_bytes = struct.pack('<H', pressure_raw & 0xFFFF)
    data = temp_bytes + pressure_bytes
    
    timestamp = datetime.datetime.now(datetime.UTC).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
    return self.format_actisense(timestamp, 2, PGN_ENGINE_PARAMETERS, 
                                 self.source_addr, self.destination_addr, data)
  
  def generate_fluid_level(self):
    """Generate PGN 127505 - Fluid Level."""
    # Fuel Level: 2 bytes, unsigned, 0.004% (1/250)
    fuel_raw = int(self.fuel_level * 250)
    fuel_bytes = struct.pack('<H', fuel_raw & 0xFFFF)
    # Add tank capacity (4 bytes) - set to 0 (not specified)
    data = fuel_bytes + b'\x00\x00\x00\x00'
    
    timestamp = datetime.datetime.now(datetime.UTC).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
    return self.format_actisense(timestamp, 2, PGN_FLUID_LEVEL, 
                                 self.source_addr, self.destination_addr, data)
  
  def update_simulation_state(self):
    """Update simulation state with slight variations to simulate real data."""
    # Add small random variations to simulate real-world data
    self.latitude += random.uniform(-0.0001, 0.0001)  # ~11 meters
    self.longitude += random.uniform(-0.0001, 0.0001)
    self.heading = (self.heading + random.uniform(-2, 2)) % 360
    self.depth = max(1.0, self.depth + random.uniform(-0.5, 0.5))
    self.wind_speed = max(0, self.wind_speed + random.uniform(-0.5, 0.5))
    self.wind_angle = (self.wind_angle + random.uniform(-5, 5)) % 360
    self.temperature += random.uniform(-0.2, 0.2)
    self.pressure += random.uniform(-0.5, 0.5)
    self.engine_rpm = max(600, self.engine_rpm + random.uniform(-50, 50))
    self.engine_temp = max(70, min(95, self.engine_temp + random.uniform(-1, 1)))
    self.engine_pressure = max(3.0, min(6.0, self.engine_pressure + random.uniform(-0.1, 0.1)))
    self.fuel_level = max(0, min(100, self.fuel_level - random.uniform(0, 0.01)))  # Slowly decreasing
  
  async def register_client(self, websocket):
    """Register a new WebSocket client."""
    self.clients.add(websocket)
    client_addr = websocket.remote_address
    print(f"[CONNECT] Client connected from {client_addr[0]}:{client_addr[1]}")
    print(f"[INFO] Total connected clients: {len(self.clients)}")
    
    # Send initial burst of all PGNs
    messages = [
      self.generate_position_rapid_update(),
      self.generate_wind_data(),
      self.generate_water_depth(),
      self.generate_vessel_heading(),
      self.generate_environmental_parameters(),
      self.generate_engine_rpm(),
      self.generate_engine_parameters(),
      self.generate_fluid_level(),
    ]
    
    print(f"[SEND] Sending initial burst of {len(messages)} PGN messages to client")
    sent_count = 0
    for msg in messages:
      try:
        await websocket.send(msg.rstrip('\n'))  # Remove newline for WebSocket
        sent_count += 1
        await asyncio.sleep(0.01)
      except websockets.exceptions.ConnectionClosed:
        print(f"[ERROR] Connection closed while sending initial messages (sent {sent_count}/{len(messages)})")
        break
      except Exception as e:
        print(f"[ERROR] Error sending message: {e}")
        break
    
    if sent_count == len(messages):
      print(f"[SEND] Successfully sent all {sent_count} initial messages")
  
  async def unregister_client(self, websocket):
    """Unregister a WebSocket client."""
    client_addr = websocket.remote_address if hasattr(websocket, 'remote_address') else "unknown"
    self.clients.discard(websocket)
    if isinstance(client_addr, tuple):
      print(f"[DISCONNECT] Client disconnected: {client_addr[0]}:{client_addr[1]}")
    else:
      print(f"[DISCONNECT] Client disconnected: {client_addr}")
    print(f"[INFO] Remaining connected clients: {len(self.clients)}")
  
  async def handle_client(self, websocket, path):
    """Handle a WebSocket client connection."""
    print(f"[CONNECT] New connection attempt from {websocket.remote_address if hasattr(websocket, 'remote_address') else 'unknown'}")
    await self.register_client(websocket)
    try:
      # Keep connection alive and wait for close
      async for message in websocket:
        # Handle incoming messages if needed
        print(f"[RECV] Received message from client: {message[:100]}")  # Log first 100 chars
    except websockets.exceptions.ConnectionClosed as e:
      print(f"[DISCONNECT] Connection closed: {e}")
    except Exception as e:
      print(f"[ERROR] Error in client handler: {e}")
    finally:
      await self.unregister_client(websocket)
  
  async def broadcast_messages(self):
    """Continuously broadcast PGN messages to all connected clients."""
    cycle_count = 0
    while True:
      if self.clients:
        # Update simulation state
        self.update_simulation_state()
        
        # Generate all PGNs
        messages = [
          self.generate_position_rapid_update(),
          self.generate_wind_data(),
          self.generate_water_depth(),
          self.generate_vessel_heading(),
          self.generate_environmental_parameters(),
          self.generate_engine_rpm(),
          self.generate_engine_parameters(),
          self.generate_fluid_level(),
        ]
        
        cycle_count += 1
        if cycle_count % 10 == 0:  # Log every 10 cycles (~10 seconds)
          print(f"[BROADCAST] Broadcasting {len(messages)} PGNs to {len(self.clients)} client(s)")
        
        # Send to all connected clients
        disconnected = set()
        for websocket in self.clients.copy():
          for msg in messages:
            try:
              await websocket.send(msg.rstrip('\n'))  # Remove newline for WebSocket
              await asyncio.sleep(0.01)
            except websockets.exceptions.ConnectionClosed:
              disconnected.add(websocket)
              break
            except Exception as e:
              print(f"[ERROR] Error sending to client: {e}")
              disconnected.add(websocket)
              break
        
        # Remove disconnected clients
        for ws in disconnected:
          self.clients.discard(ws)
          print(f"[DISCONNECT] Removed disconnected client during broadcast")
      else:
        # Log when waiting for clients
        if cycle_count % 60 == 0:  # Log every 60 cycles (~1 minute) when no clients
          print(f"[WAIT] Waiting for clients to connect...")
      
      # Update rate: ~1 Hz for most PGNs (typical NMEA 2000 rate)
      await asyncio.sleep(1.0)
  
  async def start(self):
    """Start the WebSocket server."""
    print("=" * 60)
    print("NMEA 2000 PGN Simulator")
    print("=" * 60)
    print(f"[START] Starting WebSocket server on ws://{self.host}:{self.port}")
    print("[INFO] Serving PGN messages in Actisense NGT-1 ASCII format")
    print("[INFO] Supported PGNs:")
    print("  - 129025: Position, Rapid Update")
    print("  - 130306: Wind Data")
    print("  - 128267: Water Depth")
    print("  - 127250: Vessel Heading")
    print("  - 130310: Environmental Parameters")
    print("  - 127258: Engine RPM")
    print("  - 127488: Engine Parameters")
    print("  - 127505: Fluid Level")
    print("=" * 60)
    print("[INFO] Waiting for connections...")
    print("[INFO] Press Ctrl+C to stop\n")
    
    # Start message broadcast task
    broadcast_task = asyncio.create_task(self.broadcast_messages())
    
    try:
      async with serve(self.handle_client, self.host, self.port):
        print(f"[READY] Server is listening on {self.host}:{self.port}")
        await asyncio.Future()  # Run forever
    except OSError as e:
      print(f"[ERROR] Failed to start server: {e}")
      print(f"[ERROR] Check if port {self.port} is already in use or if you have permission to bind to {self.host}")
      raise
    except KeyboardInterrupt:
      print("\n[SHUTDOWN] Shutting down...")
    finally:
      broadcast_task.cancel()
      print("[STOP] Simulator stopped")


def main():
  parser = argparse.ArgumentParser(
    description='NMEA 2000 PGN Simulator - YDWG-02 compatible (WebSocket)',
    formatter_class=argparse.RawDescriptionHelpFormatter,
    epilog="""
Examples:
  python src/n2k/simulator.py
  python src/n2k/simulator.py --host 192.168.1.100 --port 2000

Note: The app uses WebSocket (ws://) for connection, so this simulator
supports WebSocket to match the app's connection method.
    """
  )
  parser.add_argument('--host', default='192.168.1.200',
                     help='Host to bind to (default: 192.168.1.200)')
  parser.add_argument('--port', type=int, default=2000,
                     help='Port to listen on (default: 2000)')
  
  args = parser.parse_args()
  
  simulator = NMEA2000Simulator(host=args.host, port=args.port)
  
  try:
    asyncio.run(simulator.start())
  except KeyboardInterrupt:
    print("\nShutting down...")


if __name__ == '__main__':
  main()
