import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, Circle } from "react-leaflet";
import { divIcon } from "leaflet";
import "leaflet/dist/leaflet.css";
import { Radio, RefreshCw, Users, Car, Activity, Clock } from "lucide-react";
import { formatMoney } from "../../components/RideCard";
import StatusBadge from "../../components/StatusBadge";
import api from "../../services/api";

const DEFAULT_CENTER = [40.7508, -73.9855];

const pickupIcon = divIcon({
  className: "",
  html: `<div style="transform:translate(-50%,-100%)">
    <div style="width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
      background:#16a34a;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,.35)"></div>
  </div>`,
  iconSize: [0, 0],
});

const destinationIcon = divIcon({
  className: "",
  html: `<div style="transform:translate(-50%,-100%)">
    <div style="width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
      background:#dc2626;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,.35)"></div>
  </div>`,
  iconSize: [0, 0],
});

const carIcon = divIcon({
  className: "",
  html: `<div style="transform:translate(-50%,-50%)">
    <div style="width:30px;height:30px;border-radius:50%;background:#ff7d0a;border:3px solid white;
      box-shadow:0 2px 10px rgba(255,125,10,.6);display:flex;align-items:center;justify-content:center;
      animation:ridegoPulse 1.6s ease-in-out infinite">
      <span style="color:white;font-size:13px">▲</span>
    </div>
  </div>
  <style>@keyframes ridegoPulse{0%,100%{opacity:1}50%{opacity:.55}}</style>`,
  iconSize: [0, 0],
});

const searchingIcon = divIcon({
  className: "",
  html: `<div style="transform:translate(-50%,-50%)">
    <div style="width:34px;height:34px;border-radius:50%;background:#7c3aed;border:3px dashed white;
      box-shadow:0 0 12px rgba(124,58,237,.7);animation:ridegoPulse 1.2s ease-in-out infinite"></div>
  </div>`,
  iconSize: [0, 0],
});

function FitAll({ points }) {
  const map = useMap();
  useEffect(() => {
    const valid = points.filter((p) => Number.isFinite(p?.[0]) && Number.isFinite(p?.[1]));
    if (!valid.length) return;
    if (valid.length === 1) map.setView(valid[0], 13);
    else map.fitBounds(valid, { padding: [40, 40] });
  }, [map, points]);
  return null;
}

export default function LiveOps() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  async function load(silent = false) {
    if (!silent) setLoading(true);
    try {
      const { data: d } = await api.get("/admin/live");
      setData(d);
      setLastUpdated(new Date());
    } catch {
      // keep previous snapshot on failure
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const t = setInterval(() => load(true), 10000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh]);

  const rides = data?.rides || [];
  const drivers = data?.drivers || [];

  const mapPoints = [
    ...rides.flatMap((r) => [
      r.pickup?.latitude && [r.pickup.latitude, r.pickup.longitude],
      r.destination?.latitude && [r.destination.latitude, r.destination.longitude],
    ]),
    ...drivers.map((d) => d.location?.latitude && [d.location.latitude, d.location.longitude]),
  ].filter(Boolean);

  const searching = rides.filter((r) => ["REQUESTED", "SEARCHING_DRIVER"].includes(r.status)).length;
  const onTrip = rides.filter((r) => ["TRIP_STARTED", "DRIVER_ARRIVING", "DRIVER_ARRIVED"].includes(r.status)).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Live Ops Map</h1>
          <p className="text-xs text-night-400">
            Real-time view of active rides and online drivers across the city.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAutoRefresh((v) => !v)}
            className={`btn-ghost !py-2 text-xs font-bold ${autoRefresh ? "!text-emerald-600" : "!text-night-400"}`}
          >
            <Radio className={`h-3.5 w-3.5 ${autoRefresh ? "animate-pulse" : ""}`} />
            {autoRefresh ? "Auto-refresh on" : "Auto-refresh off"}
          </button>
          <button type="button" onClick={() => load()} className="btn-ghost !py-2 text-xs font-bold">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { icon: Activity, label: "Searching ride", value: searching, accent: "bg-violet-100 text-violet-600" },
          { icon: Clock, label: "On-trip now", value: onTrip, accent: "bg-primary-100 text-primary-600" },
          { icon: Car, label: "Online drivers", value: drivers.length, accent: "bg-amber-100 text-amber-600" },
          { icon: Users, label: "Active total", value: rides.length, accent: "bg-sky-100 text-sky-600" },
        ].map((c) => (
          <div key={c.label} className="card flex items-center gap-3 p-4">
            <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${c.accent}`}>
              <c.icon className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xl font-extrabold leading-none">{c.value}</p>
              <p className="text-[11px] text-night-400">{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Map */}
      <div className="card overflow-hidden !p-0">
        <MapContainer center={mapPoints[0] || DEFAULT_CENTER} zoom={12} className="h-[460px] w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
          />
          <FitAll points={mapPoints} />

          {rides.flatMap((r) =>
            [
              r.pickup?.latitude && (
                <Marker key={`${r._id}-pu`} position={[r.pickup.latitude, r.pickup.longitude]} icon={pickupIcon}>
                  <Popup>
                    <b>#{r.rideNumber}</b> — {r.passengerId?.name || "Passenger"}
                    <br />
                    Pickup: {r.pickup.address}
                    <br />
                    <StatusBadge status={r.status} />
                  </Popup>
                </Marker>
              ),
              r.destination?.latitude && (
                <Marker key={`${r._id}-dest`} position={[r.destination.latitude, r.destination.longitude]} icon={destinationIcon}>
                  <Popup>
                    <b>#{r.rideNumber}</b> — {r.destination.address} • {formatMoney(r.fare)}
                  </Popup>
                </Marker>
              ),
              r.pickup?.latitude && r.destination?.latitude && (
                <Polyline
                  key={`${r._id}-line`}
                  positions={[
                    [r.pickup.latitude, r.pickup.longitude],
                    [r.destination.latitude, r.destination.longitude],
                  ]}
                  pathOptions={{ color: "#ff7d0a", weight: 3, opacity: 0.6, dashArray: "6 8" }}
                />
              ),
            ])}
        </MapContainer>
      </div>

      {/* Active rides table */}
      <div className="card overflow-x-auto">
        <table className="w-full min-w-160 text-sm">
          <thead>
            <tr className="border-b border-night-100 text-left text-xs uppercase tracking-wide text-night-400">
              <th className="px-5 py-3">Ride</th>
              <th className="px-5 py-3">Passenger</th>
              <th className="px-5 py-3">Driver</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Fare</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="py-8 text-center text-night-400">Loading live data…</td></tr>
            ) : rides.length === 0 ? (
              <tr><td colSpan={5} className="py-8 text-center text-night-400">No active rides right now.</td></tr>
            ) : (
              rides.map((r) => (
                <tr key={r._id} className="border-b border-night-50 last:border-0 hover:bg-night-50/60">
                  <td className="px-5 py-3 font-mono text-xs">#{r.rideNumber}</td>
                  <td className="px-5 py-3">{r.passengerId?.name || "—"}</td>
                  <td className="px-5 py-3 text-night-500">{r.driverId?.userId?.name || "unassigned"}</td>
                  <td className="px-5 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-5 py-3 font-bold">{formatMoney(r.fare)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {lastUpdated && (
        <p className="text-center text-[11px] text-night-300">
          Snapshot updated {lastUpdated.toLocaleTimeString()} {autoRefresh ? "• refreshes every 10s" : ""}
        </p>
      )}
    </div>
  );
}

