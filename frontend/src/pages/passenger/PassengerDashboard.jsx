import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, Navigation, ArrowRight, Wallet, Plus, Clock, Star } from "lucide-react";
import LocationSearch, { DEMO_PLACES } from "../../components/LocationSearch";
import RideCard, { formatMoney } from "../../components/RideCard";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

export default function PassengerDashboard() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const [pickup, setPickup] = useState(null);
  const [destination, setDestination] = useState(null);
  const [recent, setRecent] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/rides/history", { params: { limit: 3 } })
      .then(({ data }) => setRecent(data.rides))
      .catch(() => {});
    refresh?.();
  }, [refresh]);

  function book() {
    if (!pickup || !destination) {
      setError("Choose pickup and destination.");
      return;
    }
    const params = new URLSearchParams({
      pickup: JSON.stringify(pickup),
      destination: JSON.stringify(destination),
    });
    navigate(`/book?${params.toString()}`);
  }

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Greeting + wallet */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {greeting}, {user?.name?.split(" ")[0]}
          </h1>
          <p className="text-night-500">Where would you like to go today?</p>
        </div>
        <div className="card flex items-center gap-4 px-5 py-3.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
            <Wallet className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-night-400">Wallet</p>
            <p className="font-extrabold">{formatMoney(user?.walletBalance)}</p>
          </div>
          <button
            onClick={() => navigate("/passenger/profile")}
            className="btn-ghost !rounded-lg !px-3 !py-2 text-xs"
          >
            <Plus className="h-3.5 w-3.5" /> Top up
          </button>
        </div>
      </div>

      {/* Booking widget */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card p-5 sm:p-6">
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="space-y-3">
            <LocationSearch value={pickup} onChange={setPickup} placeholder="Pickup location" icon="pin" allowCurrentLocation />
            <LocationSearch value={destination} onChange={setDestination} placeholder="Where to?" icon="target" />
            {error && <p className="text-sm font-medium text-red-500">{error}</p>}
            <button className="btn-primary w-full sm:w-auto" onClick={book}>
              Find a Ride <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="rounded-2xl bg-night-50 p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-night-400">Quick picks</p>
            <div className="space-y-1.5">
              {DEMO_PLACES.slice(0, 4).map((p) => (
                <button
                  key={p.address}
                  onClick={() => setDestination(p)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-white"
                >
                  <Clock className="h-3.5 w-3.5 text-night-400" />
                  <span className="truncate">{p.address}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Recent rides */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold">Recent rides</h2>
          <Link to="/passenger/rides" className="text-sm font-semibold text-primary-600 hover:text-primary-700">
            View all
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="card p-10 text-center text-night-400">
            <MapPin className="mx-auto mb-2 h-8 w-8" />
            <p>Your rides will appear here after your first trip.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((r) => (
              <RideCard key={r._id} ride={r} showDriver />
            ))}
          </div>
        )}
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          [recent.length, "recent trips"],
          [formatMoney(user?.walletBalance), "wallet"],
          ["4.9", "avg. given"],
        ].map(([v, l]) => (
          <div key={l} className="card p-4 text-center">
            <p className="text-xl font-extrabold text-primary-500">{v}</p>
            <p className="text-xs text-night-400">{l}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
