import { Link } from "react-router-dom";
import {
  Car,
  Zap,
  ShieldCheck,
  HeartHandshake,
  ArrowRight,
  Globe2,
  Leaf,
  Sparkles,
  Lock,
  Cpu,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function About() {
  const { user } = useAuth();

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-b from-primary-50 via-white to-night-50/40 py-20">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <span className="badge mx-auto border border-primary-300 bg-white px-3.5 py-1 text-xs font-bold text-primary-700 shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-primary-500" /> AI Mobility Architecture
          </span>
          <h1 className="mt-5 text-4xl font-black tracking-tight text-night-950 sm:text-6xl">
            Autonomous dispatch. <br />
            <span className="bg-gradient-to-r from-primary-600 to-amber-500 bg-clip-text text-transparent">
              Protected by Stripe.
            </span>
          </h1>
          <p className="mt-5 text-lg text-night-600 max-w-2xl mx-auto leading-relaxed">
            RideGo was engineered to combine the speed of real-time neural vehicle dispatching with
            the unmatched security of certified Stripe financial infrastructure.
          </p>
        </div>
      </section>

      {/* Core Tech Pillars */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-3">
          {[
            {
              icon: Cpu,
              title: "Neural Route Optimization",
              text: "Our AI engine analyzes real-time city telemetry, road closures, and traffic waves to shave up to 22% off transit times.",
            },
            {
              icon: Lock,
              title: "Bank-Grade Stripe Protection",
              text: "Every payment is tokenized and processed via certified PCI-DSS Level 1 encryption with zero raw card storage.",
            },
            {
              icon: ShieldCheck,
              title: "Multi-Layer Safety Sentinel",
              text: "4-Digit Ride PINs, live GPS sharing, and automated route anomaly detection protect passengers and drivers 24/7.",
            },
          ].map((v, i) => (
            <div key={i} className="card p-7 text-center hover:shadow-xl transition">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-100 text-primary-600 shadow-sm">
                <v.icon className="h-7 w-7" />
              </span>
              <h3 className="mt-5 text-lg font-extrabold text-night-950">{v.title}</h3>
              <p className="mt-2 text-sm text-night-500 leading-relaxed">{v.text}</p>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="card mt-12 grid gap-6 p-8 sm:grid-cols-4 bg-gradient-to-r from-night-950 to-night-900 text-white border-0 shadow-2xl">
          {[
            ["250,000+", "Safe Rides Dispatched"],
            ["18s", "Avg. AI Match Speed"],
            ["90%", "Driver Earnings Retained"],
            ["100%", "PCI-DSS Level 1 Compliant"],
          ].map(([n, l]) => (
            <div key={l} className="text-center">
              <p className="text-3xl font-black text-primary-400">{n}</p>
              <p className="mt-1 text-xs font-semibold text-night-300">{l}</p>
            </div>
          ))}
        </div>

        {/* Green City CTA */}
        <div className="mt-12 flex flex-col items-center gap-4 rounded-3xl bg-gradient-to-br from-emerald-950 via-night-950 to-night-900 p-10 text-center text-white shadow-2xl">
          <Leaf className="h-10 w-10 text-emerald-400" />
          <h2 className="text-3xl font-black">Shared mobility, cleaner cities.</h2>
          <p className="max-w-xl text-night-300 text-sm leading-relaxed">
            Through algorithmic grouping and AI dynamic route consolidation, RideGo active vehicles
            cut annual urban emissions by over 140 metric tons.
          </p>
          {!user && (
            <Link to="/register" className="btn-primary mt-2 shadow-glow">
              Join RideGo Today <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
