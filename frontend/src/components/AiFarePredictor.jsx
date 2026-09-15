import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  TrendingDown,
  Clock,
  Sun,
  CloudRain,
  CloudFog,
  Leaf,
  ShieldCheck,
  Zap,
  Activity,
  ArrowRight,
} from "lucide-react";
import api from "../services/api";

const WEATHER_ICONS = {
  Sun,
  CloudRain,
  CloudFog,
};

export default function AiFarePredictor({ pickup, destination, rideType = "economy", onSelectTime }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(0);

  useEffect(() => {
    if (!pickup?.latitude || !destination?.latitude) return;
    setLoading(true);
    // Coordinate-only locations (e.g. AI-copilot quotes) may omit `address`;
    // normalize the payload so the backend never rejects on a missing field.
    const withAddress = (loc) => ({
      ...loc,
      address: String(loc?.address || loc?.name || loc?.label || "").trim(),
    });
    api
      .post("/ai/predict-fare", {
        pickup: withAddress(pickup),
        destination: withAddress(destination),
        rideType,
      })
      .then((res) => {
        const payload = res.data;
        if (!payload || !Array.isArray(payload.departureWindows)) return;
        setData(payload);
        const bestIndex = payload.departureWindows.findIndex((w) => w.recommended);
        if (bestIndex !== -1) setSelectedSlot(bestIndex);
      })
      .catch((err) => console.error("AI Fare prediction error:", err))
      .finally(() => setLoading(false));
  }, [pickup, destination, rideType]);

  if (!pickup || !destination) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="card overflow-hidden border border-primary-100 bg-gradient-to-br from-white via-primary-50/20 to-amber-50/30 p-5 shadow-card"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-night-100 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-primary-500 to-amber-400 text-white shadow-glow">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-night-900">AI Dynamic Fare & Route Forecast</h3>
            <p className="text-[11px] text-night-500">Real-time neural traffic & optimal departure analysis</p>
          </div>
        </div>
        <span className="badge border border-emerald-200 bg-emerald-50 text-[11px] font-bold text-emerald-700">
          <Activity className="h-3 w-3" /> Live Telemetry
        </span>
      </div>

      {loading ? (
        <div className="py-8 text-center text-xs text-night-400">
          <Sparkles className="mx-auto h-6 w-6 animate-spin text-primary-500 mb-2" />
          Computing optimal neural route and savings...
        </div>
      ) : data ? (
        <div className="mt-4 space-y-4">
          {/* Optimal Departure Matrix */}
          <div>
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-bold text-night-700">Smart Departure Times</span>
              <span className="text-[11px] font-semibold text-emerald-600">
                {data.aiSavingsPotential}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {data.departureWindows.map((slot, idx) => {
                const isSelected = selectedSlot === idx;
                return (
                  <button
                    key={slot.label}
                    type="button"
                    onClick={() => {
                      setSelectedSlot(idx);
                      if (onSelectTime) onSelectTime(slot);
                    }}
                    className={`relative flex flex-col items-center rounded-xl border p-2.5 text-center transition ${
                      isSelected
                        ? "border-primary-500 bg-white ring-2 ring-primary-300 shadow-sm"
                        : "border-night-200 bg-white/70 hover:border-night-300 hover:bg-white"
                    }`}
                  >
                    {slot.recommended && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-2 py-0.2 text-[9px] font-extrabold uppercase text-white shadow-sm">
                        Best Value
                      </span>
                    )}
                    <span className="text-xs font-bold text-night-800">{slot.label}</span>
                    <span className="mt-1 text-sm font-black text-primary-600">
                      ${slot.fare.toFixed(2)}
                    </span>
                    <span className="mt-0.5 flex items-center gap-0.5 text-[10px] text-night-400">
                      <Clock className="h-2.5 w-2.5" /> ~{slot.etaMin}m
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Traffic, Weather & Eco Metrics */}
          <div className="grid grid-cols-3 gap-2 rounded-xl bg-white p-3 border border-night-100 text-xs">
            <div className="text-center border-r border-night-100 pr-1">
              <span className="block text-[10px] uppercase font-bold text-night-400">Traffic Index</span>
              <span className={`mt-0.5 block font-extrabold ${data.trafficCongestionPct > 60 ? "text-amber-600" : "text-emerald-600"}`}>
                {data.trafficCongestionPct}% ({data.trafficLevel})
              </span>
            </div>
            <div className="text-center border-r border-night-100 pr-1">
              <span className="block text-[10px] uppercase font-bold text-night-400">Weather</span>
              <span className="mt-0.5 block font-extrabold text-night-800 truncate">
                {data.weather.condition}
              </span>
            </div>
            <div className="text-center">
              <span className="block text-[10px] uppercase font-bold text-night-400">CO₂ Offset</span>
              <span className="mt-0.5 flex items-center justify-center gap-1 font-extrabold text-emerald-600">
                <Leaf className="h-3 w-3" /> {data.ecoMetrics.treesEquivalent} trees
              </span>
            </div>
          </div>

          {/* AI Insights footnote */}
          <div className="flex items-center gap-2 text-[11px] text-night-500 bg-primary-50/50 rounded-lg p-2 border border-primary-100">
            <Zap className="h-3.5 w-3.5 text-primary-500 shrink-0" />
            <span>AI automatically reroutes around congestion to guarantee lowest trip time.</span>
          </div>
        </div>
      ) : null}
    </motion.div>
  );
}
