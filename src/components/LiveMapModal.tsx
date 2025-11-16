import React, { useState, useEffect } from 'react';
import { Navigation, X, MapPin, RefreshCw } from 'lucide-react';
import LeafletMap, { CatchLocation } from './LeafletMap';

interface LiveMapModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LiveMapModal: React.FC<LiveMapModalProps> = ({ isOpen, onClose }) => {
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Get current GPS location
  const getCurrentLocation = () => {
    setIsLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      setIsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setIsLoading(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        setError('Unable to get your location. Please check your browser permissions.');
        setIsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  };

  // Get location when modal opens
  useEffect(() => {
    if (isOpen && !currentLocation) {
      getCurrentLocation();
    }
  }, [isOpen]);

  // Create catch location for current GPS position
  const getCatchLocation = (): CatchLocation | null => {
    if (!currentLocation) return null;
    
    return {
      id: 'current-location',
      latitude: currentLocation.lat,
      longitude: currentLocation.lng,
      species: 'Current Location',
      location: {
        description: 'Your current GPS location'
      }
    };
  };

  const catchLocation = getCatchLocation();

  return (
    <div className="map-modal-overlay" onClick={onClose}>
      <div className="map-modal" onClick={(e) => e.stopPropagation()}>
        <div className="map-modal-header">
          <div className="map-modal-title">
            <Navigation size={20} />
            <span>Live GPS Map</span>
          </div>
          <div className="map-modal-actions">
            <button 
              onClick={getCurrentLocation}
              className="map-modal-refresh"
              title="Refresh location"
              disabled={isLoading}
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
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
            {error ? (
              <div className="map-error">
                <p>{error}</p>
                <button onClick={getCurrentLocation} className="btn btn-primary">
                  Try Again
                </button>
              </div>
            ) : catchLocation ? (
              <LeafletMap
                catches={[catchLocation]}
                center={[currentLocation!.lat, currentLocation!.lng]}
                zoom={8}
                height="100%"
                enableOfflineMode={true}
                showOfflineControl={true}
              />
            ) : (
              <div className="map-loading">
                <div className="loading-spinner"></div>
                <p>Getting your location...</p>
              </div>
            )}
          </div>
          
          {currentLocation && (
            <div className="map-coordinates">
              <div className="coordinate-item">
                <MapPin size={14} />
                <span>{currentLocation.lat.toFixed(4)}°N, {Math.abs(currentLocation.lng).toFixed(4)}°W</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveMapModal;