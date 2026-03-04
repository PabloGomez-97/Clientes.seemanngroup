import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function QuotesMap() {
  // Guard against StrictMode double-mount: defer render until after first effect
  const [ready, setReady] = useState(false);
  const mountRef = useRef(false);

  useEffect(() => {
    if (!mountRef.current) {
      mountRef.current = true;
      setReady(true);
    }
    return () => {
      mountRef.current = false;
    };
  }, []);

  if (!ready) return null;

  return (
    <MapContainer
      center={[-33.4489, -70.6693]}
      zoom={3}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
    </MapContainer>
  );
}
