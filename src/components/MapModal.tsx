import React, { useState } from 'react';
import { X, MapPin, RefreshCw } from 'lucide-react';

interface MapModalProps {
  isOpen: boolean;
  onClose: () => void;
  latitude: number;
  longitude: number;
}

const MapModal: React.FC<MapModalProps> = ({ isOpen, onClose, latitude, longitude }) => {
  const [useAltMap, setUseAltMap] = useState(false);
  
  if (!isOpen) return null;

  // Use a wider view with better zoom and ensure marker is visible
  // Try multiple approaches for better marker visibility
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${longitude-0.02},${latitude-0.02},${longitude+0.02},${latitude+0.02}&layer=mapnik&marker=${latitude},${longitude}&zoom=12`;
  
  // Alternative map URL with different marker approach
  const altMapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${longitude-0.02},${latitude-0.02},${longitude+0.02},${latitude+0.02}&layer=mapnik&mlat=${latitude}&mlon=${longitude}&zoom=12`;

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
              title="Location Map"
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapModal;
