import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Car, Mail, Lock, User as UserIcon, Phone, IdCard, CarFront, BadgeCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";

export default function Register() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [role, setRole] = useState("passenger");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    licenseNumber: "",
    vehicleMake: "",
    vehicleModel: "",
    vehicleYear: "",
    vehicleColor: "",
    vehiclePlate: "",
    vehicleType: "economy",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const payload = {
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone,
        role,
      };
      if (role === "driver") payload.licenseNumber = form.licenseNumber || "PENDING";
      const user = await register(payload);

      // If a driver provided vehicle details, save the first vehicle
      if (role === "driver" && form.vehicleMake && form.vehicleModel) {
        try {
          const fd = new FormData();
          fd.append("make", form.vehicleMake);
          fd.append("model", form.vehicleModel);
          fd.append("year", form.vehicleYear || new Date().getFullYear());
          fd.append("color", form.vehicleColor || "White");
          fd.append("plateNumber", form.vehiclePlate || `TMP-${Date.now() % 10000}`);
          fd.append("vehicleType", form.vehicleType);
          await fetch("http://localhost:5000/api/driver/vehicles", {
            method: "POST",
            headers: { Authorization: `Bearer ${localStorage.getItem("ridego_token")}` },
            body: fd,
          });
        } catch {
          /* vehicle optional at signup */
        }
      }

      toast.success(`Welcome to RideGo, ${user.name.split(" ")[0]}!`);
      navigate(user.role === "driver" ? "/driver" : "/passenger", { replace: true });
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-night-950 p-12 text-white lg:flex">
        <div className="pointer-events-none absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-primary-500/20 blur-3xl" />
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
            Join thousands
            <br />
            <span className="text-primary-400">riding & earning.</span>
          </h2>
          <p className="mt-4 max-w-sm text-night-400">
            Riders get upfront fares and live tracking. Drivers keep 90% of every fare and get paid
            weekly.
          </p>
        </div>
        <p className="relative text-sm text-night-500">Fast • Safe • Affordable</p>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-extrabold">Create your account</h1>
          <p className="mt-1 text-sm text-night-500">Join as a rider or a driver.</p>

          <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl bg-night-100 p-1.5">
            {[
              { id: "passenger", label: "I need rides" },
              { id: "driver", label: "I want to drive" },
            ].map((r) => (
              <button
                key={r.id}
                onClick={() => setRole(r.id)}
                className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                  role === r.id ? "bg-white text-primary-600 shadow-card" : "text-night-500"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-5 space-y-4">
            <div className="relative">
              <UserIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-night-400" />
              <input className="input-base pl-11" placeholder="Full name" value={form.name} onChange={set("name")} required />
            </div>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-night-400" />
              <input type="email" className="input-base pl-11" placeholder="Email" value={form.email} onChange={set("email")} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-night-400" />
                <input type="password" className="input-base pl-11" placeholder="Password" minLength={6} value={form.password} onChange={set("password")} required />
              </div>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-night-400" />
                <input className="input-base pl-11" placeholder="Phone" value={form.phone} onChange={set("phone")} />
              </div>
            </div>

            {role === "driver" && (
              <div className="space-y-3 rounded-2xl border border-dashed border-night-200 bg-night-50 p-4">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-night-400">
                  <IdCard className="h-3.5 w-3.5" /> Driver details
                </p>
                <input className="input-base" placeholder="Driver license number" value={form.licenseNumber} onChange={set("licenseNumber")} />
                <p className="flex items-center gap-2 pt-1 text-xs font-bold uppercase tracking-wider text-night-400">
                  <CarFront className="h-3.5 w-3.5" /> Vehicle (optional now)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <input className="input-base" placeholder="Make" value={form.vehicleMake} onChange={set("vehicleMake")} />
                  <input className="input-base" placeholder="Model" value={form.vehicleModel} onChange={set("vehicleModel")} />
                  <input className="input-base" placeholder="Year" type="number" value={form.vehicleYear} onChange={set("vehicleYear")} />
                  <input className="input-base" placeholder="Color" value={form.vehicleColor} onChange={set("vehicleColor")} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input className="input-base" placeholder="Plate number" value={form.vehiclePlate} onChange={set("vehiclePlate")} />
                  <select className="input-base" value={form.vehicleType} onChange={set("vehicleType")}>
                    <option value="economy">Economy</option>
                    <option value="comfort">Comfort</option>
                    <option value="xl">XL</option>
                  </select>
                </div>
                <p className="flex items-start gap-1.5 text-xs text-night-400">
                  <BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-500" />
                  Driver accounts are reviewed and approved by an admin before going online.
                </p>
              </div>
            )}

            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{error}</p>
            )}

            <button type="submit" className="btn-primary w-full" disabled={busy}>
              {busy ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-night-500">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
