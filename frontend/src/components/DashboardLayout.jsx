import { useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { Car, Menu, X, LogOut, CircleDot } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../hooks/useSocket";

export default function DashboardLayout({ nav, brand }) {
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate("/");
  }

  const navItems = nav.map((item) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.end}
      onClick={() => setOpen(false)}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
          isActive
            ? "bg-primary-500 text-white shadow-glow"
            : "text-night-600 hover:bg-night-100 hover:text-night-900"
        }`
      }
    >
      <item.icon className="h-4.5 w-4.5 shrink-0" style={{ width: 18, height: 18 }} />
      {item.label}
    </NavLink>
  ));

  return (
    <div className="flex min-h-screen bg-night-50">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-night-100 bg-white lg:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-night-100 px-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-500 text-white">
            <Car className="h-5 w-5" />
          </span>
          <div>
            <p className="font-extrabold leading-tight">
              Ride<span className="text-primary-500">Go</span>
            </p>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-night-400">
              {brand || user?.role}
            </p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">{navItems}</nav>
        <div className="border-t border-night-100 p-3">
          <div className="mb-2 flex items-center gap-1.5 px-2 text-xs font-semibold text-night-400">
            <CircleDot className={`h-3 w-3 ${connected ? "text-emerald-500 ridego-pulse" : ""}`} />
            {connected ? "Realtime connected" : "Reconnecting..."}
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-night-950/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-white shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-night-100 px-5">
              <p className="font-extrabold">
                Ride<span className="text-primary-500">Go</span>
              </p>
              <button onClick={() => setOpen(false)} className="rounded-lg p-2 hover:bg-night-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto p-3">{navItems}</nav>
            <div className="border-t border-night-100 p-3">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" /> Log out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-night-100 bg-white/85 px-4 backdrop-blur-xl sm:px-6">
          <button
            className="rounded-lg p-2 hover:bg-night-100 lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-3">
            <span className="hidden text-sm font-semibold text-night-500 sm:block">
              {location.pathname.startsWith("/admin") ? "Admin panel" : user?.name}
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-100 text-sm font-bold text-primary-600">
              {user?.name?.slice(0, 1) || "U"}
            </span>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
