import React from 'react';
import { X, MapPin } from 'lucide-react';
import LeafletMap, { CatchLocation } from './LeafletMap';

interface MapModalProps {
  isOpen: boolean;
  onClose: () => void;
  latitude: number;
  longitude: number;
}

const MapModal: React.FC<MapModalProps> = ({ isOpen, onClose, latitude, longitude }) => {
  if (!isOpen) return null;

  // Create a single catch location for the map
  const catchLocation: CatchLocation = {
    id: 'location-marker',
    latitude,
    longitude,
    species: 'Location',
    location: {
      description: 'Session Location'
    }
  };

  return (
    <div className="map-modal-overlay" onClick={onClose}>
      <div className="map-modal" onClick={(e) => e.stopPropagation()}>
        <div className="map-modal-header">
          <div className="map-modal-title">
            <MapPin size={20} />
            <span>Location Map</span>
          </div>
          <div className="map-modal-actions">
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
            <LeafletMap
              catches={[catchLocation]}
              center={[latitude, longitude]}
              zoom={8}
              height="100%"
            />
          </div>
          
          <div className="map-coordinates">
            <div className="coordinate-item">
              <MapPin size={14} />
              <span>{latitude.toFixed(4)}°N, {Math.abs(longitude).toFixed(4)}°W</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapModal;