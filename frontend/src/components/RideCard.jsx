import { Link } from "react-router-dom";
import { MapPin, Star, ArrowRight, Navigation } from "lucide-react";
import StatusBadge from "./StatusBadge";

export function formatMoney(n) {
  return `$${Number(n || 0).toFixed(2)}`;
}

export function formatDate(d) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function RideCard({ ride, showDriver = true }) {
  const driverName = ride.driverId?.userId?.name || ride.driverId?.name;
  return (
    <div className="card p-5 transition hover:shadow-md">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate font-bold">#{ride.rideNumber}</p>
            <StatusBadge status={ride.status} />
          </div>
          <p className="mt-0.5 text-xs text-night-400">{formatDate(ride.requestedAt || ride.createdAt)}</p>
        </div>
        <p className="shrink-0 text-lg font-extrabold text-night-900">{formatMoney(ride.fare)}</p>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 shrink-0 text-emerald-500" />
          <span className="truncate text-night-700">{ride.pickup?.address}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Navigation className="h-4 w-4 shrink-0 text-red-500" />
          <span className="truncate text-night-700">{ride.destination?.address}</span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-night-100 pt-3">
        <div className="flex items-center gap-3 text-xs text-night-500">
          <span>{Number(ride.distance).toFixed(1)} km</span>
          <span>•</span>
          <span>{ride.duration} min</span>
          <span>•</span>
          <span className="capitalize">{ride.rideType}</span>
          {showDriver && driverName && (
            <>
              <span>•</span>
              <span>{driverName}</span>
            </>
          )}
        </div>
        <Link
          to={`/passenger/rides/${ride._id}`}
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700"
        >
          Details <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {ride.status === "PAYMENT_COMPLETED" && ride.rating && (
        <div className="mt-2 flex items-center gap-1 text-amber-500">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          <span className="text-xs font-semibold">{ride.rating.rating}</span>
        </div>
      )}
    </div>
  );
}
