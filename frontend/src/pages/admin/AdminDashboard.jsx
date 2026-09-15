import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Car,
  Route as RouteIcon,
  CircleDollarSign,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { formatMoney, formatDate } from "../../components/RideCard";
import Spinner from "../../components/Spinner";
import api from "../../services/api";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [rides, setRides] = useState([]);

  useEffect(() => {
    api.get("/admin/stats").then(({ data }) => setStats(data)).catch(() => {});
    api.get("/admin/rides", { params: { limit: 6 } }).then(({ data }) => setRides(data.rides)).catch(() => {});
  }, []);

  if (!stats) return <Spinner />;

  const cards = [
    { icon: Users, label: "Users", value: stats.users.toLocaleString(), accent: "bg-sky-100 text-sky-600", to: "/admin/users" },
    { icon: Car, label: "Drivers", value: stats.drivers.toLocaleString(), accent: "bg-primary-100 text-primary-600", to: "/admin/drivers" },
    { icon: RouteIcon, label: "Rides", value: stats.rides.toLocaleString(), accent: "bg-violet-100 text-violet-600", to: "/admin/rides" },
    { icon: CircleDollarSign, label: "Revenue", value: formatMoney(stats.revenue), accent: "bg-emerald-100 text-emerald-600", to: "/admin/payments" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Admin overview</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} to={c.to} className="card p-5 transition hover:shadow-md">
            <span className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${c.accent}`}>
              <c.icon className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
            </span>
            <p className="text-2xl font-extrabold">{c.value}</p>
            <p className="flex items-center gap-1 text-xs text-night-400">
              {c.label} <ArrowRight className="h-3 w-3" />
            </p>
          </Link>
        ))}
      </div>

      {stats.pendingDrivers > 0 && (
        <Link
          to="/admin/drivers"
          className="card flex items-center gap-4 border-amber-200 bg-amber-50/70 p-5 transition hover:border-amber-300"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <p className="font-bold">{stats.pendingDrivers} driver{stats.pendingDrivers > 1 ? "s" : ""} awaiting approval</p>
            <p className="text-sm text-night-500">Review license and vehicle details, then approve or reject.</p>
          </div>
          <ArrowRight className="h-5 w-5 text-amber-500" />
        </Link>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent rides */}
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">Recent rides</h2>
            <Link to="/admin/rides" className="text-sm font-semibold text-primary-600 hover:text-primary-700">
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {rides.length === 0 && <p className="py-6 text-center text-sm text-night-400">No rides yet.</p>}
            {rides.map((r) => (
              <div key={r._id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-night-50">
                <span className="font-mono text-xs text-night-400">#{r.rideNumber}</span>
                <span className="flex-1 truncate">{r.passengerId?.name || "—"}</span>
                <span className="hidden truncate text-night-400 sm:block">{r.driverId?.userId?.name || "unassigned"}</span>
                <span className="font-bold">{formatMoney(r.fare)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Platform health */}
        <div className="card p-5">
          <h2 className="mb-3 font-bold">Platform health</h2>
          <div className="grid grid-cols-2 gap-3 text-center">
            {[
              [formatMoney(stats.commission), "commission earned"],
              [stats.openTickets, "open tickets"],
              [stats.pendingDrivers, "pending drivers"],
              [stats.users - stats.drivers, "passengers"],
            ].map(([v, l]) => (
              <div key={l} className="rounded-xl bg-night-50 p-4">
                <p className="text-xl font-extrabold text-primary-500">{v}</p>
                <p className="text-xs text-night-400">{l}</p>
              </div>
            ))}
          </div>
          <Link to="/admin/analytics" className="btn-ghost mt-4 w-full !py-2.5 text-sm">
            Open analytics <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
