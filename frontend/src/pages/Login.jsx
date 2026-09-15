import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Car, Mail, Lock, LogIn } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const DEMOS = [
  { label: "Passenger", email: "alex@ridego.dev", password: "alex123" },
  { label: "Driver", email: "michael@ridego.dev", password: "driver123" },
  { label: "Admin", email: "admin@ridego.dev", password: "admin123" },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function dashboardFor(user) {
    if (user.role === "admin") return "/admin";
    if (user.role === "driver") return "/driver";
    return location.state?.from || "/passenger";
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const user = await login(email, password);
      navigate(dashboardFor(user), { replace: true });
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  async function quickFill(demo) {
    setEmail(demo.email);
    setPassword(demo.password);
    setBusy(true);
    setError("");
    try {
      const user = await login(demo.email, demo.password);
      navigate(dashboardFor(user), { replace: true });
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-night-950 p-12 text-white lg:flex">
        <div className="pointer-events-none absolute -left-24 top-1/3 h-96 w-96 rounded-full bg-primary-500/20 blur-3xl" />
        <Link to="/" className="relative flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500">
            <Car className="h-5 w-5" />
          </span>
          <span className="text-xl font-extrabold">
            Ride<span className="text-primary-400">Go</span>
          </span>
        </Link>
        <div className="relative">
          <h2 className="text-4xl font-black leading-tight">
            Welcome back.
            <br />
            <span className="text-primary-400">Let's get moving.</span>
          </h2>
          <p className="mt-4 max-w-sm text-night-400">
            Log in to book rides, track drivers live, manage your fleet or run the platform.
          </p>
        </div>
        <p className="relative text-sm text-night-500">Fast • Safe • Affordable</p>
      </div>

      {/* Form */}
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 flex items-center justify-center gap-2.5 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-500 text-white">
              <Car className="h-5 w-5" />
            </span>
            <span className="text-lg font-extrabold">
              Ride<span className="text-primary-500">Go</span>
            </span>
          </Link>

          <h1 className="text-2xl font-extrabold">Log in to RideGo</h1>
          <p className="mt-1 text-sm text-night-500">Enter your credentials to continue.</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-night-700">Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-night-400" />
                <input
                  type="email"
                  required
                  className="input-base pl-11"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-night-700">Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-night-400" />
                <input
                  type="password"
                  required
                  className="input-base pl-11"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{error}</p>
            )}

            <button type="submit" className="btn-primary w-full" disabled={busy}>
              <LogIn className="h-4 w-4" /> {busy ? "Logging in..." : "Log in"}
            </button>
          </form>

          <div className="mt-6 rounded-2xl border border-dashed border-night-200 bg-night-50 p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-night-400">
              Demo accounts
            </p>
            <div className="grid grid-cols-3 gap-2">
              {DEMOS.map((d) => (
                <button
                  key={d.label}
                  onClick={() => quickFill(d)}
                  disabled={busy}
                  className="rounded-xl border border-night-200 bg-white px-3 py-2 text-xs font-semibold text-night-700 transition hover:border-primary-300 hover:text-primary-600 disabled:opacity-50"
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-night-500">
            New to RideGo?{" "}
            <Link to="/register" className="font-semibold text-primary-600 hover:text-primary-700">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
