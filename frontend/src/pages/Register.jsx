import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Car,
  Mail,
  User as UserIcon,
  Phone,
  IdCard,
  CarFront,
  BadgeCheck,
  MapPin,
  Pause,
  Play,
  Camera,
  UserPlus,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { API_URL } from "../services/api";
import PasswordInput from "../components/PasswordInput";

// How long each hero photo stays on screen (also drives the progress bar + slow zoom)
const SLIDE_INTERVAL = 5600;

// Unsplash backdrop for the register hero panel — photos crossfade in/out.
// Community & "getting started" theme, with images chosen to differ from the login page.
const PANEL_SLIDES = [
  {
    id: "street",
    image:
      "https://images.unsplash.com/photo-1629365629002-a8fb256fdff6?w=500&auto",
    alt: "People walking past colorful storefronts on a sunny city street",
    eyebrow: "Live in 40+ cities",
    headline: "Thousands of riders and drivers are already on the road.",
  },
  {
    id: "plaza",
    image:
      "https://images.unsplash.com/photo-1564760623593-f9f451e231d0?w=500&auto=format&fit=crop&q=",
    alt: "A crowd of people gathered in a sunny urban plaza",
    eyebrow: "Built for communities",
    headline: "A plaza full of people, all connected by one app.",
  },
  {
    id: "modern",
    image:
      "https://images.unsplash.com/photo-1605194173943-9167005d9dfc?w=500&auto=format&fit=crop&q=60&ixlib=",
    alt: "People standing near modern glass buildings under a bright sky",
    eyebrow: "Every block covered",
    headline: "From downtown high-rises to leafy neighborhoods.",
  },
  {
    id: "square",
    image:
      "https://images.unsplash.com/photo-1669673299547-19d9b7744fd8?w=500&auto=format&fit=crop&q=60&ixlib=",
    alt: "A historic European city square bustling with people",
    eyebrow: "City by city",
    headline: "Expanding where it matters, block by block.",
  },
  {
    id: "walkers",
    image:
      "https://images.unsplash.com/photo-1778077796673-70997431465e?w=500&auto=format&fit=crop&q=",
    alt: "A group walking together along a tree-lined city street",
    eyebrow: "Fast • Safe • Affordable",
    headline: "Your first ride is just the start of the journey.",
  },
];

// Soft backdrop behind the register form — a rider opening the ride app on their phone
// (kept bright so the inputs stay readable beneath the glass card)
const FORM_PANEL_BG =
  "https://images.unsplash.com/photo-1514749204155-24e484635226?w=500&auto=format&fit=crop&q=";

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

  // Hero photo slideshow on the left panel
  const [slideIdx, setSlideIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const slide = PANEL_SLIDES[slideIdx];

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
          await fetch(`${API_URL}/driver/vehicles`, {
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

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      setSlideIdx((i) => (i + 1) % PANEL_SLIDES.length);
    }, SLIDE_INTERVAL);
    return () => clearInterval(t);
  }, [playing]);

  // Warm the cache for the next photo so every crossfade is instant
  useEffect(() => {
    const next = PANEL_SLIDES[(slideIdx + 1) % PANEL_SLIDES.length];
    const img = new Image();
    img.src = next.image;
  }, [slideIdx]);

  return (
    <div className="flex min-h-screen">
      {/* Left panel — crossfading Unsplash backdrop */}
      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-night-950 p-12 text-white lg:flex">
        {/* Photos fade in/out with a slow Ken Burns zoom */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <AnimatePresence initial={false} mode="sync">
            <motion.img
              key={slide.id}
              src={slide.image}
              alt=""
              loading={slideIdx === 0 ? "eager" : "lazy"}
              decoding="async"
              initial={{ opacity: 0, scale: 1.12 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                opacity: { duration: 1.4, ease: "easeInOut" },
                scale: { duration: SLIDE_INTERVAL / 1000 + 1.4, ease: "linear" },
              }}
              className="absolute inset-0 h-full w-full object-cover"
            />
          </AnimatePresence>
        </div>

        {/* Brand tint + readability gradients */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-night-950 via-night-950/85 to-night-950/20" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-night-950 via-night-950/70 to-transparent" />
        <div className="pointer-events-none absolute -left-24 top-1/3 h-96 w-96 rounded-full bg-primary-500/25 blur-3xl" />

        <Link to="/" className="relative flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500">
            <Car className="h-5 w-5" />
          </span>
          <span className="text-xl font-extrabold">
            Ride<span className="text-primary-400">Go</span>
          </span>
        </Link>

        <div className="relative">
          <h2 className="text-4xl font-black leading-tight drop-shadow-lg">
            Welcome to RideGo.
            <br />
            <span className="text-primary-400">Your first ride starts here.</span>
          </h2>

          {/* Caption swaps in step with the photo behind it */}
          <div className="mt-6 min-h-[86px] max-w-md">
            <AnimatePresence mode="wait">
              <motion.div
                key={slide.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              >
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary-200 backdrop-blur-md">
                  <MapPin className="h-3 w-3" />
                  {slide.eyebrow}
                </span>
                <p className="mt-3 text-sm font-medium text-night-200">{slide.headline}</p>
              </motion.div>
            </AnimatePresence>
          </div>

          <p className="mt-2 max-w-sm text-sm text-night-400">
            Join thousands of riders and drivers moving through the city together.
          </p>
        </div>

        <div className="relative space-y-4">
          <div className="flex items-center gap-2">
            {PANEL_SLIDES.map((s, i) => {
              const isActive = i === slideIdx;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSlideIdx(i)}
                  aria-label={`Show background ${i + 1}: ${s.eyebrow}`}
                  aria-current={isActive ? "true" : undefined}
                  className={`relative h-1.5 overflow-hidden rounded-full transition-all duration-500 ${
                    isActive ? "w-10 bg-white/25" : "w-3 bg-white/20 hover:bg-white/40"
                  }`}
                >
                  {isActive && (
                    <motion.span
                      key={`${s.id}-${playing ? "run" : "hold"}`}
                      initial={{ scaleX: playing ? 0 : 1 }}
                      animate={{ scaleX: 1 }}
                      transition={{
                        duration: playing ? SLIDE_INTERVAL / 1000 : 0,
                        ease: "linear",
                      }}
                      className="absolute inset-0 origin-left bg-primary-400"
                    />
                  )}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? "Pause background slideshow" : "Play background slideshow"}
              className="ml-1 flex h-6 w-6 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white/80 backdrop-blur-md transition hover:bg-white/25 hover:text-white"
            >
              {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-night-400">Fast • Safe • Affordable</p>
            <a
              href="https://unsplash.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-night-500 transition hover:text-night-300"
            >
              <Camera className="h-3 w-3" />
              Photos from Unsplash
            </a>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-night-50 px-4 py-12">
        {/* Washed-out Unsplash backdrop */}
        <img
          src={FORM_PANEL_BG}
          alt=""
          aria-hidden="true"
          loading="eager"
          decoding="async"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/80 via-white/85 to-white/95" />
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-primary-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-primary-100/50 blur-3xl" />

        <div className="relative w-full max-w-md rounded-3xl border border-white/70 bg-white/80 p-6 shadow-card backdrop-blur-xl sm:p-8">
          <Link to="/" className="mb-8 flex items-center justify-center gap-2.5 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-500 text-white">
              <Car className="h-5 w-5" />
            </span>
            <span className="text-lg font-extrabold">
              Ride<span className="text-primary-500">Go</span>
            </span>
          </Link>

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

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-night-700">Full name</label>
              <div className="relative">
                <UserIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-night-400" />
                <input
                  className="input-base pl-11"
                  placeholder="Jane Doe"
                  value={form.name}
                  onChange={set("name")}
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-night-700">Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-night-400" />
                <input
                  type="email"
                  className="input-base pl-11"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={set("email")}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-night-700">Password</label>
                <PasswordInput
                  placeholder="••••••••"
                  minLength={6}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={set("password")}
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-night-700">Phone</label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-night-400" />
                  <input
                    type="tel"
                    className="input-base pl-11"
                    placeholder="(555) 123-4567"
                    value={form.phone}
                    onChange={set("phone")}
                  />
                </div>
              </div>
            </div>

            {role === "driver" && (
              <div className="space-y-3 rounded-2xl border border-dashed border-night-200 bg-night-50 p-4">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-night-400">
                  <IdCard className="h-3.5 w-3.5" /> License details
                </p>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-night-600">License number</label>
                  <div className="relative">
                    <IdCard className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-night-400" />
                    <input
                      className="input-base pl-11"
                      placeholder="DL-12345678"
                      value={form.licenseNumber}
                      onChange={set("licenseNumber")}
                    />
                  </div>
                </div>

                <p className="flex items-center gap-2 pt-1 text-xs font-bold uppercase tracking-wider text-night-400">
                  <CarFront className="h-3.5 w-3.5" /> Vehicle (optional at signup)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-night-600">Make</label>
                    <input
                      className="input-base"
                      placeholder="Make"
                      value={form.vehicleMake}
                      onChange={set("vehicleMake")}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-night-600">Model</label>
                    <input
                      className="input-base"
                      placeholder="Model"
                      value={form.vehicleModel}
                      onChange={set("vehicleModel")}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-night-600">Year</label>
                    <input
                      className="input-base"
                      type="number"
                      placeholder="Year"
                      value={form.vehicleYear}
                      onChange={set("vehicleYear")}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-night-600">Color</label>
                    <input
                      className="input-base"
                      placeholder="Color"
                      value={form.vehicleColor}
                      onChange={set("vehicleColor")}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-night-600">Plate number</label>
                    <input
                      className="input-base"
                      placeholder="Plate number"
                      value={form.vehiclePlate}
                      onChange={set("vehiclePlate")}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-night-600">Type</label>
                    <select className="input-base" value={form.vehicleType} onChange={set("vehicleType")}>
                      <option value="economy">Economy</option>
                      <option value="comfort">Comfort</option>
                      <option value="xl">XL</option>
                    </select>
                  </div>
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
              <UserPlus className="h-4 w-4" /> {busy ? "Creating account..." : "Create account"}
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
