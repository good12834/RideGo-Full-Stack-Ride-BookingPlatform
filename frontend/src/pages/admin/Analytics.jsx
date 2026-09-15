import { useEffect, useState } from "react";
import Spinner from "../../components/Spinner";
import { formatMoney } from "../../components/RideCard";
import { useToast } from "../../components/Toast";
import api from "../../services/api";

function DailyChart({ data }) {
  if (!data.length) return <p className="py-10 text-center text-sm text-night-400">No ride activity in this period.</p>;
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex h-52 items-end gap-1.5 overflow-x-auto">
      {data.map((d) => (
        <div key={d._id} className="flex min-w-8 flex-1 flex-col items-center gap-1.5" title={`${d._id}: ${d.count} rides, ${formatMoney(d.revenue)}`}>
          <span className="text-[10px] font-bold text-night-500">{d.count}</span>
          <div className="flex w-full max-w-9 flex-col justify-end" style={{ height: "100%" }}>
            <div className="rounded-t bg-primary-500" style={{ height: `${(d.count / max) * 88}%` }} />
            <div className="rounded-t bg-emerald-400" style={{ height: `${(d.completed / max) * 88}%`, marginTop: 1 }} />
            <div className="rounded-t bg-red-300" style={{ height: `${(d.cancelled / max) * 88}%`, marginTop: 1 }} />
          </div>
          <span className="whitespace-nowrap text-[9px] text-night-400">{d._id.slice(5)}</span>
        </div>
      ))}
    </div>
  );
}

export default function Analytics() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [days, setDays] = useState(14);

  useEffect(() => {
    api
      .get("/admin/analytics", { params: { days } })
      .then(({ data }) => setData(data))
      .catch((err) => toast.error(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  if (!data) return <Spinner />;

  const totalRides = data.ridesByDay.reduce((s, d) => s + d.count, 0);
  const totalRevenue = data.ridesByDay.reduce((s, d) => s + d.revenue, 0);
  const totalCancelled = data.ridesByDay.reduce((s, d) => s + d.cancelled, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight">Analytics</h1>
        <div className="flex rounded-xl bg-night-100 p-1">
          {[7, 14, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                days === d ? "bg-white text-primary-600 shadow-sm" : "text-night-500"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          [totalRides.toLocaleString(), "rides requested"],
          [formatMoney(totalRevenue), "gross fares"],
          [totalRides ? `${((totalCancelled / totalRides) * 100).toFixed(1)}%` : "0%", "cancellation rate"],
        ].map(([v, l]) => (
          <div key={l} className="card p-5 text-center">
            <p className="text-2xl font-extrabold text-primary-500">{v}</p>
            <p className="text-xs text-night-400">{l}</p>
          </div>
        ))}
      </div>

      <div className="card p-6">
        <div className="mb-4 flex flex-wrap items-center gap-4 text-xs font-semibold text-night-500">
          <h2 className="text-base font-bold text-night-900">Ride activity</h2>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-primary-500" /> requested</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-emerald-400" /> completed</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-red-300" /> cancelled</span>
        </div>
        <DailyChart data={data.ridesByDay} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Ride types */}
        <div className="card p-6">
          <h2 className="mb-4 font-bold">Ride types</h2>
          <div className="space-y-3">
            {data.byRideType.length === 0 && <p className="text-sm text-night-400">No data yet.</p>}
            {data.byRideType.map((t) => {
              const total = data.byRideType.reduce((s, x) => s + x.count, 0) || 1;
              return (
                <div key={t._id}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-semibold capitalize">{t._id}</span>
                    <span className="text-night-400">
                      {t.count} rides • {formatMoney(t.revenue)}
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-night-100">
                    <div className="h-full rounded-full bg-primary-500" style={{ width: `${(t.count / total) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top drivers */}
        <div className="card p-6">
          <h2 className="mb-4 font-bold">Top drivers</h2>
          <div className="space-y-3">
            {data.topDrivers.length === 0 && <p className="text-sm text-night-400">No trips yet.</p>}
            {data.topDrivers.map((d, i) => (
              <div key={d._id} className="flex items-center gap-3">
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-extrabold ${
                  i === 0 ? "bg-amber-100 text-amber-600" : "bg-night-100 text-night-500"
                }`}>
                  {i + 1}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-bold">{d.userId?.name}</p>
                  <p className="text-xs text-night-400">{d.totalTrips} trips • {Number(d.rating).toFixed(1)} rating</p>
                </div>
                <p className="text-sm font-extrabold text-emerald-600">{formatMoney(d.totalEarnings)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
