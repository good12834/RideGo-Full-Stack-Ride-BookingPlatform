import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, MapPin, Navigation, Phone, ArrowRight, CheckCircle2 } from "lucide-react";
import RideMap from "../../components/RideMap";
import StatusBadge from "../../components/StatusBadge";
import { useToast } from "../../components/Toast";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

const NEXT_STEP = {
  DRIVER_ASSIGNED: { label: "Start heading to pickup", to: "DRIVER_ARRIVING" },
  DRIVER_ARRIVING: { label: "I have arrived", to: "DRIVER_ARRIVED" },
  DRIVER_ARRIVED: { label: "Start trip", to: "TRIP_STARTED" },
  TRIP_STARTED: { label: "Complete trip", to: "TRIP_COMPLETED" },
};

export default function ActiveTrip() {
  const navigate = useNavigate();
  const toast = useToast();
  const { refresh } = useAuth();
  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const { data } = await api.get("/rides/active");
      setRide(data.ride);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function advance() {
    const step = NEXT_STEP[ride.status];
    if (!step) return;
    setBusy(true);
    try {
      await api.put(`/rides/${ride._id}/status`, { status: step.to });
      toast.success(step.to === "TRIP_COMPLETED" ? "Trip completed" : "Status updated");
      await load();
      await refresh?.();
      if (step.to === "TRIP_COMPLETED") {
        navigate("/driver/earnings");
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Loader2 className="mx-auto mt-16 h-8 w-8 animate-spin text-primary-500" />;

  if (!ride || ["PAYMENT_COMPLETED", "CANCELLED"].includes(ride.status)) {
    return (
      <div className="card mx-auto max-w-md p-10 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
        <p className="mt-3 font-bold">No active trip</p>
        <p className="mt-1 text-sm text-night-500">New requests will appear on your dashboard.</p>
      </div>
    );
  }

  const passenger = ride.passengerId;
  const step = NEXT_STEP[ride.status];
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${ride.pickup.latitude},${ride.pickup.longitude}`;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-extrabold">Ride #{ride.rideNumber}</h1>
        <StatusBadge status={ride.status} className="!text-sm" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <RideMap
          pickup={ride.pickup}
          destination={ride.destination}
          className="h-72 lg:h-96"
        />

        <div className="space-y-4">
          {/* Passenger card */}
          {passenger && (
            <div className="card p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-night-400">Passenger</p>
              <div className="mt-2 flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-100 font-bold text-primary-600">
                  {passenger.name?.slice(0, 1)}
                </span>
                <div className="flex-1">
                  <p className="font-bold">{passenger.name}</p>
                  <p className="text-xs text-night-400">{passenger.phone}</p>
                </div>
                {passenger.phone && (
                  <a href={`tel:${passenger.phone}`} className="btn-ghost !p-2.5">
                    <Phone className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Route */}
          <div className="card space-y-2.5 p-5">
            <div className="flex items-start gap-2.5 text-sm">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              <span>{ride.pickup.address}</span>
            </div>
            <div className="flex items-start gap-2.5 text-sm">
              <Navigation className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              <span>{ride.destination.address}</span>
            </div>
            <div className="border-t border-night-100 pt-2 text-xs text-night-400">
              {Number(ride.distance).toFixed(1)} km • est. {ride.duration} min
            </div>
            <a href={mapsUrl} target="_blank" rel="noreferrer" className="btn-ghost w-full !py-2.5 text-sm">
              <Navigation className="h-4 w-4" /> Navigate to pickup
            </a>
          </div>

          {/* Action */}
          {step && (
            <button className="btn-primary w-full !py-4 text-base" onClick={advance} disabled={busy}>
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <> {step.label} <ArrowRight className="h-4 w-4" /></>}
            </button>
          )}
          {ride.status === "TRIP_COMPLETED" && (
            <div className="card p-5 text-center text-sm text-night-500">
              Awaiting passenger payment...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
