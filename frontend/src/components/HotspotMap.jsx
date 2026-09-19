import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from "react-leaflet";
import { divIcon } from "leaflet";
import "leaflet/dist/leaflet.css";
import { Flame, Map as MapIcon, List } from "lucide-react";

const DEFAULT_CENTER = [40.7508, -73.9855];

function heatColor(mult) {
  if (mult >= 2) return "#dc2626";
  if (mult >= 1.5) return "#ea580c";
  if (mult >= 1.25) return "#f59e0b";
  return "#16a34a";
}

function hotIcon(mult) {
  const color = heatColor(mult);
  return divIcon({
    className: "",
    html: `<div style="transform:translate(-50%,-50%)">
      <div style="width:30px;height:30px;border-radius:50%;background:${color};border:3px solid white;
        box-shadow:0 0 14px ${color};display:flex;align-items:center;justify-content:center">
        <span style="color:white;font-size:11px;font-weight:900">${mult}x</span>
      </div>
    </div>`,
    iconSize: [0, 0],
  });
}

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    const valid = points.filter((p) => Number.isFinite(p?.[0]) && Number.isFinite(p?.[1]));
    if (valid.length === 1) map.setView(valid[0], 12);
    else if (valid.length > 1) map.fitBounds(valid, { padding: [40, 40] });
  }, [map, points]);
  return null;
}

/**
 * AI demand hotspot map for drivers.
 * props: hotspots [{ zone, demandMultiplier, activeRiders, openDrivers, estWaitMin, surgeReason, latitude, longitude }]
 */
export default function HotspotMap({ hotspots = [] }) {
  const [view, setView] = useState("map");
  const points = useMemo(
    () => hotspots.filter((h) => h.latitude && h.longitude).map((h) => [h.latitude, h.longitude]),
    [hotspots]
  );

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] font-bold text-night-400">
          <Flame className="h-3.5 w-3.5 text-amber-500" /> Demand Heatmap
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setView("map")}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold ${
              view === "map" ? "bg-amber-500 text-white" : "bg-white/10 text-night-300 hover:bg-white/20"
            }`}
          >
            <MapIcon className="h-3 w-3" /> Map
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold ${
              view === "list" ? "bg-amber-500 text-white" : "bg-white/10 text-night-300 hover:bg-white/20"
            }`}
          >
            <List className="h-3 w-3" /> List
          </button>
        </div>
      </div>

      {view === "map" ? (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <MapContainer center={points[0] || DEFAULT_CENTER} zoom={11} className="h-72 w-full">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
            />
            <FitBounds points={points} />
            {hotspots
              .filter((h) => h.latitude && h.longitude)
              .flatMap((h) => [
                <Circle
                  key={`${h.zone}-circle`}
                  center={[h.latitude, h.longitude]}
                  radius={600 + (h.demandMultiplier || 1) * 500}
                  pathOptions={{ color: heatColor(h.demandMultiplier), fillColor: heatColor(h.demandMultiplier), fillOpacity: 0.15, weight: 1.5 }}
                />,
                <Marker key={`${h.zone}-marker`} position={[h.latitude, h.longitude]} icon={hotIcon(h.demandMultiplier)}>
                  <Popup>
                    <b>{h.zone}</b>
                    <br />
                    Demand ×{h.demandMultiplier} — {h.activeRiders} riders, {h.openDrivers} drivers free
                    <br />
                    {h.surgeReason} • ~{h.estWaitMin}m wait
                  </Popup>
                </Marker>,
              ])}
          </MapContainer>
        </div>
      ) : (
        <div className="divide-y divide-white/5 rounded-xl border border-white/10">
          {[...hotspots]
            .sort((a, b) => b.demandMultiplier - a.demandMultiplier)
            .map((h) => (
              <div key={h.zone} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-white">{h.zone}</p>
                  <p className="truncate text-[10px] text-night-400">{h.surgeReason}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs font-black" style={{ color: heatColor(h.demandMultiplier) }}>
                    ×{h.demandMultiplier}
                  </p>
                  <p className="text-[10px] text-night-400">{h.activeRiders} riders</p>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
