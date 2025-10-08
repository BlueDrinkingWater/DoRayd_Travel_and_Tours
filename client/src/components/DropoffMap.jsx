import React, { useState, useEffect, useMemo, useRef } from 'react';
// Corrected line: Added useMapEvents to the import
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
function DraggableMarker({ position, setPosition, setAddress }) {
  const markerRef = useRef(null);
  const map = useMapEvents({
    click(e) {
      setPosition(e.latlng);
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          setPosition(marker.getLatLng());
        }
      },
    }),
    [setPosition],
  );

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
          setAddress("Could not fetch address. Please try again.");
        });
    }
  }, [position, setAddress]);

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
      showMarker: false, // We use our own draggable marker
      showPopup: false,
      autoClose: true,
      searchLabel: 'Enter address, city, or street',
      notFoundMessage: 'Sorry, that address could not be found.',
    });

    map.addControl(searchControl);

    map.on('geosearch/showlocation', (result) => {
      const { x: lon, y: lat } = result.location;
      const position = { lat, lng: lon };
      const address = result.location.label;
      onLocationSelect({
        latitude: lat,
        longitude: lon,
        address: address,
        position: position
      });
      map.flyTo(position, 16); // Zoom in on the search result
    });

    return () => map.removeControl(searchControl);
  }, [map, onLocationSelect]);

  return null;
};

const DropoffMap = ({ onLocationSelect }) => {
  const [position, setPosition] = useState(null);
  const [address, setAddress] = useState('');
  
  const handleLocationFound = ({ latitude, longitude, address, position }) => {
    setPosition(position);
    setAddress(address);
  };
  
  useEffect(() => {
    if (position && address) {
      onLocationSelect({
        latitude: position.lat,
        longitude: position.lng,
        address: address,
      });
    }
  }, [position, address, onLocationSelect]);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Pinpoint Drop-off Location
      </label>
      <p className="text-xs text-gray-500 mb-2">
        Use the search bar, click on the map, or drag the pin to your exact location.
      </p>
      <div style={{ height: '350px', width: '100%' }} className="rounded-lg overflow-hidden border z-0">
        <MapContainer 
            center={[14.5995, 120.9842]} // Default center (Manila)
            zoom={13} 
            style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <DraggableMarker 
            position={position} 
            setPosition={setPosition} 
            setAddress={setAddress}
          />
          <SearchField onLocationSelect={handleLocationFound} />
        </MapContainer>
      </div>
      {address && (
        <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
          <strong>Selected Address:</strong> {address}
        </div>
      )}
    </div>
  );
};

export default DropoffMap;