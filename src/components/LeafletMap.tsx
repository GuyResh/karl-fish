import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in Leaflet with Vite
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import markerRetina from 'leaflet/dist/images/marker-icon-2x.png';

// Create custom icon
const defaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconRetinaUrl: markerRetina,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = defaultIcon;

export interface CatchLocation {
  id: string;
  latitude: number;
  longitude: number;
  species: string;
  userName?: string;
  sessionDate?: string;
  length?: number;
  weight?: number;
  location?: {
    description?: string;
  };
}

export interface LeafletMapProps {
  catches: CatchLocation[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  className?: string;
}

const LeafletMap: React.FC<LeafletMapProps> = ({
  catches,
  center,
  zoom = 4,
  height = '400px',
  className = ''
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Generate consistent colors for species
  const getSpeciesColor = (species: string): string => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
      '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2'
    ];
    
    let hash = 0;
    for (let i = 0; i < species.length; i++) {
      hash = species.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Create custom marker icon for species
  const createSpeciesIcon = (species: string) => {
    const color = getSpeciesColor(species);
    return L.divIcon({
      className: 'custom-marker',
      html: `<div style="
        background-color: ${color};
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: bold;
        color: white;
        text-shadow: 1px 1px 1px rgba(0,0,0,0.5);
      ">${species.charAt(0).toUpperCase()}</div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
  };

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Calculate center if not provided
    let mapCenter: [number, number];
    if (center) {
      mapCenter = center;
    } else if (catches.length > 0) {
      const avgLat = catches.reduce((sum, c) => sum + c.latitude, 0) / catches.length;
      const avgLng = catches.reduce((sum, c) => sum + c.longitude, 0) / catches.length;
      mapCenter = [avgLat, avgLng];
    } else {
      mapCenter = [41.0, -70.8]; // Default to Block Island area
    }

    // Create map
    const map = L.map(mapRef.current, {
      center: mapCenter,
      zoom: zoom,
      zoomControl: true,
      attributionControl: true
    });

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(map);

    mapInstanceRef.current = map;
    setMapLoaded(true);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update markers when catches change
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return;

    // Clear existing markers
    markersRef.current.forEach(marker => {
      mapInstanceRef.current?.removeLayer(marker);
    });
    markersRef.current = [];

    if (catches.length === 0) return;

    // Group catches by location for clustering
    const locationGroups: {[key: string]: CatchLocation[]} = {};
    catches.forEach(catch_ => {
      const key = `${catch_.latitude.toFixed(4)},${catch_.longitude.toFixed(4)}`;
      if (!locationGroups[key]) {
        locationGroups[key] = [];
      }
      locationGroups[key].push(catch_);
    });

    // Create markers for each location group
    Object.entries(locationGroups).forEach(([, locationCatches]) => {
      const firstCatch = locationCatches[0];
      const lat = firstCatch.latitude;
      const lng = firstCatch.longitude;

      // Get the most common species for this location
      const speciesCount: {[key: string]: number} = {};
      locationCatches.forEach(catch_ => {
        speciesCount[catch_.species] = (speciesCount[catch_.species] || 0) + 1;
      });
      const mostCommonSpecies = Object.entries(speciesCount).reduce((a, b) => 
        speciesCount[a[0]] > speciesCount[b[0]] ? a : b
      )[0];

      // Create marker
      const marker = L.marker([lat, lng], {
        icon: createSpeciesIcon(mostCommonSpecies)
      });

      // Create popup content
      const popupContent = `
        <div style="min-width: 200px;">
          <h4 style="margin: 0 0 8px 0; color: #333;">${locationCatches.length} catch${locationCatches.length > 1 ? 'es' : ''}</h4>
          <div style="margin-bottom: 8px;">
            <strong>Location:</strong> ${firstCatch.location?.description || 'Unknown'}<br>
            <strong>Coordinates:</strong> ${lat.toFixed(4)}°N, ${Math.abs(lng).toFixed(4)}°W
          </div>
          <div>
            <strong>Species:</strong><br>
            ${Object.entries(speciesCount)
              .map(([species, count]) => 
                `<span style="display: inline-block; margin: 2px 4px 2px 0; padding: 2px 6px; background-color: ${getSpeciesColor(species)}; color: white; border-radius: 3px; font-size: 11px;">${species} (${count})</span>`
              ).join('')}
          </div>
          ${locationCatches.length > 0 ? `
            <div style="margin-top: 8px; font-size: 12px; color: #666;">
              ${firstCatch.userName ? `Caught by: ${firstCatch.userName}<br>` : ''}
              ${firstCatch.sessionDate ? `Date: ${new Date(firstCatch.sessionDate).toLocaleDateString()}` : ''}
            </div>
          ` : ''}
        </div>
      `;

      marker.bindPopup(popupContent);
      if (mapInstanceRef.current) {
        marker.addTo(mapInstanceRef.current);
        markersRef.current.push(marker);
      }
    });

    // Fit map to show all markers
    if (catches.length > 0 && mapInstanceRef.current && markersRef.current.length > 0) {
      const group = L.featureGroup(markersRef.current);
      mapInstanceRef.current.fitBounds(group.getBounds().pad(0.1));
    }
  }, [catches, mapLoaded]);

  return (
    <div 
      ref={mapRef} 
      className={`leaflet-map ${className}`}
      style={{ height, width: '100%' }}
    />
  );
};

export default LeafletMap;
