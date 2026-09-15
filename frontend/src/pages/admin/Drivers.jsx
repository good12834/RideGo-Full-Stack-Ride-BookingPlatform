import { useEffect, useState } from "react";
import { Check, X, Pause, CarFront, Star } from "lucide-react";
import Spinner from "../../components/Spinner";
import StatusBadge from "../../components/StatusBadge";
import { useToast } from "../../components/Toast";
import api from "../../services/api";

export default function Drivers() {
  const toast = useToast();
  const [drivers, setDrivers] = useState([]);
  const [status, setStatus] = useState("PENDING");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/drivers", { params: { status: status || undefined } });
      setDrivers(data.drivers);
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

  async function act(driver, action, extra = {}) {
    try {
      await api.put(`/admin/drivers/${driver._id}/${action}`, extra);
      toast.success(`Driver ${action}d`);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  function rejectWithReason(driver) {
    const reason = window.prompt("Reason for rejection:", "Does not meet requirements");
    if (reason === null) return;
    act(driver, "reject", { reason });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">Drivers</h1>
        <div className="flex rounded-xl bg-night-100 p-1">
          {["PENDING", "APPROVED", "SUSPENDED", "REJECTED", ""].map((s) => (
            <button
              key={s || "all"}
              onClick={() => setStatus(s)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                status === s ? "bg-white text-primary-600 shadow-sm" : "text-night-500"
              }`}
            >
              {s || "ALL"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : drivers.length === 0 ? (
        <div className="card p-10 text-center text-night-400">No drivers in this state.</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {drivers.map((d) => (
            <div key={d._id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-100 font-bold text-primary-600">
                    {d.userId?.name?.slice(0, 1)}
                  </span>
                  <div>
                    <p className="font-bold">{d.userId?.name}</p>
                    <p className="text-xs text-night-400">{d.userId?.email}</p>
                  </div>
                </div>
                <StatusBadge status={d.status} />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-night-500">
                <span className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  {Number(d.rating).toFixed(1)} ({d.ratingCount})
                </span>
                <span>{d.totalTrips} trips</span>
                <span>License: {d.licenseNumber}</span>
                {d.userId?.isBlocked && <span className="badge bg-red-100 text-red-700">User blocked</span>}
              </div>

              {d.vehicles?.length > 0 && (
                <div className="mt-3 space-y-2">
                  {d.vehicles.map((v) => (
                    <div key={v._id} className="flex items-center gap-3 rounded-xl bg-night-50 px-3 py-2 text-sm">
                      <CarFront className="h-4 w-4 text-night-400" />
                      <span className="flex-1">
                        {v.color} {v.make} {v.model} ({v.year})
                      </span>
                      <span className="font-mono text-xs font-bold">{v.plateNumber}</span>
                      <span className="badge bg-night-100 text-night-500 capitalize">{v.vehicleType}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {d.status !== "APPROVED" && (
                  <button className="btn-primary !py-2 text-xs" onClick={() => act(d, "approve")}>
                    <Check className="h-3.5 w-3.5" /> Approve
                  </button>
                )}
                {d.status === "PENDING" && (
                  <button className="btn-ghost !py-2 text-xs !text-red-500" onClick={() => rejectWithReason(d)}>
                    <X className="h-3.5 w-3.5" /> Reject
                  </button>
                )}
                {d.status === "APPROVED" && (
                  <button className="btn-ghost !py-2 text-xs !text-amber-600" onClick={() => act(d, "suspend")}>
                    <Pause className="h-3.5 w-3.5" /> Suspend
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
