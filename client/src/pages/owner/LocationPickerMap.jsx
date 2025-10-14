import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import 'leaflet-geosearch/dist/geosearch.css';

// Fix for Leaflet's default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// --- DRAGGABLE MARKER COMPONENT ---
function DraggableMarker({ position, onPositionChange }) {
  const markerRef = useRef(null);
  const map = useMapEvents({
    click(e) {
      onPositionChange(e.latlng);
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          onPositionChange(marker.getLatLng());
        }
      },
    }),
    [onPositionChange],
  );
  
  // Update marker position if initialPosition prop changes
  useEffect(() => {
    if (position && markerRef.current && !markerRef.current.getLatLng().equals(position)) {
      markerRef.current.setLatLng(position);
      map.setView(position, map.getZoom());
    }
  }, [position, map]);

  return position === null ? null : (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}>
    </Marker>
  );
}

// --- SEARCH COMPONENT ---
const SearchField = ({ onLocationSelect }) => {
  const map = useMap();

  useEffect(() => {
    const provider = new OpenStreetMapProvider();

    const searchControl = new GeoSearchControl({
      provider: provider,
      style: 'bar',
      showMarker: false, 
      showPopup: false,
      autoClose: true,
      searchLabel: 'Enter address, city, or street',
      notFoundMessage: 'Sorry, that address could not be found.',
    });

    map.addControl(searchControl);

    map.on('geosearch/showlocation', (result) => {
      onLocationSelect({
        lat: result.location.y,
        lng: result.location.x
      }, result.location.label);
      map.flyTo([result.location.y, result.location.x], 16);
    });

    return () => map.removeControl(searchControl);
  }, [map, onLocationSelect]);

  return null;
};

const LocationPickerMap = ({ onLocationSelect, initialPosition }) => {
  const [position, setPosition] = useState(initialPosition);
  const [address, setAddress] = useState('');

  const handlePositionChange = useCallback((newPosition) => {
    setPosition(newPosition);
    if (onLocationSelect) {
      onLocationSelect(newPosition);
    }
  }, [onLocationSelect]);
  
  const handleLocationFound = useCallback((pos, addr) => {
    setPosition(pos);
    setAddress(addr);
    if (onLocationSelect) {
      onLocationSelect(pos);
    }
  }, [onLocationSelect]);
  
  useEffect(() => {
    if (position) {
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.lat}&lon=${position.lng}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.display_name) {
            setAddress(data.display_name);
          }
        }).catch(error => {
          console.error("Error fetching address: ", error);
          setAddress("Could not fetch address.");
        });
    }
  }, [position]);

  return (
    <div>
      <div style={{ height: '350px', width: '100%' }} className="rounded-lg overflow-hidden border z-0">
        <MapContainer 
            center={position || [14.5995, 120.9842]}
            zoom={13} 
            style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <DraggableMarker 
            position={position} 
            onPositionChange={handlePositionChange} 
          />
          <SearchField onLocationSelect={handleLocationFound} />
        </MapContainer>
      </div>
      {address && (
        <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
          <strong>Selected:</strong> {address}
        </div>
      )}
    </div>
  );
};

export default LocationPickerMap;