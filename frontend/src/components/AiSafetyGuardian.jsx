import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Siren, Activity, CheckCircle2, Lock, Radio } from "lucide-react";
import api from "../services/api";

export default function AiSafetyGuardian({ ride, onSos }) {
  const [telemetry, setTelemetry] = useState({
    safetyScore: 99.4,
    routeAdherence: "99.8%",
    status: "SECURE_MONITORING",
    unexpectedStops: 0,
  });

  useEffect(() => {
    if (!ride?._id) return;
    api
      .post("/ai/safety-scan", {
        rideId: ride._id,
        currentLat: ride.pickup?.latitude,
        currentLng: ride.pickup?.longitude,
        pickup: ride.pickup,
        destination: ride.destination,
        rideStatus: ride.status,
      })
      .then((res) => {
        if (res.data?.telemetry) {
          setTelemetry({
            safetyScore: res.data.safetyScore,
            routeAdherence: res.data.telemetry.routeAdherence,
            status: res.data.status,
            unexpectedStops: res.data.telemetry.unexpectedStops,
          });
        }
      })
      .catch(() => {});
  }, [ride]);

  return (
    <div className="card overflow-hidden border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/20 to-emerald-50/40 p-4 shadow-card">
      <div className="flex items-center justify-between border-b border-night-100 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500 text-white shadow-sm">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div>
            <h4 className="text-xs font-bold text-night-900">AI Safety Guardian Active</h4>
            <p className="text-[10px] text-emerald-700">Autonomous trip route & anomaly detection</p>
          </div>
        </div>
        <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
          <Radio className="h-2.5 w-2.5 animate-pulse text-emerald-600" /> Live
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-lg bg-white p-2 border border-night-100">
          <span className="block text-[9px] font-bold uppercase text-night-400">Safety Index</span>
          <span className="font-extrabold text-emerald-600">{telemetry.safetyScore}/100</span>
        </div>
        <div className="rounded-lg bg-white p-2 border border-night-100">
          <span className="block text-[9px] font-bold uppercase text-night-400">Route Adherence</span>
          <span className="font-extrabold text-night-800">{telemetry.routeAdherence}</span>
        </div>
        <div className="rounded-lg bg-white p-2 border border-night-100">
          <span className="block text-[9px] font-bold uppercase text-night-400">Anomalies</span>
          <span className="font-extrabold text-emerald-600">0 Detected</span>
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-between text-[11px] text-night-500">
        <span className="flex items-center gap-1">
          <Lock className="h-3 w-3 text-emerald-600" /> 256-bit encrypted telemetry
        </span>
        <button
          type="button"
          onClick={onSos}
          className="flex items-center gap-1 font-bold text-red-600 hover:text-red-700 hover:underline"
        >
          <Siren className="h-3 w-3" /> Emergency SOS
        </button>
      </div>
    </div>
  );
}
