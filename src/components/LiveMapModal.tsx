import React, { useState, useEffect } from 'react';
import { Navigation, X, MapPin, RefreshCw } from 'lucide-react';
import { nmea2000Service } from '../services/nmea2000Service';
import { FishingDataService } from '../database';

interface LiveMapModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LiveMapModal: React.FC<LiveMapModalProps> = ({ isOpen, onClose }) => {
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [useAltMap, setUseAltMap] = useState(false);

  // console.log('LiveMapModal rendered, isOpen:', isOpen);

  useEffect(() => {
    if (!isOpen) return;

    // Check connection status
        const status = nmea2000Service.getConnectionStatus();
    setIsConnected(status.connected);

    // Set up location update listener
    const updateLocation = async () => {
      // Get the latest NMEA data from the database
      const latestLocation = await getLatestLocation();
      if (latestLocation) {
        setCurrentLocation(latestLocation);
        setLastUpdate(new Date());
      }
    };

    // Update location every 2 seconds when connected
    const interval = setInterval(updateLocation, 2000);
    
    // Initial update
    updateLocation();

    return () => {
      clearInterval(interval);
    };
  }, [isOpen]);

  const getLatestLocation = async (): Promise<{ lat: number; lng: number } | null> => {
    try {
      const latestNmeaData = await FishingDataService.getLatestNMEAData();
      if (latestNmeaData && latestNmeaData.latitude && latestNmeaData.longitude) {
        return {
          lat: latestNmeaData.latitude,
          lng: latestNmeaData.longitude
        };
      }
    } catch (error) {
      console.error('Error getting latest NMEA data:', error);
    }
    
    // Fallback to sample location
    return {
      lat: 41.0, // Offshore fishing area (40+ miles east of Block Island)
      lng: -70.8
    };
  };

  if (!isOpen) return null;

  // Use the same map implementation as MapModal
  const latitude = currentLocation?.lat || 41.0;
  const longitude = currentLocation?.lng || -70.8;
  
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${longitude-0.02},${latitude-0.02},${longitude+0.02},${latitude+0.02}&layer=mapnik&marker=${latitude},${longitude}&zoom=12`;
  const altMapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${longitude-0.02},${latitude-0.02},${longitude+0.02},${latitude+0.02}&layer=mapnik&mlat=${latitude}&mlon=${longitude}&zoom=12`;

  return (
    <div className="map-modal-overlay" onClick={onClose}>
      <div className="map-modal" onClick={(e) => e.stopPropagation()}>
        <div className="map-modal-header">
          <div className="map-modal-title">
            <MapPin size={20} />
            <span>Live GPS Map</span>
            <div style={{
              marginLeft: '12px',
              padding: '4px 8px',
              background: isConnected ? '#10b981' : '#ef4444',
              color: 'white',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <div style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'white',
                animation: isConnected ? 'pulse 2s infinite' : 'none'
              }} />
              {isConnected ? 'GPS Connected' : 'GPS Disconnected'}
            </div>
          </div>
          <div className="map-modal-actions">
            <button 
              onClick={() => setUseAltMap(!useAltMap)}
              className="map-modal-refresh"
              title="Switch map view"
            >
              <RefreshCw size={16} />
            </button>
            <button 
              onClick={onClose}
              className="map-modal-close"
              aria-label="Close map"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        
        <div className="map-modal-content">
          <div className="map-container">
            <iframe
              src={useAltMap ? altMapUrl : mapUrl}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Live GPS Map"
              key={useAltMap ? 'alt' : 'main'}
            />
          </div>
          
          <div className="map-coordinates">
            <div className="coordinate-item">
              <strong>Latitude:</strong> {latitude.toFixed(6)}
            </div>
            <div className="coordinate-item">
              <strong>Longitude:</strong> {longitude.toFixed(6)}
            </div>
            {lastUpdate && (
              <div className="coordinate-item">
                <strong>Last Update:</strong> {lastUpdate.toLocaleTimeString()}
              </div>
            )}
            <div className="coordinate-item">
              <Navigation size={14} style={{ marginRight: '4px', display: 'inline' }} />
              <strong>Live Updates:</strong> Every 2 seconds
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveMapModal;
