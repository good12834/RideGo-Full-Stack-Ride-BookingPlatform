import { Star, CarFront, Phone, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function DriverCard({ driver, vehicle, ridePin }) {
  const { user } = useAuth();

  return (
    <div className="card p-5">
      <div className="flex items-center gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-100 text-primary-600">
          <CarFront className="h-7 w-7" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-bold">{driver?.name || "Your driver"}</p>
            <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-600">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              {Number(driver?.rating || 5).toFixed(1)}
            </span>
          </div>
          <p className="truncate text-sm text-night-500">
            {vehicle ? `${vehicle.color} ${vehicle.make} ${vehicle.model}` : "On the way"}
          </p>
        </div>
        {vehicle && (
          <span className="shrink-0 rounded-xl bg-night-100 px-3 py-1.5 font-mono text-sm font-bold tracking-wider">
            {vehicle.plateNumber}
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {driver?.phone && (
          <a href={`tel:${driver.phone}`} className="btn-ghost !py-2.5 text-sm">
            <Phone className="h-4 w-4" /> Contact
          </a>
        )}
        <a
          href={`sms:${user?.trustedContacts?.[0]?.phone || ""}?body=${encodeURIComponent(
            `I'm riding with ${driver?.name || "a driver"} (${vehicle?.plateNumber || "plate n/a"}). Track me: Ride #${ridePin ? ridePin : ""}`
          )}`}
          className="btn-ghost !py-2.5 text-sm"
        >
          <ShieldCheck className="h-4 w-4" /> Share trip
        </a>
      </div>
    </div>
  );
}
