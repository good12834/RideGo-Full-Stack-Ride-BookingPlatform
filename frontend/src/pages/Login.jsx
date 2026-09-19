import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Car, Mail, LogIn, MapPin, Pause, Play, Camera, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import PasswordInput from "../components/PasswordInput";

// How long each hero photo stays on screen (also drives the progress bar + slow zoom)
const SLIDE_INTERVAL = 5600;

// Unsplash backdrop for the login hero panel — photos crossfade in/out
const PANEL_SLIDES = [
  {
    id: "city",
    image: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1600&auto=format&fit=crop&q=70",
    alt: "Downtown avenue packed with yellow taxis between skyscrapers",
    eyebrow: "Live in 40+ cities",
    headline: "Every corner of town is covered, block by block.",
  },
  {
    id: "driver",
    image: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=1600&auto=format&fit=crop&q=70",
    alt: "Driver's hands on the steering wheel with evening city lights through the windscreen",
    eyebrow: "24/7 driver network",
    headline: "Vetted local drivers, ready long after dark.",
  },
  {
    id: "highway",
    image: "https://images.unsplash.com/photo-1601960882468-6becabf6f58a?w=500&auto=format&fit=crop&q=",
    alt: "Open highway running towards distant mountains under a clear sky",
    eyebrow: "Long distance ready",
    headline: "Airport runs and road trips at upfront fares.",
  },
  {
    id: "fleet",
    image: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=1600&auto=format&fit=crop&q=70",
    alt: "Seven-seat white SUV waiting on a scenic desert road",
    eyebrow: "Economy to XL",
    headline: "Pick the fleet that fits your trip and your luggage.",
  },
  {
    id: "premium",
    image: "https://images.unsplash.com/photo-1502161254066-6c74afbf07aa?w=1600&auto=format&fit=crop&q=70",
    alt: "Premium sports car parked at dusk",
    eyebrow: "Comfort & premium",
    headline: "Upgrade the ride when you want to arrive in style.",
  },
];

// Soft backdrop behind the login form (kept bright so inputs stay readable)
const FORM_PANEL_BG =
  "https://images.unsplash.com/photo-1599278340576-bff6a4c8f3a1?w=500&auto=format&fit=crop&q=60&ixlib=";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Hero photo slideshow on the left panel
  const [slideIdx, setSlideIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const slide = PANEL_SLIDES[slideIdx];

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
            Welcome back.
            <br />
            <span className="text-primary-400">Let's get moving.</span>
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
            Log in to book rides, track drivers live, manage your fleet or run the platform.
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
                      transition={{ duration: playing ? SLIDE_INTERVAL / 1000 : 0, ease: "linear" }}
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
              <PasswordInput
                required
                placeholder="••••••••"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{error}</p>
            )}

            <button type="submit" className="btn-primary w-full" disabled={busy}>
              <LogIn className="h-4 w-4" /> {busy ? "Logging in..." : "Log in"}
            </button>
          </form>

          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-night-200 bg-white/70 p-4">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
            <p className="text-xs text-night-500">
              Sign in with the credentials you were given. Every passenger creates their own account —
              use <span className="font-semibold text-night-700">Create an account</span> below to get
              started. Admin and driver access is provisioned by the platform operator.
            </p>
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
