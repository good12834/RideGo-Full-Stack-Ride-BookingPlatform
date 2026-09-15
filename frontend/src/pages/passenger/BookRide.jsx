import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, Navigation, ArrowLeft, TicketPercent, Check, Loader2, Lock, Sparkles } from "lucide-react";
import LocationSearch from "../../components/LocationSearch";
import RideMap from "../../components/RideMap";
import AiFarePredictor from "../../components/AiFarePredictor";
import { useToast } from "../../components/Toast";
import api from "../../services/api";

const TYPE_ICONS = { economy: "🚗", comfort: "✨", xl: "🚙" };
const TYPE_ORDER = ["economy", "comfort", "xl"];

// Locations may reach this page from different sources (Home / AI copilot / URL
// params) that always carry coordinates but can omit a readable `address`.
// Normalize so `/api/rides` and `/api/ai/predict-fare` never reject for a
// missing address, and the Ride schema's required `address` is always filled.
function normalizeLocation(loc) {
  if (!loc) return loc;
  return {
    ...loc,
    address: String(loc.address || loc.name || loc.label || "").trim(),
  };
}

export default function BookRide() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const toast = useToast();

  const [pickup, setPickup] = useState(() => {
    try {
      return JSON.parse(params.get("pickup")) || null;
    } catch {
      return null;
    }
  });
  const [destination, setDestination] = useState(() => {
    try {
      return JSON.parse(params.get("destination")) || null;
    } catch {
      return null;
    }
  });

  const [quotes, setQuotes] = useState([]);
  const [distance, setDistance] = useState(null);
  const [duration, setDuration] = useState(null);
  const [selected, setSelected] = useState(() => params.get("type") || "economy");
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [promoInput, setPromoInput] = useState(() => params.get("promo") || "");
  const [promo, setPromo] = useState(null);
  const [booking, setBooking] = useState(false);
  const [loadingQuotes, setLoadingQuotes] = useState(false);

  const canQuote = pickup && destination && pickup.latitude !== destination.latitude;

  useEffect(() => {
    if (!canQuote) return;
    setLoadingQuotes(true);
    api
      .post("/rides/estimate", { pickup, destination })
      .then(({ data }) => {
        setQuotes(data.quotes);
        setDistance(data.distance);
        setDuration(data.duration);
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoadingQuotes(false));
  }, [canQuote, pickup, destination, toast]);

  const activeQuote = useMemo(
    () => quotes.find((q) => q.rideType === selected) || quotes[0],
    [quotes, selected]
  );

  const finalTotal = activeQuote
    ? Math.max(0, activeQuote.subtotal - (promo?.discount || 0))
    : 0;

  async function applyPromo(customCode) {
    const code = (typeof customCode === "string" ? customCode : promoInput).trim();
    if (!code || !activeQuote) return;
    try {
      const { data } = await api.post("/promos/validate", {
        code: code.toUpperCase(),
        subtotal: activeQuote.subtotal,
      });
      setPromo(data);
      toast.success(`Promo ${data.code} applied: -$${data.discount.toFixed(2)}`);
    } catch (err) {
      setPromo(null);
      toast.error(err.message);
    }
  }

  // Auto-apply promo from query param if available
  useEffect(() => {
    const p = params.get("promo");
    if (p && activeQuote && !promo) {
      applyPromo(p);
    }
  }, [params, activeQuote]);

  async function confirm() {
    const pickupFinal = normalizeLocation(pickup);
    const destinationFinal = normalizeLocation(destination);
    if (!pickupFinal?.address || !destinationFinal?.address) {
      toast.error("Please choose named pickup and destination locations before booking.");
      return;
    }
    setBooking(true);
    try {
      const { data } = await api.post("/rides", {
        pickup: pickupFinal,
        destination: destinationFinal,
        rideType: selected,
        paymentMethod,
        promoCode: promo?.code,
      });
      toast.success("AI autonomous dispatch initiated! Connecting you to a verified driver...");
      navigate(`/passenger/active/${data.ride._id}`);
    } catch (err) {
      if (err.status === 409 && err.data?.rideId) {
        // A live ride already exists — take the passenger straight to it instead
        // of leaving them with a bare error on the booking screen.
        toast.info("You already have an active ride — we've opened it for you.");
        navigate(`/passenger/active/${err.data.rideId}`);
      } else {
        toast.error(err.message);
      }
    } finally {
      setBooking(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm font-semibold text-night-500 hover:text-night-800"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* Left: form */}
        <div className="space-y-4">
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-extrabold text-night-950">Plan Your AI Ride</h1>
              <span className="badge border border-primary-200 bg-primary-50 text-primary-700 text-xs font-bold">
                <Sparkles className="h-3 w-3" /> Smart Routing
              </span>
            </div>
            <div className="mt-4 space-y-3">
              <LocationSearch value={pickup} onChange={setPickup} placeholder="Pickup location" icon="pin" allowCurrentLocation />
              <LocationSearch value={destination} onChange={setDestination} placeholder="Where to?" icon="target" />
            </div>

            {canQuote && (
              <div className="mt-4 flex items-center justify-between rounded-xl bg-night-50 px-4 py-3 text-sm">
                <span className="flex items-center gap-1.5 font-bold text-night-700">
                  <Navigation className="h-3.5 w-3.5 text-primary-500" />
                  {distance ? `${distance} km` : "—"}
                </span>
                <span className="flex items-center gap-1.5 font-bold text-night-700">
                  <Loader2 className={`h-3.5 w-3.5 text-night-400 ${loadingQuotes ? "animate-spin" : ""}`} />
                  {duration ? `~${duration} min transit` : "—"}
                </span>
              </div>
            )}
          </div>

          {/* Ride types */}
          <div className="space-y-2.5">
            {TYPE_ORDER.map((type) => {
              const q = quotes.find((x) => x.rideType === type);
              if (!q) return null;
              const isSelected = selected === type;
              return (
                <button
                  key={type}
                  onClick={() => setSelected(type)}
                  className={`card flex w-full items-center gap-4 p-4 text-left transition ${
                    isSelected ? "ring-2 ring-primary-500 border-primary-300 shadow-sm" : "hover:border-night-200"
                  }`}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-2xl">
                    {TYPE_ICONS[type]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold capitalize text-night-900">{type}</span>
                    <span className="block text-xs text-night-400">
                      {type === "economy" ? "Affordable everyday rides" : type === "comfort" ? "Newer vehicles, extra comfort" : "More space, up to 6"}{" "}
                      • 1–{q.capacity ?? 4} passengers
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-extrabold text-night-950">${q.subtotal.toFixed(2)}</span>
                    {q.surge > 1 && (
                      <span className="block text-[10px] font-bold uppercase text-amber-600">
                        {q.surge}x surge
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Payment + promo */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold text-night-800">Payment method</p>
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                <Lock className="h-3 w-3" /> Stripe 256-bit Encrypted
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "card", label: "Stripe Card" },
                { id: "wallet", label: "Wallet" },
                { id: "cash", label: "Cash" },
              ].map(({ id: m, label }) => (
                <button
                  key={m}
                  onClick={() => setPaymentMethod(m)}
                  className={`rounded-xl border px-3 py-2.5 text-xs font-bold capitalize transition ${
                    paymentMethod === m
                      ? "border-primary-500 bg-primary-50 text-primary-700 ring-2 ring-primary-200"
                      : "border-night-200 text-night-600 hover:border-night-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-4">
              <p className="mb-2 flex items-center gap-1.5 text-sm font-bold">
                <TicketPercent className="h-4 w-4 text-primary-500" /> Promo code
              </p>
              <div className="flex gap-2">
                <input
                  className="input-base flex-1 !py-2.5 uppercase text-xs font-bold"
                  placeholder="RIDE20"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                />
                <button className="btn-ghost !py-2.5 text-xs font-bold" onClick={() => applyPromo()}>
                  Apply
                </button>
              </div>
              {promo && (
                <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-emerald-600">
                  <Check className="h-4 w-4" /> {promo.code} applied — you save ${promo.discount.toFixed(2)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right: map + AI Forecaster + summary */}
        <div className="space-y-4">
          <RideMap pickup={pickup} destination={destination} className="h-72 lg:h-[340px]" />

          {/* AI Fare & Dynamic Traffic Forecaster Widget */}
          {canQuote && (
            <AiFarePredictor pickup={pickup} destination={destination} rideType={selected} />
          )}

          {canQuote && activeQuote && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-5 border-primary-200">
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-night-500">
                  <span>Trip fare</span>
                  <span>${activeQuote.subtotal.toFixed(2)}</span>
                </div>
                {promo && (
                  <div className="flex justify-between font-semibold text-emerald-600">
                    <span>Promo {promo.code}</span>
                    <span>-${promo.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-night-100 pt-2 text-base font-extrabold text-night-950">
                  <span>Total Upfront Fare</span>
                  <span>${finalTotal.toFixed(2)}</span>
                </div>
              </div>
              <button className="btn-primary mt-4 w-full !py-3.5 text-base font-extrabold shadow-glow" onClick={confirm} disabled={booking}>
                {booking ? <Loader2 className="h-5 w-5 animate-spin" /> : `Confirm & Request Ride — $${finalTotal.toFixed(2)}`}
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
