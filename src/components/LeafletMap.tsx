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
  showCurrentLocation?: boolean;
}

const LeafletMap: React.FC<LeafletMapProps> = ({
  catches,
  center,
  zoom = 4,
  height = '400px',
  className = '',
  showCurrentLocation = false
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const currentLocationMarkerRef = useRef<L.Marker | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);

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

  // Calculate distance between two points in miles
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Calculate bearing (direction) from point 1 to point 2
  const calculateBearing = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;
    const y = Math.sin(dLng) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  };

  // Get direction name from bearing
  const getDirectionName = (bearing: number): string => {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(bearing / 22.5) % 16;
    return directions[index];
  };

  // Get current GPS location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      console.error('Geolocation is not supported by this browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setCurrentLocation({ lat, lng });
      },
      (error) => {
        console.error('Geolocation error:', error);
      }
    );
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

  // Get current location when component mounts and showCurrentLocation is true
  useEffect(() => {
    if (showCurrentLocation) {
      getCurrentLocation();
    }
  }, [showCurrentLocation]);

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

    // Clear current location marker
    if (currentLocationMarkerRef.current) {
      mapInstanceRef.current.removeLayer(currentLocationMarkerRef.current);
      currentLocationMarkerRef.current = null;
    }

    // Add current location marker if available
    if (currentLocation && showCurrentLocation) {
      // Find the largest group of fish
      const locationGroups: {[key: string]: CatchLocation[]} = {};
      catches.forEach(catch_ => {
        const key = `${catch_.latitude.toFixed(4)},${catch_.longitude.toFixed(4)}`;
        if (!locationGroups[key]) {
          locationGroups[key] = [];
        }
        locationGroups[key].push(catch_);
      });

      let largestGroup: CatchLocation[] = [];
      let largestGroupLocation = '';
      Object.entries(locationGroups).forEach(([location, group]) => {
        if (group.length > largestGroup.length) {
          largestGroup = group;
          largestGroupLocation = location;
        }
      });

      // Calculate distance and direction to largest group
      let tooltipText = 'You are here';
      if (largestGroup.length > 0) {
        const [lat, lng] = largestGroupLocation.split(',').map(Number);
        const distance = calculateDistance(currentLocation.lat, currentLocation.lng, lat, lng);
        const bearing = calculateBearing(currentLocation.lat, currentLocation.lng, lat, lng);
        const direction = getDirectionName(bearing);
        
        // Get most common species in largest group
        const speciesCount: {[key: string]: number} = {};
        largestGroup.forEach(catch_ => {
          speciesCount[catch_.species] = (speciesCount[catch_.species] || 0) + 1;
        });
        const mostCommonSpecies = Object.entries(speciesCount).reduce((a, b) => 
          speciesCount[a[0]] > speciesCount[b[0]] ? a : b
        )[0];

        tooltipText = `You are here<br>
          <strong>Largest fish group:</strong> ${direction} (${distance.toFixed(1)} miles)<br>
          <strong>Species:</strong> ${mostCommonSpecies} (${largestGroup.length} catches)`;
      }

      // Create current location marker
      const currentLocationIcon = L.divIcon({
        className: 'current-location-marker',
        html: `<div style="
          background-color: #007bff;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 4px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
          color: white;
          text-shadow: 1px 1px 1px rgba(0,0,0,0.5);
        ">📍</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const currentLocationMarker = L.marker([currentLocation.lat, currentLocation.lng], {
        icon: currentLocationIcon
      });

      currentLocationMarker.bindTooltip(tooltipText, {
        permanent: false,
        direction: 'top',
        offset: [0, -10]
      });

      if (mapInstanceRef.current) {
        currentLocationMarker.addTo(mapInstanceRef.current);
        currentLocationMarkerRef.current = currentLocationMarker;
      }
    }

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

    // Fit map to show all markers with a maximum zoom level
    if (catches.length > 0 && mapInstanceRef.current && markersRef.current.length > 0) {
      const group = L.featureGroup(markersRef.current);
      mapInstanceRef.current.fitBounds(group.getBounds().pad(0.1), {
        maxZoom: 12  // Prevent over-zooming
      });
    }
  }, [catches, mapLoaded, currentLocation, showCurrentLocation]);

  return (
    <div 
      ref={mapRef} 
      className={`leaflet-map ${className}`}
      style={{ height, width: '100%' }}
    />
  );
};

export default LeafletMap;
