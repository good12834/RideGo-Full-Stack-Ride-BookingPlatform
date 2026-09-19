import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  ShieldCheck,
  Wallet,
  MapPin,
  Navigation,
  ArrowRight,
  Star,
  Smartphone,
  CreditCard,
  Clock,
  Sparkles,
  Bot,
  Lock,
  Leaf,
  Users,
  CheckCircle2,
  TrendingUp,
  Activity,
  Sliders,
  DollarSign,
  Award,
  ChevronRight,
} from "lucide-react";
import LocationSearch, { DEMO_PLACES } from "../components/LocationSearch";
import RideMap from "../components/RideMap";
import AiFarePredictor from "../components/AiFarePredictor";
import { useAuth } from "../context/AuthContext";

const AI_PILLARS = [
  {
    icon: Sparkles,
    badge: "Neural Engine",
    title: "AI Dynamic Dispatch",
    text: "Sub-second algorithmic pairing connects you with the optimal driver in under 18 seconds.",
    color: "from-amber-500 to-primary-500",
  },
  {
    icon: ShieldCheck,
    badge: "24/7 Guardian",
    title: "AI Safety Sentinel",
    text: "Live GPS telemetry and anomaly detection continuously monitor route adherence and unexpected stops.",
    color: "from-emerald-500 to-teal-500",
  },
  {
    icon: Lock,
    badge: "Bank-Grade",
    title: "Stripe Protected Payments",
    text: "PCI-DSS Level 1 encryption and server-enforced fare validation prevent double charges and price tampering.",
    color: "from-indigo-500 to-blue-500",
  },
  {
    icon: Leaf,
    badge: "Eco-Smart",
    title: "Predictive Route Efficiency",
    text: "AI congestion avoidance cuts transit time by up to 22% while reducing city carbon emissions.",
    color: "from-green-500 to-emerald-600",
  },
];

const FLEET_TYPES = [
  {
    id: "economy",
    name: "RideGo Economy",
    tagline: "Affordable, quick everyday travel",
    base: "$2.50",
    rate: "$1.10 / km",
    seats: "4 Seats",
    icon: "🚗",
    popular: false,
    features: ["Reliable top-rated compact sedans", "Upfront fixed AI fare", "Cash, Card & Stripe Wallet"],
  },
  {
    id: "comfort",
    name: "RideGo Comfort",
    tagline: "Newer vehicles with spacious legroom",
    base: "$3.50",
    rate: "$1.45 / km",
    seats: "4 Seats",
    icon: "✨",
    popular: true,
    features: ["Top 5% rated professional drivers", "Climate control & phone chargers", "Quiet ride preference"],
  },
  {
    id: "xl",
    name: "RideGo XL & Electric",
    tagline: "SUVs and vans for groups & extra luggage",
    base: "$4.50",
    rate: "$1.80 / km",
    seats: "6 Seats",
    icon: "🚙",
    popular: false,
    features: ["Spacious 6-passenger capacity", "Zero-emission EV options", "Airport luggage friendly"],
  },
];

const STATS = [
  { value: "250K+", label: "Safe Trips Completed", icon: Activity },
  { value: "18s", label: "Average Driver Match", icon: Zap },
  { value: "90%", label: "Driver Earnings Payout", icon: TrendingUp },
  { value: "4.92 ★", label: "Average Rider Rating", icon: Star },
];

const TESTIMONIALS = [
  {
    name: "Dr. Elena Rostova",
    role: "Healthcare Professional",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    text: "The AI departure recommendations have saved me so much commute time, and knowing the ride is locked with a 4-digit PIN gives me total peace of mind at night.",
    rating: 5,
  },
  {
    name: "Marcus Vance",
    role: "Tech Entrepreneur",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    text: "Stripe checkout is instantaneous and 100% transparent. No surge surprises when you arrive. RideGo is easily the cleanest mobility app in the city.",
    rating: 5,
  },
  {
    name: "David Chen",
    role: "RideGo Driver Partner (860+ Trips)",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    text: "Keeping 90% of my fares plus receiving AI heatmaps for airport waves has increased my weekly earnings by over $350. Best platform to drive for.",
    rating: 5,
  },
];

const HERO_SHOWCASE = [
  {
    id: "economy",
    img: "/images/hero_ai_mobility.jpg",
    name: "RideGo Economy",
    tag: "Everyday Essential",
    eta: "3.2 min",
    fare: "$12.40",
    seats: "4 Seats",
    accent: "from-primary-500 to-amber-400",
    chipColor: "text-amber-300",
  },
  {
    id: "comfort",
    img: "/images/ai_smart_experience.jpg",
    name: "RideGo Comfort",
    tag: "Most Popular",
    eta: "4.1 min",
    fare: "$16.80",
    seats: "4 Seats",
    accent: "from-indigo-500 to-primary-500",
    chipColor: "text-indigo-300",
  },
  {
    id: "xl",
    img: "/images/driver_partner_hero.jpg",
    name: "RideGo XL & Electric",
    tag: "Groups & Zero-Emission",
    eta: "5.4 min",
    fare: "$21.50",
    seats: "6 Seats",
    accent: "from-emerald-500 to-teal-500",
    chipColor: "text-emerald-300",
  },
];

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pickup, setPickup] = useState(DEMO_PLACES[0]);
  const [destination, setDestination] = useState(DEMO_PLACES[1]);
  const [selectedFleet, setSelectedFleet] = useState("comfort");
  const [error, setError] = useState("");

  // Hero rotating fleet showcase
  const [showcaseIdx, setShowcaseIdx] = useState(1);
  const [paused, setPaused] = useState(false);
  const activeCar = HERO_SHOWCASE[showcaseIdx];

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => {
      setShowcaseIdx((i) => (i + 1) % HERO_SHOWCASE.length);
    }, 3800);
    return () => clearInterval(t);
  }, [paused]);

  // keep the quick-book fleet selector in sync with the visible car
  useEffect(() => {
    setSelectedFleet(activeCar.id);
  }, [activeCar.id]);

  // Driver Earnings Slider State
  const [hoursPerWeek, setHoursPerWeek] = useState(30);
  const [driverTier, setDriverTier] = useState("comfort");

  const nearbyDrivers = useMemo(
    () =>
      DEMO_PLACES.slice(0, 4).map((p, i) => ({
        _id: i,
        latitude: p.latitude + (Math.random() * 0.006 - 0.003),
        longitude: p.longitude + (Math.random() * 0.006 - 0.003),
        name: ["Michael (Model 3)", "David (Civic)", "Daniel (XL)", "Sofia (Tesla)"][i],
      })),
    []
  );

  const estimatedWeeklyEarnings = useMemo(() => {
    const ratePerHour = driverTier === "xl" ? 44 : driverTier === "comfort" ? 38 : 31;
    return Math.round(hoursPerWeek * ratePerHour * 0.9); // 90% payout
  }, [hoursPerWeek, driverTier]);

  function findRide() {
    if (!pickup || !destination) {
      setError("Please select both a pickup and destination to continue.");
      return;
    }
    const params = new URLSearchParams({
      pickup: JSON.stringify(pickup),
      destination: JSON.stringify(destination),
      type: selectedFleet,
    });
    navigate(`/passenger/book?${params.toString()}`);
  }

  return (
    <div className="overflow-hidden">
      {/* 1. Hero Section */}
      <section className="relative min-h-[92vh] bg-gradient-to-b from-primary-50/70 via-white to-night-50/50 pt-10 pb-20">
        {/* Background glow accents */}
        <div className="pointer-events-none absolute -right-36 -top-36 h-[500px] w-[600px] rounded-full bg-gradient-to-br from-primary-200/50 to-amber-200/30 blur-3xl" />
        <div className="pointer-events-none absolute -left-36 top-1/3 h-[450px] w-[450px] rounded-full bg-gradient-to-tr from-indigo-200/30 to-primary-100/40 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:items-stretch lg:min-h-[calc(92vh-7.5rem)]">
          {/* Left Column: Heading & Quick Book Card */}
          <div className="flex flex-col justify-center">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-primary-300 bg-white/90 px-3.5 py-1 text-xs font-bold text-primary-700 shadow-sm backdrop-blur-md">
                <Sparkles className="h-3.5 w-3.5 text-primary-500 animate-pulse" />
                Next-Gen AI Mobility & Stripe Protection
              </div>

              <h1 className="mt-5 text-4xl font-black leading-[1.1] tracking-tight text-night-950 sm:text-5xl lg:text-6xl">
                Your ride, <br />
                <span className="bg-gradient-to-r from-primary-600 via-primary-500 to-amber-500 bg-clip-text text-transparent">
                  supercharged by AI.
                </span>
              </h1>

              <p className="mt-4 max-w-lg text-base sm:text-lg text-night-600 leading-relaxed">
                Instant autonomous matching, real-time dynamic traffic intelligence, and bank-grade{" "}
                <strong className="text-night-900 font-semibold">Stripe payment protection</strong>.
                Fair fares with 100% upfront transparency.
              </p>
            </motion.div>

            {/* Quick Booking Card */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.12 }}
              className="mt-8 rounded-3xl border border-white/80 bg-white/90 p-5 sm:p-6 shadow-2xl backdrop-blur-xl"
            >
              <div className="flex items-center justify-between border-b border-night-100 pb-3 mb-4">
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-night-500">
                  <Navigation className="h-3.5 w-3.5 text-primary-500" /> Plan AI Route
                </span>
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                  <Lock className="h-3 w-3" /> Stripe Encrypted
                </span>
              </div>

              <div className="space-y-3">
                <LocationSearch
                  value={pickup}
                  onChange={setPickup}
                  placeholder="Pickup location"
                  icon="pin"
                  allowCurrentLocation
                />
                <LocationSearch
                  value={destination}
                  onChange={setDestination}
                  placeholder="Where to?"
                  icon="target"
                />

                {/* Fleet Quick Selector */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {FLEET_TYPES.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setSelectedFleet(f.id)}
                      className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-bold transition ${
                        selectedFleet === f.id
                          ? "border-primary-500 bg-primary-50 text-primary-700 shadow-sm"
                          : "border-night-200 text-night-600 hover:border-night-300"
                      }`}
                    >
                      <span>{f.icon}</span>
                      <span className="capitalize">{f.id}</span>
                    </button>
                  ))}
                </div>

                {error && <p className="text-xs font-bold text-red-500">{error}</p>}

                <button
                  className="btn-primary w-full !py-3.5 text-base font-extrabold shadow-glow"
                  onClick={findRide}
                >
                  Find Instant Ride <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>

            {/* Micro badges */}
            <div className="mt-6 flex flex-wrap items-center gap-6 text-xs text-night-500">
              <span className="flex items-center gap-1.5 font-semibold">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> 4.92 / 5.0 Driver Rating
              </span>
              <span className="flex items-center gap-1.5 font-semibold">
                <Clock className="h-4 w-4 text-primary-500" /> ~3.2 Min Average Pickup
              </span>
              <span className="flex items-center gap-1.5 font-semibold">
                <ShieldCheck className="h-4 w-4 text-emerald-500" /> 4-Digit Ride PIN
              </span>
            </div>
          </div>

          {/* Right Column: Rotating Fleet Showcase */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="relative flex h-full items-stretch justify-center"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            <div className="relative h-[600px] w-full overflow-hidden rounded-3xl border border-white/60 bg-night-950 shadow-2xl lg:h-full">
              {/* Crossfading vehicle imagery */}
              <AnimatePresence mode="sync">
                <motion.img
                  key={activeCar.id}
                  src={activeCar.img}
                  alt={activeCar.name}
                  initial={{ opacity: 0, scale: 1.08 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.02 }}
                  transition={{ opacity: { duration: 1.1, ease: "easeInOut" }, scale: { duration: 4.6, ease: "linear" } }}
                  className="absolute inset-0 h-full w-full object-cover object-center"
                />
              </AnimatePresence>

              {/* Gradient overlays */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-night-950/90 via-night-950/10 to-night-950/40" />
              <AnimatePresence mode="sync">
                <motion.div
                  key={`glow-${activeCar.id}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.25 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.1 }}
                  className={`pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-gradient-to-tr ${activeCar.accent} blur-3xl`}
                />
              </AnimatePresence>

              {/* Top-left: AI dispatch chip */}
              <div className="absolute left-5 top-5 rounded-2xl border border-white/30 bg-black/50 p-3 text-white shadow-lg backdrop-blur-xl">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-500 text-white shadow-glow">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-[11px] font-bold text-amber-300">AI Dispatch Active</p>
                    <p className="text-xs font-black">Matched in 18s</p>
                  </div>
                </div>
              </div>

              {/* Top-right: Stripe chip */}
              <div className="absolute right-5 top-5 rounded-2xl border border-white/30 bg-black/50 p-3 text-white shadow-lg backdrop-blur-xl">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-glow">
                    <Lock className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-[11px] font-bold text-emerald-400">Stripe Protected</p>
                    <p className="text-xs font-black">256-bit Encrypted</p>
                  </div>
                </div>
              </div>

              {/* Middle-right: fading vehicle spec card */}
              <div className="absolute right-5 top-1/2 -translate-y-1/2">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`spec-${activeCar.id}`}
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.55, ease: "easeOut" }}
                    className="w-44 rounded-2xl border border-white/25 bg-black/55 p-4 text-white shadow-xl backdrop-blur-xl"
                  >
                    <span className={`text-[10px] font-extrabold uppercase tracking-wider ${activeCar.chipColor}`}>
                      {activeCar.tag}
                    </span>
                    <p className="mt-1 text-sm font-black leading-tight">{activeCar.name}</p>
                    <div className="mt-3 space-y-1.5 border-t border-white/15 pt-2.5 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-night-300">Upfront fare</span>
                        <span className="font-bold">{activeCar.fare}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-night-300">Pickup ETA</span>
                        <span className="font-bold">{activeCar.eta}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-night-300">Capacity</span>
                        <span className="font-bold">{activeCar.seats}</span>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Bottom: telemetry bar + rotation controls */}
              <div className="absolute bottom-5 left-5 right-5 space-y-3">
                <div className="rounded-2xl border border-white/30 bg-black/60 p-4 text-white backdrop-blur-xl">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr ${activeCar.accent} text-white shadow-glow`}>
                        <Zap className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-sm font-extrabold">Autonomous Fleet Telemetry</p>
                        <p className="text-xs text-night-300">42 verified drivers active in your area</p>
                      </div>
                    </div>
                    <span className="badge border border-emerald-400/30 bg-emerald-500/20 text-emerald-300">
                      Live
                    </span>
                  </div>
                </div>

                {/* Showcase selector dots */}
                <div className="flex items-center justify-center gap-2">
                  {HERO_SHOWCASE.map((car, i) => (
                    <button
                      key={car.id}
                      type="button"
                      aria-label={`Show ${car.name}`}
                      onClick={() => setShowcaseIdx(i)}
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        i === showcaseIdx
                          ? "w-10 bg-primary-400 shadow-glow"
                          : "w-4 bg-white/40 hover:bg-white/70"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 2. Live Platform Stats Ribbon */}
      <section className="border-y border-night-100 bg-white py-10 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 lg:gap-8">
            {STATS.map((s, idx) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.08 }}
                className="flex flex-col items-center text-center"
              >
                <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
                  <s.icon className="h-5 w-5" />
                </span>
                <span className="text-2xl font-black text-night-950 sm:text-3xl">{s.value}</span>
                <span className="mt-1 text-xs font-semibold text-night-500">{s.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. AI Powerhouse Features */}
      <section className="py-20 bg-night-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <span className="badge border border-primary-200 bg-primary-50 text-primary-700">
              <Sparkles className="h-3 w-3" /> Engineered for Excellence
            </span>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-night-950 sm:text-4xl">
              Why RideGo AI is Lightyears Ahead
            </h2>
            <p className="mt-3 text-night-600 text-sm sm:text-base">
              We combined advanced neural algorithms with bank-grade financial protection to build
              the ultimate ride-booking experience.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {AI_PILLARS.map((p, idx) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="card group relative flex flex-col justify-between overflow-hidden p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <div
                  className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${p.color} opacity-10 blur-2xl group-hover:opacity-20 transition`}
                />

                <div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r ${p.color} px-2.5 py-0.5 text-[10px] font-extrabold text-white shadow-sm`}
                  >
                    {p.badge}
                  </span>
                  <div className="mt-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-night-100 text-night-900 group-hover:bg-primary-500 group-hover:text-white transition">
                    <p.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-base font-bold text-night-900">{p.title}</h3>
                  <p className="mt-2 text-xs text-night-500 leading-relaxed">{p.text}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Interactive AI Fare Forecaster & Live Map Simulation */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            {/* Left: Explainer & Interactive AI Widget */}
            <div>
              <span className="badge border border-emerald-200 bg-emerald-50 text-emerald-700">
                <Activity className="h-3 w-3" /> Real-Time Intelligence
              </span>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-night-950 sm:text-4xl">
                AI Dynamic Fare & Traffic Forecaster
              </h2>
              <p className="mt-3 text-night-600 text-sm sm:text-base leading-relaxed">
                Never guess your trip fare again. Our AI analyzes historical congestion curves, live
                weather indices, and demand waves to recommend the optimal departure time.
              </p>

              <div className="mt-8">
                <AiFarePredictor
                  pickup={pickup}
                  destination={destination}
                  rideType={selectedFleet}
                />
              </div>
            </div>

            {/* Right: Live Interactive Map */}
            <div className="space-y-4">
              <div className="card overflow-hidden h-[420px] relative border-night-200 shadow-xl">
                <RideMap
                  pickup={pickup}
                  destination={destination}
                  drivers={nearbyDrivers}
                  className="h-full w-full"
                />
                <div className="absolute bottom-4 left-4 right-4 z-10 flex items-center justify-between rounded-2xl bg-white/90 p-3 shadow-lg backdrop-blur-md text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-night-700">
                    <Navigation className="h-4 w-4 text-primary-500" />
                    {pickup.address.split(" ")[0]} → {destination.address.split(" ")[0]}
                  </span>
                  <button
                    onClick={findRide}
                    className="btn-primary !py-1.5 !px-3 !text-xs"
                  >
                    Select Route <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Passenger Experience Showcase with Generated Image */}
      <section className="py-20 bg-gradient-to-b from-night-950 via-night-900 to-night-950 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            {/* Visual asset */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative overflow-hidden rounded-3xl border border-white/10 shadow-2xl"
            >
              <img
                src="/images/ai_smart_experience.jpg"
                alt="RideGo Passenger AI Experience"
                className="h-[440px] w-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <p className="text-xs font-bold uppercase tracking-wider text-primary-400">
                  Passenger AI Sanctuary
                </p>
                <h3 className="mt-1 text-xl font-black text-white">
                  Effortless Comfort on Every Mile
                </h3>
                <p className="mt-1 text-xs text-night-300">
                  Live vehicle approach telemetry, temperature preferences, and encrypted one-click
                  Stripe settlement.
                </p>
              </div>
            </motion.div>

            {/* List of experience highlights */}
            <div className="space-y-6">
              <span className="badge border border-primary-400/40 bg-primary-500/20 text-primary-300">
                <Smartphone className="h-3 w-3" /> Seamless Digital Lifestyle
              </span>
              <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
                Ride Smarter, Relax Faster.
              </h2>
              <p className="text-sm text-night-400 leading-relaxed">
                From the moment you open RideGo to the moment you reach your destination, our
                autonomous systems ensure complete comfort and safety.
              </p>

              <div className="space-y-4 pt-2">
                {[
                  {
                    title: "4-Digit Anti-Wrong-Car PIN",
                    text: "Never step into the wrong vehicle. Drivers cannot start the trip until you confirm your secret PIN.",
                  },
                  {
                    title: "Live GPS Telemetry Sharing",
                    text: "Share your live trip progress and estimated arrival with family in 1 click with zero logins required.",
                  },
                  {
                    title: "Stripe Wallet & 1-Click Receipts",
                    text: "Store travel funds in your RideGo wallet or pay directly via Apple Pay, Google Pay, and Stripe cards.",
                  },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3.5 rounded-2xl bg-white/5 p-4 border border-white/10">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary-500/20 text-primary-400">
                      <CheckCircle2 className="h-4 w-4" />
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-white">{item.title}</h4>
                      <p className="mt-1 text-xs text-night-400">{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Dynamic Fleet & Pricing Matrix */}
      <section className="py-20 bg-night-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <span className="badge border border-primary-200 bg-primary-50 text-primary-700">
              <Award className="h-3 w-3" /> Modern Fleet
            </span>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-night-950 sm:text-4xl">
              Choose the Perfect Ride for Every Occasion
            </h2>
            <p className="mt-3 text-night-600 text-sm sm:text-base">
              Transparent per-kilometer rates with zero hidden surge fees at checkout.
            </p>
          </div>

          <div className="mt-14 grid gap-8 sm:grid-cols-3">
            {FLEET_TYPES.map((fleet, idx) => (
              <motion.div
                key={fleet.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className={`card relative flex flex-col justify-between overflow-hidden p-6 transition-all duration-300 ${
                  fleet.popular
                    ? "border-2 border-primary-500 shadow-glow ring-2 ring-primary-200"
                    : "hover:border-night-300"
                }`}
              >
                {fleet.popular && (
                  <span className="absolute top-0 right-0 rounded-bl-xl bg-primary-500 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-sm">
                    Most Popular
                  </span>
                )}

                <div>
                  <div className="text-3xl">{fleet.icon}</div>
                  <h3 className="mt-3 text-lg font-extrabold text-night-950">{fleet.name}</h3>
                  <p className="mt-1 text-xs text-night-500">{fleet.tagline}</p>

                  <div className="mt-5 border-y border-night-100 py-3">
                    <span className="text-2xl font-black text-night-950">{fleet.base}</span>
                    <span className="text-xs text-night-500"> base fare + {fleet.rate}</span>
                  </div>

                  <ul className="mt-5 space-y-2.5 text-xs text-night-700">
                    {fleet.features.map((feat, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 pt-4 border-t border-night-100">
                  <button
                    onClick={() => {
                      setSelectedFleet(fleet.id);
                      findRide();
                    }}
                    className={`w-full ${fleet.popular ? "btn-primary" : "btn-ghost"} !py-2.5 text-xs font-bold`}
                  >
                    Book {fleet.name} <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Bank-Grade Stripe Protection Section */}
      <section className="py-20 bg-white border-t border-night-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="rounded-3xl bg-gradient-to-r from-night-950 via-night-900 to-indigo-950 p-8 sm:p-12 text-white shadow-2xl">
            <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-3 py-1 text-xs font-bold text-emerald-300">
                  <ShieldCheck className="h-4 w-4" /> Bank-Grade Security
                </span>
                <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                  Protected End-to-End by Stripe
                </h2>
                <p className="mt-3 text-night-300 text-sm sm:text-base leading-relaxed">
                  Your financial safety is our highest priority. Every payment on RideGo is
                  processed via certified Stripe infrastructure with 256-bit AES encryption.
                </p>

                <div className="mt-6 grid grid-cols-2 gap-4">
                  {[
                    ["PCI-DSS Level 1", "Highest level of payment security certification."],
                    ["Zero Card Storage", "Your raw credit card numbers never touch our servers."],
                    ["Anti-Tamper Pricing", "Server-enforced fare validation stops price tampering."],
                    ["Instant Digital Receipts", "Automatic Stripe invoices sent directly to your email."],
                  ].map(([title, desc]) => (
                    <div key={title} className="rounded-xl bg-white/5 p-3.5 border border-white/10">
                      <p className="text-xs font-extrabold text-white">{title}</p>
                      <p className="mt-1 text-[11px] text-night-400">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stripe Visual Card */}
              <div className="flex justify-center">
                <div className="w-full max-w-sm rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-xl shadow-2xl space-y-4">
                  <div className="flex justify-between items-center text-xs text-night-300">
                    <span className="font-mono font-bold tracking-widest text-emerald-400">
                      ● STRIPE CERTIFIED
                    </span>
                    <Lock className="h-4 w-4 text-white" />
                  </div>
                  <div className="rounded-xl bg-night-950/60 p-4 border border-white/10 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-night-400">Payment Channel</span>
                      <span className="font-bold text-emerald-400">Encrypted (TLS 1.3)</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-night-400">3D Secure 2.0</span>
                      <span className="font-bold text-white">Active</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-night-400">Fraud Detection</span>
                      <span className="font-bold text-indigo-400">Stripe Radar AI</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-[11px] text-night-400">
                      Supports Visa, Mastercard, American Express, Apple Pay & In-App Wallet
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Driver Partnership & Interactive Earnings Calculator */}
      <section className="py-20 bg-night-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            {/* Left: Driver Partner Visual Asset */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative overflow-hidden rounded-3xl border border-night-200 shadow-2xl"
            >
              <img
                src="/images/driver_partner_hero.jpg"
                alt="RideGo Driver Partner Hero"
                className="h-[460px] w-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 text-white">
                <span className="badge bg-primary-500 text-white font-bold">90% Payout Rate</span>
                <h3 className="mt-2 text-2xl font-black">Keep More of What You Earn</h3>
                <p className="mt-1 text-xs text-night-300">
                  Drive full-time or part-time with automated weekly Stripe Connect bank deposits.
                </p>
              </div>
            </motion.div>

            {/* Right: Interactive Earnings Estimator */}
            <div className="card p-6 sm:p-8 space-y-6">
              <div>
                <span className="badge border border-primary-200 bg-primary-50 text-primary-700">
                  <TrendingUp className="h-3 w-3" /> Driver Earnings Calculator
                </span>
                <h2 className="mt-2 text-2xl font-black text-night-950 sm:text-3xl">
                  Estimate Your Weekly Payout
                </h2>
                <p className="mt-1 text-xs text-night-500">
                  Slide your weekly hours to see what you could take home on RideGo.
                </p>
              </div>

              {/* Slider */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-night-800">
                  <span>Hours per Week: {hoursPerWeek} hrs</span>
                  <span>{hoursPerWeek < 20 ? "Part-time" : "Full-time"}</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="60"
                  step="5"
                  value={hoursPerWeek}
                  onChange={(e) => setHoursPerWeek(Number(e.target.value))}
                  className="w-full accent-primary-500 cursor-pointer"
                />
              </div>

              {/* Vehicle Tier Selector */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "economy", label: "Economy" },
                  { id: "comfort", label: "Comfort" },
                  { id: "xl", label: "XL & SUV" },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setDriverTier(t.id)}
                    className={`rounded-xl border py-2 text-xs font-bold capitalize transition ${
                      driverTier === t.id
                        ? "border-primary-500 bg-primary-50 text-primary-700"
                        : "border-night-200 text-night-600 hover:border-night-300"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Output */}
              <div className="rounded-2xl bg-gradient-to-r from-night-950 to-night-900 p-5 text-white">
                <span className="text-[11px] font-bold uppercase tracking-wider text-night-400">
                  Estimated Weekly Net Earnings
                </span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-primary-400">
                    ${estimatedWeeklyEarnings.toLocaleString()}
                  </span>
                  <span className="text-xs text-night-300">/ week (~${(estimatedWeeklyEarnings * 4.2).toFixed(0)}/mo)</span>
                </div>
                <p className="mt-2 text-[11px] text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Includes 90% fare retention + AI hotspot surge bonuses
                </p>
              </div>

              <Link to="/register" className="btn-primary w-full !py-3 font-bold">
                Apply to Drive with RideGo <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Verified Testimonials */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <span className="badge border border-amber-200 bg-amber-50 text-amber-700">
              <Star className="h-3 w-3 fill-amber-400 text-amber-500" /> Rider & Driver Stories
            </span>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-night-950 sm:text-4xl">
              Loved by Thousands of City Commuters
            </h2>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {TESTIMONIALS.map((t, idx) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.08 }}
                className="card p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-1 text-amber-400 mb-3">
                    {[...Array(t.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-xs text-night-600 italic leading-relaxed">"{t.text}"</p>
                </div>

                <div className="mt-6 flex items-center gap-3 border-t border-night-100 pt-4">
                  <img
                    src={t.avatar}
                    alt={t.name}
                    className="h-9 w-9 rounded-full object-cover border border-night-200"
                  />
                  <div>
                    <p className="text-xs font-bold text-night-900">{t.name}</p>
                    <p className="text-[10px] text-night-400">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 10. High-Impact CTA Banner */}
      <section className="py-16 bg-gradient-to-b from-white to-primary-50/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary-600 via-primary-500 to-amber-500 p-8 sm:p-14 text-white shadow-2xl">
            <div className="relative z-10 max-w-2xl">
              <span className="badge bg-white/20 text-white font-bold backdrop-blur-md">
                <Sparkles className="h-3.5 w-3.5" /> Start Traveling Smarter
              </span>
              <h2 className="mt-4 text-3xl font-black sm:text-5xl leading-tight">
                Ready for the Next Generation of Mobility?
              </h2>
              <p className="mt-4 text-sm sm:text-base text-white/90 leading-relaxed">
                Join over 250,000 riders who trust RideGo AI for fast pickups, upfront fares, and
                Stripe-secured payments.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                {user ? (
                  <Link
                    to={user.role === "driver" ? "/driver" : "/passenger"}
                    className="rounded-2xl bg-white px-6 py-3.5 text-sm font-extrabold text-primary-600 shadow-lg hover:bg-night-50 transition"
                  >
                    Go to Your Dashboard <ArrowRight className="inline h-4 w-4 ml-1" />
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/register"
                      className="rounded-2xl bg-night-950 px-6 py-3.5 text-sm font-extrabold text-white shadow-lg hover:bg-night-900 transition"
                    >
                      Create Free Account <ArrowRight className="inline h-4 w-4 ml-1" />
                    </Link>
                    <Link
                      to="/login"
                      className="rounded-2xl bg-white/20 border border-white/40 px-6 py-3.5 text-sm font-extrabold text-white backdrop-blur-md hover:bg-white/30 transition"
                    >
                      Sign In
                    </Link>
                  </>
                )}
              </div>
            </div>

            <div className="pointer-events-none absolute -right-20 -bottom-20 h-96 w-96 rounded-full bg-white/10 blur-2xl" />
          </div>
        </div>
      </section>
    </div>
  );
}
