import { useEffect, useState } from "react";
import { XCircle } from "lucide-react";
import Spinner from "../../components/Spinner";
import StatusBadge from "../../components/StatusBadge";
import { formatMoney, formatDate } from "../../components/RideCard";
import { useToast } from "../../components/Toast";
import api from "../../services/api";

const STATUSES = ["", "SEARCHING_DRIVER", "DRIVER_ASSIGNED", "TRIP_STARTED", "TRIP_COMPLETED", "PAYMENT_COMPLETED", "CANCELLED"];

export default function Rides() {
  const toast = useToast();
  const [rides, setRides] = useState([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/rides", { params: { status: status || undefined, limit: 50 } });
      setRides(data.rides);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function forceCancel(ride) {
    if (!window.confirm(`Force cancel ride #${ride.rideNumber}?`)) return;
    try {
      await api.put(`/admin/rides/${ride._id}/cancel`, { reason: "Cancelled by admin" });
      toast.success("Ride cancelled");
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  const active = ["REQUESTED", "SEARCHING_DRIVER", "DRIVER_ASSIGNED", "DRIVER_ARRIVING", "DRIVER_ARRIVED", "TRIP_STARTED"];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">Rides</h1>
        <select className="input-base !w-56 !py-2.5" value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s ? s.replaceAll("_", " ") : "All statuses"}
            </option>
          ))}
        </select>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-200 text-sm">
          <thead>
            <tr className="border-b border-night-100 text-left text-xs uppercase tracking-wide text-night-400">
              <th className="px-5 py-3.5">Ride</th>
              <th className="px-5 py-3.5">Passenger</th>
              <th className="px-5 py-3.5">Driver</th>
              <th className="px-5 py-3.5">Route</th>
              <th className="px-5 py-3.5">Date</th>
              <th className="px-5 py-3.5">Fare</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="py-10 text-center text-night-400">Loading...</td></tr>
            ) : rides.length === 0 ? (
              <tr><td colSpan={8} className="py-10 text-center text-night-400">No rides found.</td></tr>
            ) : (
              rides.map((r) => (
                <tr key={r._id} className="border-b border-night-50 last:border-0 hover:bg-night-50/60">
                  <td className="px-5 py-3.5 font-mono text-xs">#{r.rideNumber}</td>
                  <td className="px-5 py-3.5">{r.passengerId?.name || "—"}</td>
                  <td className="px-5 py-3.5 text-night-500">{r.driverId?.userId?.name || "unassigned"}</td>
                  <td className="max-w-60 px-5 py-3.5">
                    <p className="truncate text-night-600">{r.pickup?.address}</p>
                    <p className="truncate text-xs text-night-400">→ {r.destination?.address}</p>
                  </td>
                  <td className="px-5 py-3.5 text-night-500">{formatDate(r.requestedAt || r.createdAt)}</td>
                  <td className="px-5 py-3.5 font-bold">{formatMoney(r.fare)}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={r.status} /></td>
                  <td className="px-5 py-3.5 text-right">
                    {active.includes(r.status) && (
                      <button className="btn-ghost !px-3 !py-1.5 text-xs !text-red-500" onClick={() => forceCancel(r)}>
                        <XCircle className="h-3.5 w-3.5" /> Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
