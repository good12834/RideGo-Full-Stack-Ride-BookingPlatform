import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Lock,
  CreditCard,
  X,
  Loader2,
  CheckCircle2,
  Zap,
  Building,
} from "lucide-react";
import api from "../services/api";
import { useToast } from "./Toast";

const PAYMENT_ELEMENT_ID = "ridego-stripe-payment-element";

let stripeJsPromise = null;
let publishableKeyCache = null;

/** Lazily loads Stripe.js once (uses the publishable key from the backend config). */
function loadStripeJs() {
  if (window.Stripe) return Promise.resolve(window.Stripe);
  if (stripeJsPromise) return stripeJsPromise;
  stripeJsPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://js.stripe.com/v3";
    script.async = true;
    script.onload = () => resolve(window.Stripe);
    script.onerror = () => {
      stripeJsPromise = null;
      reject(new Error("Could not load Stripe.js â€” check your internet connection"));
    };
    document.head.appendChild(script);
  });
  return stripeJsPromise;
}

async function getStripeConfig() {
  if (publishableKeyCache) return publishableKeyCache;
  const { data } = await api.get("/payments/stripe/config");
  publishableKeyCache = data;
  return publishableKeyCache;
}

const ELEMENT_APPEARANCE = {
  theme: "stripe",
  variables: {
    colorPrimary: "#7c3aed",
    colorText: "#111827",
    colorDanger: "#dc2626",
    fontFamily: "inherit",
    spacingUnit: "4px",
    borderRadius: "10px",
  },
};

export default function StripeCheckoutModal({
  isOpen,
  onClose,
  ride,
  topupAmount,
  onSuccess,
  title = "Secure Stripe Checkout",
}) {
  const toast = useToast();
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [processing, setProcessing] = useState(false);
  const [stage, setStage] = useState("input"); // 'input' | 'element' | '3ds' | 'success'
  const [mode, setMode] = useState("loading"); // 'loading' | 'element' | 'simulated'
  const [stripe, setStripe] = useState(null); // Stripe.js client bound to publishable key
  const [intent, setIntent] = useState(null); // PaymentIntent created by the backend
  const [elementReady, setElementReady] = useState(false);
  const [stripeNotice, setStripeNotice] = useState("");
  // Handles to the live Elements/Payment Element so the submit handler can
  // confirm the PaymentIntent and the cleanup can destroy the iframe.
  const elementsRef = useRef(null);
  const paymentElementRef = useRef(null);

  // Prepare checkout: fetch the Stripe config (publishable key) and â€” when real
  // Stripe is configured â€” create the PaymentIntent up-front so the Payment
  // Element mounts instantly.
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setMode("loading");
    setStage("input");
    setIntent(null);
    setElementReady(false);
    setStripeNotice("");

    (async () => {
      try {
        const config = await getStripeConfig();
        const publishableKey = (config?.publishableKey || "").trim();
        const realStripe = Boolean(publishableKey && !publishableKey.includes("mock") && config?.isLive);

        if (cancelled) return;
        if (!realStripe) {
          setStripeNotice("Demo mode â€” real Stripe keys not detected on this server. Using simulated payments.");
          setMode("simulated");
          return;
        }

        const Stripe = await loadStripeJs();
        if (cancelled) return;
        // Build the Stripe.js client HERE, inside try â€” never inside a setState
        // lazy updater. React 18 runs updaters eagerly through its reducer; an
        // exception thrown there (Stripe can throw IntegrationError during
        // client construction when loadStripeJs() returns a polluted/corrupted
        // global â€” e.g. a browser extension) escapes this try/catch and becomes
        // an uncaught promise rejection. Constructing in-effect keeps it
        // catchable so we can fall back to simulated payments gracefully.
        const stripeClient = Stripe(publishableKey);
        if (cancelled) return;
        setStripe(stripeClient);

        const { data } = await api.post(
          ride ? "/payments/stripe/create-intent" : "/payments/stripe/topup-intent",
          ride ? { rideId: ride._id } : { amount: Number(topupAmount) || 0 }
        );
        if (cancelled || !data) return;
        if (!data.clientSecret) throw new Error("Stripe did not return a client secret");
        setIntent(data);
        setMode("element");
        setStage("element");
      } catch (err) {
        if (cancelled) return;
        console.error("[stripe-modal] Real Stripe unavailable, switched to demo mode:", err.message);
        setStripeNotice("Could not reach Stripe â€” using simulated payments.");
        setMode("simulated");
        setStage("input");
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Mount Stripe's secure Payment Element once the intent is ready.
  useEffect(() => {
    if (mode !== "element" || !stripe || !intent?.clientSecret) return;
    const container = document.getElementById(PAYMENT_ELEMENT_ID);
    if (!container) return;

    // Reset eagerly: a "ready" event queued by a previously destroyed element
    // (StrictMode remount, modal reopen) must not mark the checkout ready while
    // the fresh element below is still booting.
    setElementReady(false);

    // stripe.elements() returns an *Elements factory* â€” you must create a
    // specific element (e.g. "payment") and mount THAT instance.
    const elements = stripe.elements({
      clientSecret: intent.clientSecret,
      appearance: ELEMENT_APPEARANCE,
    });
    const paymentElement = elements.create("payment", {
      layout: { type: "tabs" },
    });

    // Only the currently-mounted element may flip elementReady on.
    let destroyed = false;
    paymentElement.on("ready", () => {
      if (!destroyed) setElementReady(true);
    });

    try {
      paymentElement.mount(`#${PAYMENT_ELEMENT_ID}`);
      elementsRef.current = elements;
      paymentElementRef.current = paymentElement;
    } catch (err) {
      console.error("[stripe-modal] Payment Element mount failed:", err.message);
      destroyed = true;
    }

    return () => {
      // Destroy the iframe so a fresh element can be created the next time the
      // modal (re)opens or a new PaymentIntent arrives.
      destroyed = true;
      try { paymentElement.destroy(); } catch (_) { /* already destroyed */ }
      // Only clear the refs if they still point at THIS instance â€” a later
      // effect run (new intent / re-mount) may have already replaced them.
      if (paymentElementRef.current === paymentElement) paymentElementRef.current = null;
      if (elementsRef.current === elements) elementsRef.current = null;
      setElementReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, stripe, intent?.clientSecret]);

  if (!isOpen) return null;

  const totalAmount = ride ? ride.fare : Number(topupAmount) || 0;

  function handleCardNumberChange(e) {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 16);
    setCardNumber(raw.replace(/(\d{4})(?=\d)/g, "$1 "));
  }

  function handleExpiryChange(e) {
    let raw = e.target.value.replace(/\D/g, "").slice(0, 4);
    if (raw.length >= 2) raw = raw.slice(0, 2) + "/" + raw.slice(2);
    setExpiry(raw);
  }

  function getCardBrand() {
    const clean = cardNumber.replace(/\s/g, "");
    if (clean.startsWith("4")) return { name: "Visa", color: "text-blue-600" };
    if (clean.startsWith("5") || clean.startsWith("2")) return { name: "Mastercard", color: "text-amber-500" };
    if (clean.startsWith("34") || clean.startsWith("37")) return { name: "American Express", color: "text-sky-600" };
    return { name: "Card", color: "text-night-500" };
  }

  function autofillTestCard() {
    setCardNumber("4242 4242 4242 4242");
    setExpiry("12/28");
    setCvc("888");
    setPostalCode("10001");
    setCardHolder("Alex Morgan");
  }

  function finishSuccess(message, payload) {
    setStage("success");
    setTimeout(() => {
      toast.success(message);
      onSuccess?.(payload);
      onClose();
    }, 1200);
  }

  // Demo fallback used when no real Stripe keys are configured on the server.
  async function handleSimulatedPay() {
    try {
      if (ride) {
        const { data: intentData } = await api.post("/payments/stripe/create-intent", { rideId: ride._id });
        const { data: result } = await api.post("/payments/stripe/confirm", {
          rideId: ride._id,
          paymentIntentId: intentData.paymentIntentId,
          cardBrand: getCardBrand().name,
          cardLast4: cardNumber.replace(/\s/g, "").slice(-4) || "4242",
        });
        finishSuccess(`Payment of $${totalAmount.toFixed(2)} completed!`, result);
      } else if (topupAmount) {
        const { data: intentData } = await api.post("/payments/stripe/topup-intent", { amount: Number(topupAmount) });
        const { data: result } = await api.post("/payments/stripe/confirm-topup", {
          paymentIntentId: intentData.paymentIntentId,
          amount: Number(topupAmount),
        });
        finishSuccess(`Wallet topped up with $${totalAmount.toFixed(2)}!`, result);
      }
    } catch (err) {
      setStage("input");
      toast.error(err?.response?.data?.message || err.message || "Payment failed");
    } finally {
      setProcessing(false);
    }
  }

  // Real Stripe flow: the customer pays inside Stripe's Payment Element (3-D
  // Secure handled automatically), then the backend verifies & settles the ride.
  async function handleElementPay() {
    if (!stripe || !intent?.clientSecret) return;
    const elements = elementsRef.current;
    const paymentElement = paymentElementRef.current;
    if (!elements || !paymentElement || !elementReady) {
      toast.error("The secure payment form is still loading â€” please try again in a moment.");
      return;
    }

    // Stripe requires elements.submit() before confirmPayment() â€” it validates
    // and collects the Payment Element's inputs (card + wallets). It must run
    // BEFORE any asynchronous work, hence before we flip into the "3ds" stage.
    let submitResult;
    try {
      submitResult = await elements.submit();
    } catch (err) {
      // Stripe throws an IntegrationError if the Element isn't mounted/ready
      // (e.g. a remount raced with the click) â€” surface a retry prompt instead
      // of leaving an uncaught promise rejection.
      toast.error(err?.message || "The payment form is not ready yet â€” please try again.");
      return;
    }
    if (submitResult.error) {
      toast.error(submitResult.error.message || "Please check your card details and try again.");
      return;
    }

    setProcessing(true);
    setStage("3ds");
    try {
      const result = await stripe.confirmPayment({
        elements,
        clientSecret: intent.clientSecret,
        redirect: "if_required", // no return_url set: finish card/3-D Secure inline
      });
      if (result.error) throw new Error(result.error.message);
      const status = result.paymentIntent?.status || "unknown";
      if (status !== "succeeded") {
        throw new Error(`Payment not completed (status: ${status})`);
      }

      const { data: serverResult } = await api.post(
        ride ? "/payments/stripe/confirm" : "/payments/stripe/confirm-topup",
        ride
          ? { rideId: ride._id, paymentIntentId: intent.paymentIntentId, cardBrand: "Card", cardLast4: "" }
          : { paymentIntentId: intent.paymentIntentId, amount: Number(totalAmount) }
      );

      finishSuccess(
        ride ? `Stripe payment of $${totalAmount.toFixed(2)} completed!` : `Wallet topped up with $${totalAmount.toFixed(2)}!`,
        serverResult
      );
    } catch (err) {
      setStage("element");
      toast.error(err?.response?.data?.message || err.message || "Payment failed");
    } finally {
      setProcessing(false);
    }
  }

  async function handlePay(e) {
    e.preventDefault();
    if (mode === "element") {
      if (!elementReady) {
        toast.error("Stripe is still preparing the secure payment form...");
        return;
      }
      return handleElementPay();
    }
    if (!cardNumber || !expiry || !cvc) {
      toast.error("Please fill in all card details");
      return;
    }
    setStage("3ds"); // simulated 3-D Secure / bank verification step
    setProcessing(true);
    return handleSimulatedPay();
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-night-950/70 p-4 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/40 bg-white shadow-2xl"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-night-100 bg-gradient-to-r from-night-950 via-night-900 to-night-950 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 via-primary-500 to-amber-400 text-white shadow-glow">
              <Lock className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base font-extrabold tracking-tight">{title}</h3>
              <p className="flex items-center gap-1 text-xs text-emerald-400">
                <ShieldCheck className="h-3.5 w-3.5" /> 256-bit SSL â€¢ Stripe PCI-DSS Level 1
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={processing && mode === "element"}
            className="rounded-xl p-1.5 text-night-400 hover:bg-white/10 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {stage === "3ds" && (
            <div className="py-12 text-center space-y-4">
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary-500" />
              <h4 className="text-lg font-bold text-night-900">Verifying with Stripe 3D Secure...</h4>
              <p className="text-xs text-night-500 max-w-xs mx-auto">
                Encrypting payment intent and performing bank token authentication.
              </p>
            </div>
          )}
          {stage === "success" ? (
            <div className="py-10 text-center space-y-3">
              <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500 animate-bounce" />
              <h4 className="text-xl font-extrabold text-night-900">Payment Authorized!</h4>
              <p className="text-sm font-semibold text-emerald-600">
                ${totalAmount.toFixed(2)} processed via Stripe
              </p>
            </div>
          ) : (
            /* The form (and the Stripe Payment Element iframe inside it) must stay
               MOUNTED while confirmPayment runs — only visually hidden during the
               3-D Secure step. Unmounting it mid-confirm makes Stripe throw
               "We could not retrieve data from the specified Element". */
            <form onSubmit={handlePay} className={stage === "3ds" ? "hidden" : "space-y-4"}>
              {/* Fare / Amount banner */}
              <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-primary-50 to-amber-50/50 p-4 border border-primary-200/60">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-night-500">
                    {ride ? `Ride #${ride.rideNumber || "Trip"} Total` : "Wallet Top-up"}
                  </span>
                  <p className="text-2xl font-black text-night-900">${totalAmount.toFixed(2)}</p>
                </div>
                {mode !== "element" && (
                  <button
                    type="button"
                    onClick={autofillTestCard}
                    className="rounded-xl border border-primary-300 bg-white px-3 py-1.5 text-xs font-bold text-primary-600 shadow-sm hover:bg-primary-50 transition flex items-center gap-1"
                  >
                    <Zap className="h-3.5 w-3.5" /> Autofill Test Card
                  </button>
                )}
              </div>

              {stripeNotice && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-[11px] font-semibold text-amber-700">
                  {stripeNotice}
                </div>
              )}

              {mode === "element" ? (
                <>
                  {/* Stripe Payment Element (secure Stripe-hosted iframe) */}
                  <div className="rounded-2xl border border-primary-200 bg-primary-50/50 p-4">
                    <p className="flex items-center gap-1.5 text-xs font-bold text-primary-700 mb-1">
                      <CreditCard className="h-4 w-4" /> Secure Card Payment â€” Powered by Stripe
                    </p>
                    <div id={PAYMENT_ELEMENT_ID} className="py-3" />
                    <p className="text-[11px] text-night-500">
                      ðŸ”’ Card details are collected inside Stripe's PCI-DSS Level 1 iframe and never touch RideGo servers.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  {/* Card visual representation (simulated / demo mode) */}
                  <div className="rounded-2xl bg-gradient-to-tr from-night-900 via-night-800 to-night-950 p-4 text-white shadow-lg space-y-3">
                    <div className="flex justify-between items-center text-xs opacity-70">
                      <span className="flex items-center gap-1 font-mono font-bold">
                        <Building className="h-3.5 w-3.5" /> STRIPE PROTECTED
                      </span>
                      <span className="font-bold tracking-widest text-amber-400 uppercase">
                        {getCardBrand().name}
                      </span>
                    </div>
                    <div className="font-mono text-lg tracking-[0.2em] font-bold text-center py-1">
                      {cardNumber || "â€¢â€¢â€¢â€¢ â€¢â€¢â€¢â€¢ â€¢â€¢â€¢â€¢ â€¢â€¢â€¢â€¢"}
                    </div>
                    <div className="flex justify-between items-end text-xs">
                      <div>
                        <span className="block text-[9px] uppercase tracking-wider opacity-60">Cardholder</span>
                        <span className="font-semibold">{cardHolder || "ALEX MORGAN"}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] uppercase tracking-wider opacity-60">Expires</span>
                        <span className="font-mono font-semibold">{expiry || "MM/YY"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Inputs */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-night-700 mb-1">Cardholder Name</label>
                      <input
                        type="text"
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value)}
                        placeholder="Alex Morgan"
                        className="input-base !py-2.5 text-sm"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-night-700 mb-1">Card Number</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={cardNumber}
                          onChange={handleCardNumberChange}
                          placeholder="4242 4242 4242 4242"
                          className="input-base !py-2.5 text-sm font-mono pr-10"
                          maxLength={19}
                          required
                        />
                        <CreditCard className="absolute right-3 top-3 h-4 w-4 text-night-400" />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs font-bold text-night-700 mb-1">Expires</label>
                        <input
                          type="text"
                          value={expiry}
                          onChange={handleExpiryChange}
                          placeholder="MM/YY"
                          className="input-base !py-2.5 text-sm font-mono text-center"
                          maxLength={5}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-night-700 mb-1">CVC / CVV</label>
                        <input
                          type="password"
                          value={cvc}
                          onChange={(e) => setCvc(e.target.value.slice(0, 4))}
                          placeholder="123"
                          className="input-base !py-2.5 text-sm font-mono text-center"
                          maxLength={4}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-night-700 mb-1">Postal Code</label>
                        <input
                          type="text"
                          value={postalCode}
                          onChange={(e) => setPostalCode(e.target.value.slice(0, 10))}
                          placeholder="10001"
                          className="input-base !py-2.5 text-sm text-center"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={processing || mode === "loading" || (mode === "element" && !elementReady)}
                className="btn-primary w-full !py-3.5 text-base font-extrabold shadow-glow"
              >
                {processing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : mode === "loading" ? (
                  "Preparing secure checkout..."
                ) : (
                  `Pay $${totalAmount.toFixed(2)} with Stripe`
                )}
              </button>

              <div className="flex items-center justify-center gap-4 pt-1 text-[11px] text-night-400">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> End-to-End Encrypted
                </span>
                <span className="flex items-center gap-1">
                  <Lock className="h-3.5 w-3.5 text-indigo-500" /> Zero Card Data Stored
                </span>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
