import React from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for Leaflet's default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

const LocationPickerMap = ({ onLocationSelect, initialPosition }) => {
  const [position, setPosition] = React.useState(initialPosition);

  const LocationMarker = () => {
    const map = useMapEvents({
      click(e) {
        setPosition(e.latlng);
        onLocationSelect(e.latlng);
        map.flyTo(e.latlng, map.getZoom());
      },
    });

    // This useEffect updates the map view when the initialPosition prop changes
    useEffect(() => {
        if (initialPosition) {
            setPosition(initialPosition);
            map.setView(initialPosition, map.getZoom());
        }
    }, [initialPosition, map]);


    return position === null ? null : <Marker position={position}></Marker>;
  };

  return (
    <div style={{ height: '400px', width: '100%' }} className="rounded-lg overflow-hidden border z-0">
      <MapContainer 
        center={position || [14.5995, 120.9842]} 
        zoom={13} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <LocationMarker />
      </MapContainer>
    </div>
  );
};

export default LocationPickerMap;