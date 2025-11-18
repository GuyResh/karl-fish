#!/usr/bin/env python3
"""
NMEA 2000 Simulator Client
Simple WebSocket client for connecting to the NMEA 2000 simulator
and displaying received PGN messages.

Usage:
    python src/n2k/simclient.py [--host HOST] [--port PORT]

Default: connects to ws://192.168.1.200:2000
"""

import asyncio
import websockets
import argparse
import sys
from datetime import datetime


async def connect_and_display(host='192.168.1.200', port=2000):
  """Connect to the simulator and display messages."""
  uri = f"ws://{host}:{port}"
  
  print("=" * 60)
  print("NMEA 2000 Simulator Client")
  print("=" * 60)
  print(f"[CONNECT] Connecting to {uri}...")
  print("[INFO] Press Ctrl+C to disconnect\n")
  
  try:
    async with websockets.connect(uri) as websocket:
      print(f"[CONNECTED] Successfully connected to {uri}\n")
      print("[INFO] Waiting for messages...\n")
      print("-" * 60)
      
      message_count = 0
      
      async for message in websocket:
        message_count += 1
        timestamp = datetime.now().strftime('%H:%M:%S.%f')[:-3]
        
        # Parse the message (Actisense NGT-1 ASCII format)
        # Format: timestamp,priority,pgn,src,dst,length,data_hex
        parts = message.split(',')
        if len(parts) >= 6:
          msg_timestamp = parts[0]
          priority = parts[1]
          pgn = parts[2]
          src = parts[3]
          dst = parts[4]
          length = parts[5]
          data_hex = ','.join(parts[6:]) if len(parts) > 6 else ''
          
          # Map PGN to readable name
          pgn_names = {
            '129025': 'Position, Rapid Update',
            '130306': 'Wind Data',
            '128267': 'Water Depth',
            '127250': 'Vessel Heading',
            '130310': 'Environmental Parameters',
            '127258': 'Engine RPM',
            '127488': 'Engine Parameters',
            '127505': 'Fluid Level',
          }
          
          pgn_name = pgn_names.get(pgn, 'Unknown PGN')
          
          print(f"[{timestamp}] Message #{message_count}")
          print(f"  PGN: {pgn} ({pgn_name})")
          print(f"  Priority: {priority} | Src: {src} | Dst: {dst} | Length: {length}")
          print(f"  Data: {data_hex[:80]}{'...' if len(data_hex) > 80 else ''}")
          print("-" * 60)
        else:
          # Raw message if format is unexpected
          print(f"[{timestamp}] Message #{message_count}: {message[:100]}")
          print("-" * 60)
  
  except websockets.exceptions.ConnectionRefused:
    print(f"[ERROR] Connection refused. Is the simulator running on {host}:{port}?")
    sys.exit(1)
  except websockets.exceptions.InvalidURI:
    print(f"[ERROR] Invalid URI: {uri}")
    sys.exit(1)
  except OSError as e:
    print(f"[ERROR] Network error: {e}")
    print(f"[ERROR] Check if the simulator is running and accessible at {host}:{port}")
    sys.exit(1)
  except KeyboardInterrupt:
    print("\n[DISCONNECT] Disconnecting...")
    print(f"[INFO] Received {message_count} message(s) total")
  except Exception as e:
    print(f"[ERROR] Unexpected error: {e}")
    sys.exit(1)


def main():
  parser = argparse.ArgumentParser(
    description='NMEA 2000 Simulator Client - WebSocket client for testing the simulator',
    formatter_class=argparse.RawDescriptionHelpFormatter,
    epilog="""
Examples:
  python src/n2k/simclient.py
  python src/n2k/simclient.py --host 192.168.1.100 --port 2000
    """
  )
  parser.add_argument('--host', default='192.168.1.200',
                     help='Simulator host (default: 192.168.1.200)')
  parser.add_argument('--port', type=int, default=2000,
                     help='Simulator port (default: 2000)')
  
  args = parser.parse_args()
  
  try:
    asyncio.run(connect_and_display(args.host, args.port))
  except KeyboardInterrupt:
    print("\nShutting down...")


if __name__ == '__main__':
  main()
