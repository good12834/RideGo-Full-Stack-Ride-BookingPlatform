import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from "react-leaflet";
import { divIcon } from "leaflet";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER = [40.7508, -73.9855]; // Midtown Manhattan

function pinIcon(color, glyph = "") {
  return divIcon({
    className: "",
    html: `<div style="transform:translate(-50%,-100%)">
      <div style="width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
        background:${color};border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,.35);
        display:flex;align-items:center;justify-content:center">
        <span style="transform:rotate(45deg);color:white;font-size:13px;font-weight:800">${glyph}</span>
      </div>
    </div>`,
    iconSize: [0, 0],
  });
}

const carIcon = divIcon({
  className: "",
  html: `<div style="transform:translate(-50%,-50%)">
    <div style="width:34px;height:34px;border-radius:50%;background:#ff7d0a;border:3px solid white;
      box-shadow:0 2px 10px rgba(255,125,10,.6);display:flex;align-items:center;justify-content:center;
      animation:ridegoPulse 1.6s ease-in-out infinite">
      <span style="color:white;font-size:15px">▲</span>
    </div>
  </div>
  <style>@keyframes ridegoPulse{0%,100%{opacity:1}50%{opacity:.55}}</style>`,
  iconSize: [0, 0],
});

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    const valid = points.filter((p) => Number.isFinite(p?.[0]) && Number.isFinite(p?.[1]));
    if (valid.length === 0) return;
    if (valid.length === 1) {
      map.setView(valid[0], 14);
    } else {
      map.fitBounds(valid, { padding: [48, 48] });
    }
  }, [map, points]);
  return null;
}

/**
 * props:
 *  - pickup:    { latitude, longitude, address }
 *  - destination: { latitude, longitude, address }
 *  - driverLocation: { latitude, longitude } (optional, live)
 *  - drivers:   [{ _id, latitude, longitude, name }] (optional, many)
 *  - interactive: bool (default true)
 *  - className
 */
export default function RideMap({
  pickup,
  destination,
  driverLocation,
  drivers = [],
  interactive = true,
  className = "",
}) {
  const center = useMemo(() => {
    if (pickup) return [pickup.latitude, pickup.longitude];
    if (drivers.length) return [drivers[0].latitude, drivers[0].longitude];
    return DEFAULT_CENTER;
  }, [pickup, drivers]);

  const routeLine = useMemo(() => {
    if (pickup && destination) {
      return [
        [pickup.latitude, pickup.longitude],
        [destination.latitude, destination.longitude],
      ];
    }
    return null;
  }, [pickup, destination]);

  return (
    <div className={`overflow-hidden rounded-2xl border border-night-100 ${className}`}>
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom={interactive}
        dragging={interactive}
        doubleClickZoom={interactive}
        zoomControl={interactive}
        className="h-full w-full"
        style={{ minHeight: 240 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
        />

        <FitBounds
          points={[
            pickup && [pickup.latitude, pickup.longitude],
            destination && [destination.latitude, destination.longitude],
            driverLocation && [driverLocation.latitude, driverLocation.longitude],
            ...drivers.map((d) => [d.latitude, d.longitude]),
          ].filter(Boolean)}
        />

        {pickup && (
          <>
            <Marker position={[pickup.latitude, pickup.longitude]} icon={pinIcon("#16a34a", "A")}>
              <Popup>Pickup: {pickup.address}</Popup>
            </Marker>
            <Circle
              center={[pickup.latitude, pickup.longitude]}
              radius={180}
              pathOptions={{ color: "#16a34a", fillOpacity: 0.12, weight: 1 }}
            />
          </>
        )}

        {destination && (
          <Marker position={[destination.latitude, destination.longitude]} icon={pinIcon("#dc2626", "B")}>
            <Popup>Destination: {destination.address}</Popup>
          </Marker>
        )}

        {driverLocation && (
          <Marker position={[driverLocation.latitude, driverLocation.longitude]} icon={carIcon}>
            <Popup>Your driver is here</Popup>
          </Marker>
        )}

        {drivers.map((d) => (
          <Marker key={d._id || `${d.latitude}-${d.longitude}`} position={[d.latitude, d.longitude]} icon={carIcon}>
            <Popup>{d.name || "Driver"}</Popup>
          </Marker>
        ))}

        {routeLine && (
          <Polyline
            positions={routeLine}
            pathOptions={{ color: "#ff7d0a", weight: 4, opacity: 0.75, dashArray: "8 10" }}
          />
        )}
      </MapContainer>
    </div>
  );
}
