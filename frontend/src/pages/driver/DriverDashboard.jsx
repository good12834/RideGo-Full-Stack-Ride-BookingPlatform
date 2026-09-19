import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Power,
  CircleDollarSign,
  Star,
  Clock,
  MapPin,
  Navigation,
  Check,
  X,
  Car,
  Loader2,
  Sparkles,
  Flame,
  Activity,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../hooks/useSocket";
import { useToast } from "../../components/Toast";
import { formatMoney } from "../../components/RideCard";
import DriverPendingDashboard from "../../components/DriverPendingDashboard";
import HotspotMap from "../../components/HotspotMap";
import api from "../../services/api";

export default function DriverDashboard() {
  const { user, driver, refresh } = useAuth();
  const { socket, on, off, connected } = useSocket();
  const toast = useToast();

  const [isOnline, setIsOnline] = useState(driver?.isOnline || false);
  const [stats, setStats] = useState(null);
  const [requests, setRequests] = useState([]);
  const [activeRide, setActiveRide] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [hotspots, setHotspots] = useState([]);
  const watchRef = useRef(null);

  useEffect(() => {
    api
      .get("/driver/earnings", { params: { range: "week" } })
      .then(({ data }) => setStats(data))
      .catch(() => {});
    api
      .get("/rides/active")
      .then(({ data }) => setActiveRide(data.ride))
      .catch(() => {});
    api
      .get("/ai/driver-hotspots")
      .then(({ data }) => setHotspots(data.hotspots || []))
      .catch(() => {});
    refresh?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Broadcast location while online
  useEffect(() => {
    if (!isOnline || !navigator.geolocation) return undefined;

    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const payload = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        api.put("/driver/location", payload).catch(() => {});
        socket?.emit("driver:location", payload);
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 }
    );

    return () => {
      if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, [isOnline, socket]);

  // Incoming ride requests
  useEffect(() => {
    if (!socket) return undefined;
    const handler = (payload) => {
      setRequests((prev) => (prev.some((r) => r.rideId === payload.rideId) ? prev : [...prev, payload]));
      toast.info(`New ride request — ${formatMoney(payload.estimatedFare)}`);
    };
    on("ride:newRequest", handler);
    return () => off("ride:newRequest", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  // Auto-remove stale requests after 60s
  useEffect(() => {
    if (!requests.length) return undefined;
    const t = setInterval(() => {
      setRequests((prev) => prev.slice(-3));
    }, 20000);
    return () => clearInterval(t);
  }, [requests.length]);

  async function toggleOnline() {
    try {
      const { data } = await api.put("/driver/status", { isOnline: !isOnline });
      setIsOnline(data.driver.isOnline);
      toast.success(data.driver.isOnline ? "You're online. Ride requests incoming." : "You're offline.");
      refresh?.();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function accept(rideId) {
    setBusyId(rideId);
    try {
      await api.post(`/rides/${rideId}/accept`);
      setRequests((prev) => prev.filter((r) => r.rideId !== rideId));
      toast.success("Ride accepted");
      const { data } = await api.get("/rides/active");
      setActiveRide(data.ride);
    } catch (err) {
      toast.error(err.message);
      setRequests((prev) => prev.filter((r) => r.rideId !== rideId));
    } finally {
      setBusyId(null);
    }
  }

  function reject(rideId) {
    api.post(`/rides/${rideId}/reject`).catch(() => {});
    setRequests((prev) => prev.filter((r) => r.rideId !== rideId));
  }

  // If driver is not approved, show the advanced pending hub with charts & checklist
  if (driver && driver.status !== "APPROVED") {
    return <DriverPendingDashboard driver={driver} onRefresh={refresh} />;
  }

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-night-950">
              {greeting}, {user?.name?.split(" ")[0]}
            </h1>
            <span className="badge border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-bold">
              <Sparkles className="h-3 w-3" /> AI Active
            </span>
          </div>
          <p className="flex items-center gap-1.5 text-night-500 text-sm mt-1">
            <span className={`h-2.5 w-2.5 rounded-full ${isOnline ? "bg-emerald-500 ridego-pulse" : "bg-night-300"}`} />
            {isOnline ? "ONLINE — autonomous dispatch ready" : "OFFLINE"}
            {!connected && <span className="text-xs text-amber-600 font-bold">(reconnecting...)</span>}
          </p>
        </div>
        <button
          onClick={toggleOnline}
          className={`${isOnline ? "btn-danger" : "btn-primary"} !py-3 !px-6 font-extrabold shadow-glow`}
        >
          <Power className="h-4 w-4" /> {isOnline ? "Go Offline" : "Go Online"}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { icon: CircleDollarSign, label: "This week net", value: stats ? formatMoney(stats.net) : "—", accent: "text-emerald-600 bg-emerald-100" },
          { icon: Car, label: "Completed trips", value: stats ? stats.trips : "—", accent: "text-sky-600 bg-sky-100" },
          { icon: Star, label: "Driver rating", value: driver ? Number(driver.rating).toFixed(1) : "5.0", accent: "text-amber-600 bg-amber-100" },
          { icon: TrendingUp, label: "Retention payout", value: "90%", accent: "text-primary-600 bg-primary-100" },
        ].map((s) => (
          <div key={s.label} className="card p-5">
            <span className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${s.accent}`}>
              <s.icon className="h-4.5 w-4.5" />
            </span>
            <p className="text-2xl font-black text-night-950">{s.value}</p>
            <p className="text-xs font-semibold text-night-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Active ride banner */}
      {activeRide && (
        <Link
          to="/driver/trip"
          className="card block border-primary-300 bg-gradient-to-r from-primary-50 to-amber-50/60 p-5 transition hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="badge bg-primary-500 text-white font-bold text-xs">
              Active Trip in Progress
            </span>
            <span className="text-xs font-bold text-primary-600 flex items-center gap-1">
              Manage Trip <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mt-2 font-extrabold text-night-900 text-base">
            {activeRide.pickup?.address} → {activeRide.destination?.address}
          </p>
          <p className="text-xs text-night-500 mt-1">
            Status: {activeRide.status.replaceAll("_", " ")} • PIN: {activeRide.ridePin || "—"}
          </p>
        </Link>
      )}

      {/* AI Hotspots Radar Widget */}
      {hotspots.length > 0 && (
        <div className="card p-5 bg-gradient-to-r from-night-950 via-night-900 to-night-950 text-white shadow-xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-white shadow-sm">
                <Flame className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-sm font-extrabold">AI Real-Time Demand Surge Radar</h3>
                <p className="text-[11px] text-night-400">Head to high-demand clusters to maximize your hourly rate</p>
              </div>
            </div>
            <span className="badge bg-amber-500/20 text-amber-300 border border-amber-400/30 font-bold">
              Live Heatmap
            </span>
          </div>

          <div className="mt-4">
            <HotspotMap hotspots={hotspots} />
          </div>
        </div>
      )}

      {/* Ride requests */}
      <div>
        <h2 className="mb-3 font-extrabold text-base text-night-900">Incoming Ride Requests</h2>
        {!isOnline && (
          <div className="card p-10 text-center text-night-400">
            <Power className="mx-auto mb-2 h-10 w-10 text-night-300" />
            <p className="font-bold text-night-700">You are currently offline</p>
            <p className="text-xs text-night-400 mt-1">
              Toggle the switch above to go online and start receiving nearby trip dispatches.
            </p>
          </div>
        )}
        {isOnline && requests.length === 0 && (
          <div className="card p-10 text-center text-night-400">
            {connected ? (
              <div>
                <Sparkles className="mx-auto h-8 w-8 text-primary-500 animate-pulse mb-2" />
                <p className="font-bold text-night-700">Autonomous Radar Scanning</p>
                <p className="text-xs text-night-400 mt-1">Waiting for nearby passengers in your coverage radius...</p>
              </div>
            ) : (
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary-500" />
            )}
          </div>
        )}
        <AnimatePresence>
          {requests.map((req) => (
            <motion.div
              key={req.rideId}
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: -40 }}
              className="card mb-3 border-primary-300 p-5 shadow-lg bg-gradient-to-r from-white via-primary-50/20 to-white"
            >
              <div className="flex items-center justify-between">
                <span className="badge bg-primary-500 text-white font-extrabold text-xs">
                  New Trip Request
                </span>
                <p className="text-2xl font-black text-night-950">{formatMoney(req.netToDriver || req.estimatedFare)}</p>
              </div>
              <div className="mt-3 space-y-1.5 text-sm">
                <p className="flex items-center gap-2 text-night-800 font-semibold">
                  <MapPin className="h-4 w-4 text-emerald-500 shrink-0" /> {req.passengerName || "Passenger"} — {req.pickup?.address}
                </p>
                <p className="flex items-center gap-2 text-night-800 font-semibold">
                  <Navigation className="h-4 w-4 text-red-500 shrink-0" /> {req.destination?.address}
                </p>
              </div>
              <p className="mt-2 text-xs font-semibold text-night-500">
                {Number(req.distance).toFixed(1)} km • ~{req.duration} min transit • {req.rideType?.toUpperCase()}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button className="btn-ghost !py-3 font-bold" onClick={() => reject(req.rideId)} disabled={busyId === req.rideId}>
                  <X className="h-4 w-4" /> Reject
                </button>
                <button className="btn-primary !py-3 font-extrabold shadow-glow" onClick={() => accept(req.rideId)} disabled={busyId === req.rideId}>
                  {busyId === req.rideId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Accept Trip
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
