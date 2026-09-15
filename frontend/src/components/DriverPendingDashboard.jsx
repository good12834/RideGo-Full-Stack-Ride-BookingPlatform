import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Clock,
  CheckCircle2,
  ShieldCheck,
  TrendingUp,
  Sparkles,
  Zap,
  BarChart3,
  Calendar,
  AlertCircle,
  RefreshCw,
  Award,
  DollarSign,
  Car,
  Lock,
  ChevronRight,
  ArrowRight,
  Activity,
  Flame,
} from "lucide-react";
import { formatMoney } from "./RideCard";
import { useToast } from "./Toast";
import api from "../services/api";

const HOURLY_DEMAND_CURVE = [
  { hour: "6 AM", multiplier: 1.2, level: "Moderate", height: 35 },
  { hour: "8 AM", multiplier: 1.9, level: "Peak Surge", height: 85, isPeak: true },
  { hour: "10 AM", multiplier: 1.3, level: "Moderate", height: 45 },
  { hour: "12 PM", multiplier: 1.4, level: "Lunch Peak", height: 50 },
  { hour: "2 PM", multiplier: 1.1, level: "Steady", height: 30 },
  { hour: "5 PM", multiplier: 2.2, level: "Evening Rush", height: 95, isPeak: true },
  { hour: "8 PM", multiplier: 1.7, level: "High Demand", height: 75 },
  { hour: "11 PM", multiplier: 2.0, level: "Night Surge", height: 90, isPeak: true },
];

const ONBOARDING_STEPS = [
  { id: 1, label: "Identity & Driver License", status: "completed", desc: "Submitted & verified" },
  { id: 2, label: "Vehicle Inspection & Details", status: "completed", desc: "Vehicle model & plates logged" },
  { id: 3, label: "Safety & Background Review", status: "in_progress", desc: "Administrator reviewing records" },
  { id: 4, label: "Stripe Connect Payout Setup", status: "completed", desc: "Direct deposit enabled (90% payout)" },
];

export default function DriverPendingDashboard({ driver, onRefresh }) {
  const toast = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedHours, setSelectedHours] = useState(35);
  const [activeTab, setActiveTab] = useState("earnings"); // 'earnings' | 'demand' | 'academy'

  const dailyEarnings = useMemo(() => {
    const baseDaily = (selectedHours / 7) * 38 * 0.9;
    return [
      { day: "Mon", net: Math.round(baseDaily * 0.85), trips: Math.round((selectedHours / 7) * 2.2) },
      { day: "Tue", net: Math.round(baseDaily * 0.9), trips: Math.round((selectedHours / 7) * 2.4) },
      { day: "Wed", net: Math.round(baseDaily * 1.0), trips: Math.round((selectedHours / 7) * 2.6) },
      { day: "Thu", net: Math.round(baseDaily * 1.15), trips: Math.round((selectedHours / 7) * 2.9) },
      { day: "Fri", net: Math.round(baseDaily * 1.45), trips: Math.round((selectedHours / 7) * 3.8) },
      { day: "Sat", net: Math.round(baseDaily * 1.6), trips: Math.round((selectedHours / 7) * 4.2) },
      { day: "Sun", net: Math.round(baseDaily * 1.2), trips: Math.round((selectedHours / 7) * 3.1) },
    ];
  }, [selectedHours]);

  const totalWeeklyNet = useMemo(
    () => dailyEarnings.reduce((acc, d) => acc + d.net, 0),
    [dailyEarnings]
  );
  const maxDay = useMemo(() => Math.max(...dailyEarnings.map((d) => d.net), 1), [dailyEarnings]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await onRefresh?.();
      toast.info("Checked status with server — still reviewing");
    } catch {
      toast.error("Failed to check status");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* 1. Top Pending Hero Alert Card */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card relative overflow-hidden border-amber-200 bg-gradient-to-r from-amber-500/10 via-white to-primary-50/40 p-6 sm:p-8 shadow-card"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-white shadow-glow">
              <Clock className="h-7 w-7 animate-pulse" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-night-950">
                  Account Awaiting Approval
                </h1>
                <span className="rounded-full bg-amber-100 border border-amber-300 px-3 py-0.5 text-xs font-extrabold uppercase text-amber-800">
                  {driver?.status || "PENDING"}
                </span>
              </div>
              <p className="mt-1 text-sm text-night-600 max-w-2xl leading-relaxed">
                Your driver profile is currently under review by our safety operations team.
                Administrators verify license credentials and background records to ensure 5-star
                passenger safety.
              </p>
              {driver?.rejectionReason && (
                <div className="mt-2.5 rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700 font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>Admin Feedback: {driver.rejectionReason}</span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-ghost !rounded-xl !px-4 !py-2.5 text-xs font-bold shadow-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Checking..." : "Refresh Status"}
          </button>
        </div>

        {/* Verification Progress Stepper */}
        <div className="mt-8 border-t border-amber-200/60 pt-6">
          <p className="text-xs font-extrabold uppercase tracking-wider text-night-500 mb-4">
            Onboarding & Verification Checklist
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {ONBOARDING_STEPS.map((s) => {
              const isDone = s.status === "completed";
              const isProgress = s.status === "in_progress";
              return (
                <div
                  key={s.id}
                  className={`rounded-2xl border p-4 transition ${
                    isProgress
                      ? "border-amber-400 bg-amber-50/60 shadow-sm ring-2 ring-amber-200"
                      : isDone
                        ? "border-emerald-200 bg-emerald-50/40"
                        : "border-night-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-night-400">Step {s.id}</span>
                    {isDone ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Done
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600">
                        <Clock className="h-3.5 w-3.5 animate-spin" /> In Review
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-xs font-extrabold text-night-900">{s.label}</p>
                  <p className="mt-0.5 text-[11px] text-night-500">{s.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* 2. Interactive Navigation Tabs */}
      <div className="flex rounded-2xl bg-night-100 p-1 max-w-md">
        {[
          { id: "earnings", label: "Projected Revenue", icon: TrendingUp },
          { id: "demand", label: "City Demand Curves", icon: Flame },
          { id: "academy", label: "Driver Academy", icon: Award },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-extrabold transition ${
              activeTab === tab.id
                ? "bg-white text-primary-600 shadow-sm"
                : "text-night-500 hover:text-night-800"
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* 3. Tab Content 1: Projected Revenue & Earnings Charts */}
      {activeTab === "earnings" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: "Est. Weekly Net", value: `$${totalWeeklyNet.toLocaleString()}`, sub: "at 90% payout rate", accent: "text-emerald-600 bg-emerald-100", icon: DollarSign },
              { label: "Weekly Trips", value: `${dailyEarnings.reduce((a, b) => a + b.trips, 0)} trips`, sub: `~${selectedHours} driving hours`, accent: "text-sky-600 bg-sky-100", icon: Car },
              { label: "Est. Monthly Net", value: `$${(totalWeeklyNet * 4.2).toFixed(0)}`, sub: "projected take-home", accent: "text-primary-600 bg-primary-100", icon: TrendingUp },
              { label: "Stripe Connect", value: "Instant", sub: "automatic weekly deposit", accent: "text-indigo-600 bg-indigo-100", icon: Lock },
            ].map((card) => (
              <div key={card.label} className="card p-5">
                <span className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${card.accent}`}>
                  <card.icon className="h-4.5 w-4.5" />
                </span>
                <p className="text-2xl font-black text-night-950">{card.value}</p>
                <p className="text-xs font-bold text-night-700">{card.label}</p>
                <p className="text-[10px] text-night-400 mt-0.5">{card.sub}</p>
              </div>
            ))}
          </div>

          {/* Interactive Chart Container */}
          <div className="card p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-night-100 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-night-950">
                  Projected Daily Earnings Breakdown
                </h3>
                <p className="text-xs text-night-500">
                  Based on historical city fares, AI surge waves, and RideGo's 90% driver retention.
                </p>
              </div>

              {/* Hours Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-night-700">Driving Schedule:</span>
                <div className="flex gap-1 bg-night-100 rounded-xl p-1">
                  {[20, 35, 45, 55].map((hrs) => (
                    <button
                      key={hrs}
                      type="button"
                      onClick={() => setSelectedHours(hrs)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-extrabold transition ${
                        selectedHours === hrs
                          ? "bg-primary-500 text-white shadow-sm"
                          : "text-night-600 hover:text-night-900"
                      }`}
                    >
                      {hrs}h/wk
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Custom Visual Bar Chart */}
            <div className="pt-2">
              <div className="flex h-56 items-end gap-3 sm:gap-6 px-2">
                {dailyEarnings.map((d) => {
                  const pct = Math.max(10, (d.net / maxDay) * 100);
                  const isTopDay = d.day === "Fri" || d.day === "Sat";
                  return (
                    <div key={d.day} className="flex flex-1 flex-col items-center gap-2 group">
                      <span className="text-[11px] font-extrabold text-night-700 group-hover:text-primary-600 transition">
                        ${d.net}
                      </span>
                      <div className="relative w-full max-w-[48px] rounded-t-xl overflow-hidden bg-night-100 flex items-end h-40">
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${pct}%` }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                          className={`w-full rounded-t-xl transition-all ${
                            isTopDay
                              ? "bg-gradient-to-t from-primary-600 via-primary-500 to-amber-400 shadow-glow"
                              : "bg-gradient-to-t from-primary-400 to-primary-300"
                          }`}
                        />
                      </div>
                      <div className="text-center">
                        <span className="block text-xs font-bold text-night-800">{d.day}</span>
                        <span className="block text-[10px] text-night-400">{d.trips} rides</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl bg-primary-50/60 p-3.5 border border-primary-100 flex items-center justify-between text-xs text-night-700">
              <span className="flex items-center gap-1.5 font-bold">
                <Sparkles className="h-4 w-4 text-primary-500" /> Weekend Night Surges (+45%)
              </span>
              <span className="text-night-500">Friday and Saturday evenings produce the highest hourly rates.</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* 4. Tab Content 2: City Demand Curves */}
      {activeTab === "demand" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="card p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-night-100 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-night-950">
                  24-Hour City Surge & Demand Waves
                </h3>
                <p className="text-xs text-night-500">
                  Plan your shifts around peak multiplier hours to maximize your dollars per mile.
                </p>
              </div>
              <span className="badge border border-emerald-200 bg-emerald-50 text-emerald-700 font-bold text-xs">
                <Activity className="h-3 w-3" /> Live City Model
              </span>
            </div>

            {/* Wave / Multiplier Visualization */}
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5 pt-2">
              {HOURLY_DEMAND_CURVE.map((slot) => (
                <div
                  key={slot.hour}
                  className={`rounded-2xl border p-3 text-center transition ${
                    slot.isPeak
                      ? "border-primary-400 bg-gradient-to-b from-primary-50 to-white ring-2 ring-primary-200 shadow-sm"
                      : "border-night-200 bg-white"
                  }`}
                >
                  <span className="text-xs font-bold text-night-500">{slot.hour}</span>
                  <div className="my-2 mx-auto w-full bg-night-100 h-16 rounded-lg flex items-end overflow-hidden">
                    <div
                      className={`w-full ${slot.isPeak ? "bg-gradient-to-t from-primary-600 to-amber-400" : "bg-primary-300"}`}
                      style={{ height: `${slot.height}%` }}
                    />
                  </div>
                  <span className={`block text-xs font-black ${slot.isPeak ? "text-primary-600" : "text-night-800"}`}>
                    {slot.multiplier}x
                  </span>
                  <span className="block text-[9px] text-night-400 truncate">{slot.level}</span>
                </div>
              ))}
            </div>

            {/* City Hot-zones Table */}
            <div className="rounded-2xl border border-night-100 overflow-hidden">
              <div className="bg-night-50 px-4 py-2.5 border-b border-night-100 font-bold text-xs text-night-700">
                Top Earning City Hotspots
              </div>
              <div className="divide-y divide-night-100 text-xs">
                {[
                  { zone: "International Airport Terminal 3", surge: "1.8x – 2.4x", time: "5 PM – 10 PM", reason: "Flight wave arrivals" },
                  { zone: "Downtown Financial District", surge: "1.4x – 1.9x", time: "7 AM – 9 AM & 5 PM – 7 PM", reason: "Daily office commuters" },
                  { zone: "City Stadium North Arena", surge: "2.1x – 2.6x", time: "Game & Concert Days", reason: "Post-event crowd surge" },
                  { zone: "Grandview Shopping Mall", surge: "1.25x – 1.5x", time: "Weekends 1 PM – 6 PM", reason: "Retail & dining transit" },
                ].map((hz) => (
                  <div key={hz.zone} className="p-3.5 flex items-center justify-between bg-white hover:bg-night-50/50 transition">
                    <div>
                      <p className="font-extrabold text-night-900">{hz.zone}</p>
                      <p className="text-[11px] text-night-500">{hz.reason} • Best time: {hz.time}</p>
                    </div>
                    <span className="font-extrabold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1">
                      {hz.surge}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* 5. Tab Content 3: Driver Academy */}
      {activeTab === "academy" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-4 sm:grid-cols-2"
        >
          {[
            {
              title: "How the 4-Digit Ride PIN Works",
              desc: "To prevent entering the wrong car, passengers will share a 4-digit code. You enter this PIN into your app to start the trip meter.",
              icon: Lock,
            },
            {
              title: "90% Payout & Stripe Direct Deposits",
              desc: "RideGo takes only 10% platform fee. All trip earnings are automatically transferred directly into your bank account every Monday.",
              icon: DollarSign,
            },
            {
              title: "AI Demand Hotspot Routing",
              desc: "Our neural dispatch automatically guides you towards high-multiplier areas before demand peaks occur.",
              icon: Sparkles,
            },
            {
              title: "Maintaining a 4.95+ Star Rating",
              desc: "Keep vehicle clean, maintain comfortable climate control, confirm destination before departing, and drive smoothly.",
              icon: Award,
            },
          ].map((card, i) => (
            <div key={i} className="card p-5 space-y-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
                <card.icon className="h-5 w-5" />
              </span>
              <h4 className="text-sm font-extrabold text-night-950">{card.title}</h4>
              <p className="text-xs text-night-500 leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
