import { useState, useRef, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  Car,
  Menu,
  X,
  User as UserIcon,
  LayoutDashboard,
  LogOut,
  Sparkles,
  ShieldCheck,
  CircleDot,
  CreditCard,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../hooks/useSocket";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function onClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const links = [
    { to: "/", label: "Home" },
    { to: "/about", label: "About & Tech" },
  ];
  if (user?.role === "passenger") links.splice(1, 0, { to: "/passenger", label: "Rides" });
  if (user?.role === "driver") links.splice(1, 0, { to: "/driver", label: "Drive" });

  const dashboardPath =
    user?.role === "admin"
      ? "/admin"
      : user?.role === "driver"
        ? "/driver"
        : user?.role === "passenger"
          ? "/passenger"
          : "/login";

  function handleLogout() {
    logout();
    setMenuOpen(false);
    navigate("/");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-night-100 bg-white/90 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5 group">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary-500 to-amber-400 text-white shadow-glow transition group-hover:scale-105">
            <Car className="h-5 w-5" />
          </span>
          <div className="flex flex-col">
            <span className="text-lg font-black tracking-tight text-night-900 leading-none">
              Ride<span className="text-primary-500">Go</span>
            </span>
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-primary-600">
              AI Mobility
            </span>
          </div>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `rounded-lg px-3.5 py-2 text-sm font-bold transition ${
                  isActive
                    ? "bg-primary-50 text-primary-600"
                    : "text-night-600 hover:bg-night-50 hover:text-night-900"
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
          <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
            <ShieldCheck className="h-3 w-3" /> Stripe Protected
          </span>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <span
                className={`flex items-center gap-1.5 text-xs font-bold ${
                  connected ? "text-emerald-600" : "text-night-400"
                }`}
                title={connected ? "Realtime connected" : "Reconnecting..."}
              >
                <CircleDot className={`h-3.5 w-3.5 ${connected ? "ridego-pulse" : ""}`} />
                {connected ? "AI Live" : "Offline"}
              </span>
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-xl border border-night-200 bg-white py-1.5 pl-1.5 pr-3 text-sm font-semibold text-night-700 transition hover:border-night-300 shadow-sm"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-100 text-primary-600 font-bold text-xs">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                  {user.name.split(" ")[0]}
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-2xl border border-night-100 bg-white shadow-2xl">
                    <div className="border-b border-night-100 bg-night-50/70 px-4 py-3">
                      <p className="truncate text-sm font-bold text-night-900">{user.name}</p>
                      <p className="truncate text-xs text-night-500">{user.email}</p>
                    </div>
                    <Link
                      to={dashboardPath}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-night-700 hover:bg-night-50 transition"
                    >
                      <LayoutDashboard className="h-4 w-4 text-primary-500" /> Dashboard
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50 transition"
                    >
                      <LogOut className="h-4 w-4" /> Log out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost !py-2 !text-xs font-bold">
                Login
              </Link>
              <Link to="/register" className="btn-primary !py-2 !text-xs font-bold shadow-glow">
                Sign up
              </Link>
            </>
          )}
        </div>

        <button
          className="rounded-lg p-2 text-night-700 hover:bg-night-50 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-night-100 bg-white px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-semibold text-night-700 hover:bg-night-50"
              >
                {l.label}
              </Link>
            ))}
            {user ? (
              <>
                <Link
                  to={dashboardPath}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-semibold text-night-700 hover:bg-night-50"
                >
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  Log out
                </button>
              </>
            ) : (
              <div className="mt-2 flex gap-2">
                <Link to="/login" className="btn-ghost flex-1 !py-2.5">
                  Login
                </Link>
                <Link to="/register" className="btn-primary flex-1 !py-2.5">
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
