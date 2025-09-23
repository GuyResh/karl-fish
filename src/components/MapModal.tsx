import React from 'react';
import { X, MapPin } from 'lucide-react';

interface MapModalProps {
  isOpen: boolean;
  onClose: () => void;
  latitude: number;
  longitude: number;
}

const MapModal: React.FC<MapModalProps> = ({ isOpen, onClose, latitude, longitude }) => {
  if (!isOpen) return null;

  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${longitude-0.01},${latitude-0.01},${longitude+0.01},${latitude+0.01}&layer=mapnik&marker=${latitude},${longitude}`;

  return (
    <div className="map-modal-overlay" onClick={onClose}>
      <div className="map-modal" onClick={(e) => e.stopPropagation()}>
        <div className="map-modal-header">
          <div className="map-modal-title">
            <MapPin size={20} />
            <span>Location Map</span>
          </div>
          <button 
            onClick={onClose}
            className="map-modal-close"
            aria-label="Close map"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="map-modal-content">
          <div className="map-container">
            <iframe
              src={mapUrl}
              width="100%"
              height="400"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Location Map"
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
