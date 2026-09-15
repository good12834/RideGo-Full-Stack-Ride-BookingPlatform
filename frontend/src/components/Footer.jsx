import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Car,
  Mail,
  Phone,
  MapPin,
  Facebook,
  Instagram,
  Twitter,
  ShieldCheck,
  Lock,
  Sparkles,
} from "lucide-react";

export default function Footer() {
  const { user } = useAuth();

  const explore = [
    { to: "/", label: "Home" },
    { to: "/about", label: "About & AI Tech" },
    ...(user
      ? [
          {
            to:
              user.role === "admin"
                ? "/admin"
                : user.role === "driver"
                  ? "/driver"
                  : "/passenger",
            label: "Dashboard",
          },
        ]
      : [
          { to: "/login", label: "Login" },
          { to: "/register", label: "Sign up" },
        ]),
  ];

  const socials = [
    { icon: Twitter, label: "Twitter" },
    { icon: Facebook, label: "Facebook" },
    { icon: Instagram, label: "Instagram" },
  ];

  return (
    <footer className="border-t border-night-800 bg-night-950 text-night-400">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-2">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary-500 to-amber-400 text-white shadow-glow">
                <Car className="h-5 w-5" />
              </span>
              <span className="text-lg font-extrabold tracking-tight text-white">
                Ride<span className="text-primary-400">Go</span>
                <span className="ml-1.5 rounded-md bg-primary-500/20 px-1.5 py-0.5 text-[10px] font-bold text-primary-300">
                  AI v2.0
                </span>
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-night-400">
              Next-generation AI mobility platform connecting passengers with verified drivers.
              Autonomous dispatch, dynamic traffic forecasts, and bank-grade Stripe payment protection.
            </p>

            {/* Security Trust Badges */}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1 rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-[11px] font-bold text-emerald-400">
                <ShieldCheck className="h-3.5 w-3.5" /> Stripe Certified
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-[11px] font-bold text-indigo-300">
                <Lock className="h-3.5 w-3.5" /> 256-bit SSL Encrypted
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-[11px] font-bold text-amber-300">
                <Sparkles className="h-3.5 w-3.5" /> AI Neural Dispatch
              </span>
            </div>

            <div className="mt-5 flex gap-3">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href="#"
                  aria-label={s.label}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-night-900 text-night-400 transition hover:bg-primary-500 hover:text-white"
                >
                  <s.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Explore */}
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-white">Explore</p>
            <ul className="mt-4 space-y-2.5">
              {explore.map((l) => (
                <li key={l.label}>
                  <Link to={l.to} className="text-sm transition hover:text-primary-400">
                    {l.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link to="/about" className="text-sm transition hover:text-primary-400">
                  AI Safety Architecture
                </Link>
              </li>
              <li>
                <Link to="/register" className="text-sm transition hover:text-primary-400">
                  Drive with RideGo (90% Payout)
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-white">Support & Safety</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 shrink-0 text-primary-400" />
                <a href="mailto:support@ridego.dev" className="transition hover:text-primary-400">
                  support@ridego.dev
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 shrink-0 text-primary-400" />
                <a href="tel:+18005550199" className="transition hover:text-primary-400">
                  +1 (800) 555-0199 (24/7 SOS)
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <MapPin className="h-4 w-4 shrink-0 text-primary-400" />
                <span>Global AI Operations Hub</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-night-800/80 pt-6 text-xs sm:flex-row">
          <p>© {new Date().getFullYear()} RideGo Technologies Inc. All rights reserved.</p>
          <p className="text-night-500">PCI-DSS Level 1 Compliant • Stripe Partner • AI Powered</p>
        </div>
      </div>
    </footer>
  );
}