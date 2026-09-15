import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  Siren,
  XCircle,
  Star,
  CheckCircle2,
  Receipt,
  CreditCard,
  Banknote,
  Wallet,
  MapPin,
  Navigation,
  Copy,
  Lock,
  Sparkles,
  Zap,
  Activity,
  Radio,
  FastForward,
  Compass,
} from "lucide-react";
import RideMap from "../../components/RideMap";
import DriverCard from "../../components/DriverCard";
import StatusBadge, { formatStatus } from "../../components/StatusBadge";
import RatingModal from "../../components/RatingModal";
import StripeCheckoutModal from "../../components/StripeCheckoutModal";
import AiSafetyGuardian from "../../components/AiSafetyGuardian";
import { useToast } from "../../components/Toast";
import { useSocket } from "../../hooks/useSocket";
import { useRide } from "../../context/RideContext";
import api from "../../services/api";

const TIMELINE = [
  "SEARCHING_DRIVER",
  "DRIVER_ASSIGNED",
  "DRIVER_ARRIVING",
  "DRIVER_ARRIVED",
  "TRIP_STARTED",
  "TRIP_COMPLETED",
  "PAYMENT_COMPLETED",
];

export default function ActiveRide() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { socket, on, off } = useSocket();
  const { driverLocation } = useRide();

  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payMethod, setPayMethod] = useState("card");
  const [paying, setPaying] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [autoMatching, setAutoMatching] = useState(false);
  const [simulatingStep, setSimulatingStep] = useState(false);
  // Guards payment double-submits — React state updates are async, so the
  // `disabled` prop alone won't stop two rapid clicks on the pay button.
  const payingRef = useRef(false);

  // Search telemetry state
  const [searchTelemetry, setSearchTelemetry] = useState({
    stage: "SCANNING",
    message: "Scanning nearby driver radar in 4.5km coverage radius...",
    progress: 25,
    matchedCount: 4,
  });

  async function load() {
    try {
      const { data } = await api.get(`/rides/${id}`);
      setRide(data.ride);
      if (data.ride.paymentMethod) setPayMethod(data.ride.paymentMethod);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Live updates via WebSocket
  useEffect(() => {
    if (!socket) return undefined;

    const events = [
      "ride:accepted",
      "ride:driverArriving",
      "ride:driverArrived",
      "ride:tripStarted",
      "ride:tripCompleted",
      "ride:cancelled",
      "payment:completed",
    ];
    events.forEach((e) => on(e, load));

    const handleTelemetry = (data) => {
      setSearchTelemetry((prev) => ({ ...prev, ...data }));
    };
    on("ride:searchTelemetry", handleTelemetry);

    return () => {
      events.forEach((e) => off(e, load));
      off("ride:searchTelemetry", handleTelemetry);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, id]);

  // Simulated fallback progress timer if searching takes a few seconds
  useEffect(() => {
    if (!ride || ride.status !== "SEARCHING_DRIVER") return undefined;

    const timer1 = setTimeout(() => {
      setSearchTelemetry({
        stage: "RANKING",
        message: "AI evaluating 5.0★ driver ratings, Tesla & hybrid fleets...",
        progress: 60,
        matchedCount: 4,
      });
    }, 2000);

    const timer2 = setTimeout(() => {
      setSearchTelemetry({
        stage: "MATCHED",
        message: "AI Optimal Match found! Auto-dispatching driver...",
        progress: 95,
        matchedCount: 1,
      });
    }, 4500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [ride?.status]);

  async function triggerInstantAiMatch() {
    setAutoMatching(true);
    try {
      const { data } = await api.post(`/rides/${id}/auto-dispatch`);
      setRide(data.ride);
      toast.success("AI driver paired instantly!");
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Failed to auto-dispatch");
    } finally {
      setAutoMatching(false);
    }
  }

  async function handleAdvanceSimulation() {
    setSimulatingStep(true);
    try {
      const { data } = await api.post(`/rides/${id}/simulate-step`);
      setRide(data.ride);
      toast.success(`Advanced trip to ${data.nextStatus.replaceAll("_", " ")}`);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Could not advance simulation");
    } finally {
      setSimulatingStep(false);
    }
  }

  async function cancel() {
    if (!window.confirm("Cancel this ride?")) return;
    try {
      await api.post(`/rides/${id}/cancel`, { reason: "Changed plans" });
      toast.info("Ride cancelled");
      navigate("/passenger");
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function sos() {
    try {
      await api.post(`/rides/${id}/emergency`);
      toast.error("SOS alert sent to RideGo AI safety team");
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handlePayClick() {
    if (payMethod === "card") {
      setShowStripeModal(true);
      return;
    }
    if (payingRef.current) return; // block double-clicks before React re-renders
    payingRef.current = true;
    setPaying(true);
    try {
      const { data } = await api.post("/payments/pay", { rideId: id, method: payMethod });
      setRide((r) => ({ ...r, ...data.ride }));
      toast.success(`Payment of $${data.payment.amount.toFixed(2)} received via ${payMethod}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setPaying(false);
      payingRef.current = false;
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!ride) {
    return (
      <div className="card mx-auto max-w-md p-10 text-center">
        <p className="font-bold">Ride not found</p>
        <Link to="/passenger" className="btn-primary mt-4">Back to dashboard</Link>
      </div>
    );
  }

  const awaitingPayment = ride.status === "TRIP_COMPLETED";
  const finished = ride.status === "PAYMENT_COMPLETED" || ride.status === "CANCELLED";
  const driver = ride.driverId;
  const driverUser = driver?.userId;
  const vehicle = ride.vehicleId;
  const currentIndex = TIMELINE.indexOf(ride.status);
  const canSimulateStep = ["DRIVER_ASSIGNED", "DRIVER_ARRIVING", "DRIVER_ARRIVED", "TRIP_STARTED"].includes(ride.status);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-black text-night-950">Ride #{ride.rideNumber}</h1>
          <span className="badge border border-primary-200 bg-primary-50 text-primary-700 text-xs font-bold">
            <Sparkles className="h-3 w-3" /> AI Autonomous Dispatch
          </span>
        </div>
        <StatusBadge status={ride.status} className="!text-sm" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <RideMap
            pickup={ride.pickup}
            destination={ride.destination}
            driverLocation={
              driverLocation && String(ride._id) === String(id)
                ? driverLocation
                : driver?.currentLocation &&
                  driver.currentLocation.latitude
                  ? driver.currentLocation
                  : null
            }
            className="h-72 lg:h-96"
          />

          {/* AI Safety Guardian during ride */}
          {!finished && (
            <AiSafetyGuardian ride={ride} onSos={sos} />
          )}

          {/* Timeline */}
          {!finished && (
            <div className="card p-5">
              <div className="space-y-3">
                {TIMELINE.map((step, i) => {
                  const done = currentIndex > i || ride.status === step;
                  return (
                    <div key={step} className="flex items-center gap-3">
                      {done ? (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                      ) : (
                        <span className="h-5 w-5 shrink-0 rounded-full border-2 border-night-200" />
                      )}
                      <span className={`text-sm ${done ? "font-bold text-night-900" : "text-night-400"}`}>
                        {formatStatus(step)}
                      </span>
                      {i === 0 && ride.status === "SEARCHING_DRIVER" && (
                        <Loader2 className="h-4 w-4 animate-spin text-primary-500" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Functional AI Autonomous Dispatching Section */}
          {ride.status === "SEARCHING_DRIVER" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="card overflow-hidden border-primary-300 bg-gradient-to-b from-white via-primary-50/30 to-amber-50/20 p-6 shadow-xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-primary-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-primary-500 to-amber-400 text-white shadow-glow">
                    <Radio className="h-4 w-4 animate-pulse" />
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-night-950">AI Autonomous Dispatching</h3>
                    <p className="text-[11px] text-primary-700 font-semibold">
                      Matching highest-rated nearby driver (~18s avg)
                    </p>
                  </div>
                </div>
                <span className="badge bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  Active Radar
                </span>
              </div>

              {/* Radar Pulsing Animation */}
              <div className="relative py-4 text-center">
                <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-primary-400/20 animate-ping" />
                  <div className="absolute inset-2 rounded-full bg-primary-500/30 animate-pulse" />
                  <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-primary-500 to-amber-400 text-white shadow-glow">
                    <Compass className="h-7 w-7 animate-spin" style={{ animationDuration: "6s" }} />
                  </div>
                </div>

                <p className="mt-3 text-xs font-extrabold text-night-900">
                  {searchTelemetry.message}
                </p>
              </div>

              {/* Live Match Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-bold text-night-600">
                  <span>AI Radar Scanning</span>
                  <span className="text-primary-600 font-black">{searchTelemetry.progress}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-night-100">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary-500 via-amber-400 to-emerald-500"
                    initial={{ width: "15%" }}
                    animate={{ width: `${searchTelemetry.progress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>

              {/* Instant Match Trigger Button */}
              <button
                onClick={triggerInstantAiMatch}
                disabled={autoMatching}
                className="btn-primary w-full !py-3 text-xs font-extrabold shadow-glow flex items-center justify-center gap-1.5"
              >
                {autoMatching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Zap className="h-4 w-4 text-amber-200" /> Instant AI Match (0s)
                  </>
                )}
              </button>

              <p className="text-center text-[10px] text-night-400">
                AI matches by distance, 5.0★ rating, and vehicle cleanliness score.
              </p>
            </motion.div>
          )}

          {/* Driver assigned card */}
          {driverUser && !finished && (
            <div className="space-y-3">
              <DriverCard
                driver={{ name: driverUser.name, phone: driverUser.phone, rating: driver.rating }}
                vehicle={vehicle}
                ridePin={ride.ridePin}
              />

              {/* Interactive Demo Simulation Controls */}
              {canSimulateStep && (
              <div className="rounded-2xl border border-primary-200 bg-primary-50/50 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-primary-800 flex items-center gap-1">
                    <FastForward className="h-3.5 w-3.5 text-primary-600" /> Demo Simulator
                  </span>
                  <span className="text-[10px] text-night-500 font-semibold">Test Driver Actions</span>
                </div>
                <button
                  onClick={handleAdvanceSimulation}
                  disabled={simulatingStep}
                  className="btn-ghost w-full !py-2 !text-xs font-bold bg-white hover:bg-primary-50 hover:border-primary-300"
                >
                  {simulatingStep ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    `Advance Stage: ${
                      ride.status === "DRIVER_ASSIGNED"
                        ? "Driver Arriving"
                        : ride.status === "DRIVER_ARRIVING"
                          ? "Driver Arrived"
                          : ride.status === "DRIVER_ARRIVED"
                            ? "Start Trip"
                            : "Complete Trip & Pay"
                    } →`
                  )}
                </button>
              </div>
              )}
            </div>
          )}

          {ride.ridePin && driverUser && !finished && (
            <div className="card flex items-center justify-between p-4 bg-gradient-to-r from-white to-primary-50/40 border-primary-200">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-night-500">
                  Secret Ride PIN (Share with Driver)
                </p>
                <p className="font-mono text-2xl font-black tracking-[0.3em] text-primary-600">
                  {ride.ridePin}
                </p>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(ride.ridePin);
                  toast.info("PIN copied to clipboard");
                }}
                className="btn-ghost !px-3 !py-2"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Awaiting payment */}
          {awaitingPayment && (
            <div className="card p-5 border-primary-200 bg-gradient-to-b from-white to-primary-50/20">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-2 font-extrabold text-night-900">
                  <Receipt className="h-5 w-5 text-primary-500" /> Ride complete — Pay now
                </p>
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                  <Lock className="h-3 w-3" /> Stripe Secure
                </span>
              </div>

              <div className="mt-3 space-y-1 text-sm">
                <div className="flex justify-between text-night-500">
                  <span>Trip fare</span>
                  <span>${ride.fare.toFixed(2)}</span>
                </div>
                {ride.discount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Promo {ride.promoCode}</span>
                    <span>-${ride.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-night-100 pt-1.5 font-extrabold text-base text-night-950">
                  <span>Total Due</span>
                  <span>${ride.fare.toFixed(2)}</span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  { id: "card", icon: CreditCard, label: "Stripe Card" },
                  { id: "wallet", icon: Wallet, label: "Wallet" },
                  { id: "cash", icon: Banknote, label: "Cash" },
                ].map(({ id: m, icon: Icon, label }) => (
                  <button
                    key={m}
                    onClick={() => setPayMethod(m)}
                    className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-xs font-bold transition ${
                      payMethod === m
                        ? "border-primary-500 bg-primary-50 text-primary-700 ring-2 ring-primary-300"
                        : "border-night-200 text-night-600 hover:border-night-300"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>

              <button
                className="btn-primary mt-4 w-full !py-3.5 text-base font-extrabold shadow-glow"
                onClick={handlePayClick}
                disabled={paying}
              >
                {paying ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : payMethod === "card" ? (
                  `Pay $${ride.fare.toFixed(2)} via Stripe`
                ) : (
                  `Confirm Payment of $${ride.fare.toFixed(2)}`
                )}
              </button>
            </div>
          )}

          {/* Completed */}
          {finished && ride.status === "PAYMENT_COMPLETED" && (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="card p-6 text-center border-emerald-200 bg-gradient-to-b from-white to-emerald-50/20"
            >
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
              <p className="mt-2 font-extrabold text-lg text-night-900">Payment Completed</p>
              <p className="text-sm font-semibold text-emerald-600">
                ${ride.fare.toFixed(2)} paid via {ride.paymentMethod || "Stripe"}
              </p>
              <p className="mt-1 text-[11px] text-night-400">
                Encrypted transaction verified by Stripe Radar AI
              </p>
              <button className="btn-primary mt-4 w-full" onClick={() => setShowRating(true)}>
                <Star className="h-4 w-4" /> Rate your driver
              </button>
              <Link to="/passenger" className="btn-ghost mt-2 w-full">
                Back to dashboard
              </Link>
            </motion.div>
          )}

          {ride.status === "CANCELLED" && (
            <div className="card p-6 text-center">
              <XCircle className="mx-auto h-10 w-10 text-red-500" />
              <p className="mt-2 font-bold">Ride cancelled</p>
              <p className="text-sm text-night-500">
                by {ride.cancelledBy || "unknown"} — {ride.cancelReason}
              </p>
              <Link to="/passenger" className="btn-primary mt-4 w-full">
                Book a new ride
              </Link>
            </div>
          )}

          {/* Route summary */}
          <div className="card space-y-2 p-5">
            <div className="flex items-start gap-2.5 text-sm">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              <span>{ride.pickup.address}</span>
            </div>
            <div className="flex items-start gap-2.5 text-sm">
              <Navigation className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              <span>{ride.destination.address}</span>
            </div>
            <div className="border-t border-night-100 pt-2 text-xs text-night-400">
              {Number(ride.distance).toFixed(1)} km • {ride.duration} min • {ride.rideType}
            </div>
          </div>

          {/* Safety actions */}
          {!finished && (
            <div className="grid grid-cols-2 gap-2">
              <button onClick={cancel} className="btn-ghost !py-2.5 text-sm">
                <XCircle className="h-4 w-4" /> Cancel ride
              </button>
              <button onClick={sos} className="btn-danger !py-2.5 text-sm font-bold">
                <Siren className="h-4 w-4" /> SOS Alert
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stripe Modal */}
      <StripeCheckoutModal
        isOpen={showStripeModal}
        onClose={() => setShowStripeModal(false)}
        ride={ride}
        onSuccess={(result) => {
          if (result?.ride) setRide((r) => ({ ...r, ...result.ride }));
          else load();
        }}
      />

      {showRating && (
        <RatingModal
          ride={ride}
          onClose={() => setShowRating(false)}
          onRated={() => {
            toast.success("Thanks for rating your driver!");
            navigate("/passenger/rides");
          }}
        />
      )}
    </div>
  );
}
