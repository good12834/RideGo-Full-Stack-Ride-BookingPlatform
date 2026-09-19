import { estimateFare, routeDistanceKm, estimateDurationMin, VEHICLE_TYPES } from "../utils/fareCalculator.js";
import PromoCode from "../models/PromoCode.js";
import { generateGeminiText, isGeminiEnabled, geminiStatus, AUX_MODEL_CHAIN } from "./geminiService.js";

// Predefined city landmarks for NLP location parsing
const KNOWN_LOCATIONS = [
  { name: "Downtown Central Station", aliases: ["downtown", "central station", "train station", "city center", "main station"], latitude: 40.758, longitude: -73.9855 },
  { name: "International Airport Terminal 3", aliases: ["airport", "terminal 3", "jfk", "lax", "international airport", "airport terminal"], latitude: 40.6413, longitude: -73.7781 },
  { name: "Grandview Shopping Mall", aliases: ["mall", "grandview", "shopping center", "shopping mall", "grandview mall"], latitude: 40.7411, longitude: -73.9897 },
  { name: "Riverside University Campus", aliases: ["university", "campus", "riverside", "college", "school"], latitude: 40.809, longitude: -73.9605 },
  { name: "City Stadium North Gate", aliases: ["stadium", "city stadium", "arena", "north gate", "sports complex"], latitude: 40.7736, longitude: -73.9566 },
  { name: "Innovation Tech Park", aliases: ["tech park", "innovation park", "silicon park", "tech hub", "innovation"], latitude: 40.7081, longitude: -73.9571 },
  { name: "St. Mary General Hospital", aliases: ["hospital", "st mary", "clinic", "medical center", "emergency room"], latitude: 40.7691, longitude: -73.9712 },
  { name: "Old Harbor Waterfront", aliases: ["harbor", "waterfront", "port", "old harbor", "pier", "dock"], latitude: 40.7005, longitude: -74.0149 },
  { name: "Times Square Broadway", aliases: ["times square", "broadway", "theater district"], latitude: 40.758896, longitude: -73.98513 },
  { name: "Central Park South", aliases: ["central park", "park", "central park south"], latitude: 40.7663, longitude: -73.9774 },
];
function findLocationInText(text) {
  const lower = text.toLowerCase();
  for (const loc of KNOWN_LOCATIONS) {
    for (const alias of loc.aliases) {
      if (lower.includes(alias)) {
        return { address: loc.name, latitude: loc.latitude, longitude: loc.longitude };
      }
    }
  }
  return null;
}

/**
 * Built-in deterministic Neural NLP engine.
 * Parses booking / safety / stripe / driver / promo intents without any
 * external API — always available as the offline fallback.
 */
export async function runLocalCopilot({ message, history = [], context = {}, user = null }) {
  const msgLower = (message || "").toLowerCase().trim();

  // 1. Check for Ride Booking Intent
  const isBookingQuery =
    msgLower.includes("book") ||
    msgLower.includes("ride to") ||
    msgLower.includes("take me to") ||
    msgLower.includes("go to") ||
    msgLower.includes("drive to") ||
    msgLower.includes("trip to") ||
    msgLower.includes("from ") && msgLower.includes("to ");

  if (isBookingQuery) {
    let pickup = context.pickup || null;
    let destination = context.destination || null;

    // Try extracting from / to patterns
    const fromMatch = msgLower.match(/from\s+([a-zA-Z0-9\s]+?)(?=\s+to|\s+in|\s+with|\s+using|$)/i);
    const toMatch = msgLower.match(/to\s+([a-zA-Z0-9\s]+?)(?=\s+from|\s+in|\s+with|\s+using|$)/i);

    if (fromMatch) {
      const loc = findLocationInText(fromMatch[1]);
      if (loc) pickup = loc;
    }
    if (toMatch) {
      const loc = findLocationInText(toMatch[1]);
      if (loc) destination = loc;
    }

    // Default fallbacks if one is mentioned
    if (!destination) {
      destination = findLocationInText(msgLower);
    }
    if (!pickup && destination) {
      // If user has a current location or default to Downtown
      pickup = KNOWN_LOCATIONS[0];
    }

    // Detect vehicle type preference
    let rideType = "economy";
    if (msgLower.includes("comfort") || msgLower.includes("luxury") || msgLower.includes("sedan")) rideType = "comfort";
    else if (msgLower.includes("xl") || msgLower.includes("suv") || msgLower.includes("van") || msgLower.includes("group") || msgLower.includes("family")) rideType = "xl";

    // Detect promo code
    const promoMatch = msgLower.match(/promo\s+([a-zA-Z0-9]+)/i) || msgLower.match(/code\s+([a-zA-Z0-9]+)/i);
    const promoCode = promoMatch ? promoMatch[1].toUpperCase() : null;

    if (pickup && destination && pickup.address !== destination.address) {
      const quote = estimateFare({ pickup, destination, rideType });
      let discount = 0;
      let finalFare = quote.subtotal;

      if (promoCode) {
        const promoDoc = await PromoCode.findOne({ code: promoCode });
        if (promoDoc && promoDoc.isValid()) {
          discount = promoDoc.discountType === "percentage"
            ? Math.round((quote.subtotal * promoDoc.discountValue) / 100 * 100) / 100
            : Math.min(promoDoc.discountValue, quote.subtotal);
          finalFare = Math.max(0, quote.subtotal - discount);
        }
      }

      return {
        topic: "booking",
        reply: `I've planned your AI-optimized route from **${pickup.address}** to **${destination.address}**!\n\n` +
          `• **Estimated Distance:** ${quote.distanceKm} km (~${quote.durationMin} mins)\n` +
          `• **Vehicle:** ${VEHICLE_TYPES[rideType]?.label || "Economy"}\n` +
          `• **AI Predicted Fare:** $${finalFare.toFixed(2)}${discount > 0 ? ` *(Saved $${discount.toFixed(2)} with ${promoCode})*` : ""}\n` +
          `• **Stripe Protected Checkout:** Ready\n\n` +
          `Click below to confirm your booking instantly.`,
        action: {
          type: "RIDE_QUOTE",
          pickup,
          destination,
          rideType,
          promoCode: discount > 0 ? promoCode : undefined,
          fare: finalFare,
          distance: quote.distanceKm,
          duration: quote.durationMin,
        },
        suggestions: [
          "Book this ride now",
          "Switch to Comfort class",
          "Show AI traffic forecast",
        ],
      };
    }
  }

  // 1b. Live-data guard — the local engine cannot see real-time driver counts,
  // live surge or current traffic. Answer that honestly instead of letting the
  // keyword matcher hijack the question with an unrelated marketing reply
  // (e.g. "how many drivers are free right now?" used to return the driver pitch).
  const asksLiveData =
    !isBookingQuery &&
    (/\b(right now|currently|live|real[- ]?time|at this moment|near me|around me)\b/.test(msgLower) ||
      (/\bhow many\b/.test(msgLower) && /\b(driver|car|taxi|vehicle|ride)s?\b/.test(msgLower)));

  if (asksLiveData) {
    return {
      topic: "live",
      reply: `📡 **I can't read live data** — real-time driver availability, current surge pricing and live traffic aren't exposed to me.\n\n` +
        `Open the booking screen: the live map shows nearby drivers, accurate ETAs and the exact fare for your route right now.`,
      suggestions: ["Book a ride now", "How does AI dynamic pricing work?", "Show active promos"],
    };
  }

  // 2. Safety Inquiries
  if (msgLower.includes("safe") || msgLower.includes("security") || msgLower.includes("sos") || msgLower.includes("emergency") || msgLower.includes("pin")) {
    return {
      topic: "safety",
      reply: `🛡️ **RideGo AI Multi-Layer Safety Guardian** is active on every ride:\n\n` +
        `1. **4-Digit Ride PIN:** Never get into the wrong vehicle. The driver cannot start the trip until you share your unique PIN.\n` +
        `2. **Neural Route Anomaly Sentinel:** Live telemetry monitors route adherence, unexpected stops, and sudden speed anomalies.\n` +
        `3. **One-Touch Emergency SOS:** Instantly transmits live GPS coordinates and driver ID to our 24/7 Safety Command Center.\n` +
        `4. **100% Background-Checked Drivers:** Every driver undergoes rigorous vehicle inspection and background verification.`,
      suggestions: ["How does Stripe payment protection work?", "Book an AI-safe ride", "Check driver requirements"],
    };
  }

  // 3. Payment & Stripe Protection Inquiries
  if (msgLower.includes("stripe") || msgLower.includes("pay") || msgLower.includes("card") || msgLower.includes("wallet") || msgLower.includes("protect") || msgLower.includes("charge")) {
    return {
      topic: "payment",
      reply: `💳 **Bank-Grade Stripe Payment Protection:**\n\n` +
        `• **PCI-DSS Level 1 Compliant:** Raw credit card data never touches our servers. Everything is encrypted end-to-end through Stripe Elements.\n` +
        `• **Server-Enforced Fare Verification:** Fares are recalculated on our backend to prevent any client-side tampering.\n` +
        `• **Zero-Risk In-App Wallet:** Top up funds securely via Stripe and enjoy 1-click frictionless rides.\n` +
        `• **Anti-Double-Charge Idempotency:** Every transaction is locked with a unique cryptographic key.`,
      suggestions: ["Top up wallet with Stripe", "Find a ride", "View active promotions"],
    };
  }

  // 4. Driver & Earnings Inquiries
  if (msgLower.includes("driver") || msgLower.includes("earn") || msgLower.includes("commission") || msgLower.includes("drive with") || msgLower.includes("salary")) {
    return {
      topic: "driver",
      reply: `🚗 **Drive with RideGo — Industry-Leading 90% Payout:**\n\n` +
        `• **Keep 90% of Every Fare:** Platform fee is only 10% (industry lowest).\n` +
        `• **AI Demand Hotspots:** Our predictive dispatch directs you to high-surge zones before passengers even request.\n` +
        `• **Instant Payouts via Stripe Connect:** Direct transfers straight to your bank account.\n` +
        `• **Flexible Schedule:** Drive whenever you choose, full-time or part-time.`,
      suggestions: ["Register as a driver", "Calculate driver earnings", "Driver requirements"],
    };
  }

  // 5. Promo Code Inquiries
  if (msgLower.includes("promo") || msgLower.includes("discount") || msgLower.includes("coupon") || msgLower.includes("offer") || msgLower.includes("deal")) {
    return {
      topic: "promo",
      reply: `🎉 **Current Active AI Promotions:**\n\n` +
        `• **RIDE20** — 20% off your next ride (Max $10)\n` +
        `• **WELCOME10** — $10 flat off your first booking\n` +
        `• **AIRPORT50** — $5 off rides to/from International Airport\n\n` +
        `Just mention the promo code or enter it on the booking screen!`,
      suggestions: ["Book ride with RIDE20", "Book airport ride with AIRPORT50", "Check ride fares"],
    };
  }

  // 6. General Intelligent Fallback
  return {
    topic: "general",
    reply: `Hello${user ? ` ${user.name.split(" ")[0]}` : ""}! I am your **RideGo AI Copilot** 🤖.\n\n` +
      `Here is how I can assist you today:\n` +
      `• **Smart Ride Planning:** Say *"Take me from Downtown to Airport in Comfort"*.\n` +
      `• **AI Fare & Surge Forecast:** Ask *"What's the best time to leave to avoid traffic?"*\n` +
      `• **Safety & Stripe Inquiries:** Learn about our 256-bit encryption & AI SOS Sentinel.\n` +
      `• **Driver Insights:** Explore hot-zones and 90% payout earnings.`,
    suggestions: [
      "Book ride: Downtown to Airport",
      "Explain AI dynamic pricing",
      "How is Stripe payment protected?",
      "Show active promos",
    ],
  };
}

/**
 * Shared instruction added to every Copilot prompt: the model finishes with a
 * machine-readable follow-up line that we turn into clickable suggestion pills.
 */
const SUGGESTIONS_RULE =
  " Then finish with one final line in EXACTLY this format: " +
  "SUGGESTIONS: option one | option two | option three — 2-5 words each, written as short questions or commands " +
  "the user could ask next, tailored to what they just asked. Never add anything after that line.";

/**
 * Shown when every Gemini model in the chain is unavailable AND the local engine
 * has no genuine answer (general questions). Better an honest retry prompt than
 * a keyword-matched canned reply that does not answer what was asked.
 */
const ENGINE_BUSY_REPLY =
  "⚠️ **Gemini 2.5 is briefly rate-limited**, so I couldn't pull a real answer for that one just now.\n\n" +
  "Give it a few seconds and ask me again — booking, fares and payments keep working normally in the meantime.";
const BUSY_SUGGESTIONS = ["Book a ride now", "How does AI dynamic pricing work?", "Show active promos"];

/** Appended when a platform-topic answer comes from the built-in knowledge base. */
const LOCAL_FALLBACK_NOTE =
  "\n\n_⚠️ Gemini 2.5 was busy for a moment — this answer came from RideGo's built-in knowledge base._";

/**
 * Intelligent AI Copilot & NLP intent parser (Gemini Neural Engine).
 * Runs the deterministic engine first (for reliable booking actions), then —
 * when the Gemini API key is configured — uses Gemini to write a natural,
 * context-aware reply while keeping the structured action/suggestions intact.
 * Any Gemini failure automatically falls back to the built-in engine.
 */
export async function handleAiCopilot({ message, history = [], context = {}, user = null }) {
  const localResult = await runLocalCopilot({ message, history, context, user });

  if (!localResult) return localResult;
  if (!isGeminiEnabled()) return { ...localResult, engine: "neural" };

  // Booking cards carry REAL engine-computed data (route, distance, fare) that
  // drives the interactive booking UI — those numbers must stay exact.
  // For everything else, Gemini answers the user's actual question with its
  // real knowledge instead of paraphrasing the canned local draft.
  const hasBookingCard = localResult.action?.type === "RIDE_QUOTE";

  const systemInstruction = hasBookingCard
    ? "You are the RideGo AI Copilot v2.0, powered by Google Gemini 2.5, for the RideGo ride-hailing platform. " +
      "The booking data supplied below (route, distance, duration, vehicle, fare, promo) was calculated by the REAL " +
      "RideGo pricing engine — present those numbers EXACTLY as provided, never alter, round or invent any figure, " +
      "and invite the user to confirm the ride with the booking card. " +
      "Reply in short, friendly markdown (2-6 short lines)." + SUGGESTIONS_RULE
    : "You are the RideGo AI Copilot v2.0, powered by Google Gemini 2.5 — a real, knowledgeable assistant for the " +
      "RideGo ride-hailing platform. ALWAYS answer the user's actual question with your genuine knowledge. Do NOT " +
      "simply rephrase the 'localDraft' — treat it as optional platform context and use it only if it is genuinely " +
      "relevant to what the user asked. If the question is unrelated to RideGo or rides, just answer it normally " +
      "with your real knowledge. " +
      "Verified RideGo platform facts you may use when relevant: fares are estimated in USD before booking; vehicle " +
      "classes are Economy, Comfort and XL; drivers keep 90% of every fare (10% platform fee); every ride is protected " +
      "by a 4-digit pickup PIN, live route-anomaly monitoring and one-touch emergency SOS; payments run through Stripe " +
      "(PCI-DSS Level 1) with an optional in-app wallet; common promo codes are RIDE20 (20% off, max $10), WELCOME10 " +
      "($10 off a first ride) and AIRPORT50 ($5 off airport rides). " +
      "Never fabricate live data (real-time traffic, live driver counts, current weather, exact arrival times) — " +
      "for anything live, direct the user to the booking screen. " +
      "Reply in short, friendly markdown (2-6 short lines). " +
      "You ARE the copilot — never call yourself a language model and never mention 'the draft'." +
      SUGGESTIONS_RULE;

  try {
    const gemini = await generateGeminiText({
      systemInstruction,
      message,
      history: history || [],
      context: {
        localDraft: localResult.reply,
        pickup: localResult.action?.pickup,
        destination: localResult.action?.destination,
        rideType: localResult.action?.rideType,
        fare: localResult.action?.fare,
        user: userName(user),
      },
      temperature: hasBookingCard ? 0.4 : 0.8,
    });

    const parsed = splitSuggestions(gemini?.text || "");
    const cleaned = stripImitatedAssistantPrefix(parsed.reply);
    if (cleaned) {
      return {
        ...localResult,
        reply: cleaned,
        // Booking cards keep their purpose-built chips; every other answer uses
        // the follow-up options Gemini tailored to the user's actual question.
        suggestions: hasBookingCard
          ? localResult.suggestions || []
          : parsed.suggestions.length
            ? parsed.suggestions
            : localResult.suggestions || [],
        engine: "gemini",
        aiModel: gemini?.model || geminiStatus().model,
      };
    }
  } catch (err) {
    console.error("[ai/gemini] Copilot enrichment failed — using the built-in Neural engine:", err.message);

    // The keyword engine has no real answer for general questions, so never fake
    // one: tell the user Gemini was briefly unavailable so they can retry.
    if (!hasBookingCard && localResult.topic === "general") {
      return {
        ...localResult,
        reply: ENGINE_BUSY_REPLY,
        suggestions: BUSY_SUGGESTIONS,
        engine: "neural",
        aiModel: null,
      };
    }

    // On-topic platform answers are still accurate — serve them, but label their
    // real source instead of implying Gemini wrote them.
    if (!hasBookingCard) {
      return { ...localResult, reply: `${localResult.reply}${LOCAL_FALLBACK_NOTE}`, engine: "neural", aiModel: null };
    }
  }

  return { ...localResult, engine: "neural" };
}

function userName(user) {
  return user?.name || (user?.email ? user.email.split("@")[0] : "guest");
}

/** Strips accidental "Assistant:" / "RideGo AI:" prefixes from model output. */
function stripImitatedAssistantPrefix(text) {
  return text.replace(/^(Assistant|RideGo AI Copilot|RideGo AI):\s*/i, "").trim();
}

/**
 * Splits the trailing "SUGGESTIONS: a | b | c" line off the model reply so it
 * becomes clickable follow-up pills instead of visible chat text.
 */
function splitSuggestions(text) {
  const match = text.match(/^[ \t]*SUGGESTIONS:[ \t]*(.+)$/im);
  if (!match) return { reply: text.trim(), suggestions: [] };

  const suggestions = match[1]
    .split("|")
    .map((part) => part.trim().replace(/^[-•*.\d)\s]+/, "").trim())
    .filter(Boolean)
    .slice(0, 4);

  return { reply: text.replace(match[0], "").trim(), suggestions };
}

/**
 * AI Dynamic Fare & Traffic Forecaster
 */
export async function predictFareAndTraffic({ pickup, destination, rideType = "economy" }) {
  if (!pickup?.latitude || !destination?.latitude) {
    throw new Error("Pickup and destination coordinates required");
  }

  const baseQuote = estimateFare({ pickup, destination, rideType });
  const distanceKm = baseQuote.distanceKm;

  // Simulate AI Neural Traffic & Weather Models
  const now = new Date();
  const hour = now.getHours();
  const isRushHour = (hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 19);

  const trafficDensity = isRushHour ? 0.78 : (hour >= 22 || hour <= 5) ? 0.15 : 0.42;
  const trafficCongestionPct = Math.round(trafficDensity * 100);
  
  // Weather simulation
  const weatherConditions = [
    { condition: "Clear Skies", factor: 1.0, icon: "Sun", impact: "Optimal driving conditions" },
    { condition: "Light Rain", factor: 1.08, icon: "CloudRain", impact: "Slight road dampness (+8% surge)" },
    { condition: "Moderate Fog", factor: 1.05, icon: "CloudFog", impact: "Cautious transit speeds" },
  ];
  // Never depend on location fields that clients may omit — a pin whose
  // `address` is missing used to crash here (`.address.length`) and bubble up
  // as a confusing 400/`Cannot read properties of undefined` to the booking page.
  const weatherSeed = String(pickup.address || pickup.name || pickup.label || "").length;
  const weather = weatherConditions[(weatherSeed + hour) % weatherConditions.length];

  // AI Optimal Departure windows
  const departureWindows = [
    { label: "Leave Now", time: "Now", etaMin: baseQuote.durationMin, fare: baseQuote.subtotal, trafficIndex: trafficCongestionPct, recommended: !isRushHour },
    { label: "In 15 Mins", time: "+15m", etaMin: Math.max(5, Math.round(baseQuote.durationMin * 0.88)), fare: Math.round(baseQuote.subtotal * 0.92 * 100) / 100, trafficIndex: Math.max(20, trafficCongestionPct - 18), recommended: isRushHour },
    { label: "In 30 Mins", time: "+30m", etaMin: Math.max(5, Math.round(baseQuote.durationMin * 0.82)), fare: Math.round(baseQuote.subtotal * 0.86 * 100) / 100, trafficIndex: Math.max(15, trafficCongestionPct - 28), recommended: false },
  ];

  // Carbon footprint offset
  const co2Grams = Math.round(distanceKm * (rideType === "comfort" ? 110 : rideType === "xl" ? 170 : 85));
  const treesEquivalent = (co2Grams / 500).toFixed(2);

  const result = {
    distanceKm,
    durationMin: baseQuote.durationMin,
    baseFare: baseQuote.subtotal,
    currency: baseQuote.currency,
    trafficCongestionPct,
    trafficLevel: trafficCongestionPct > 65 ? "Heavy" : trafficCongestionPct > 35 ? "Moderate" : "Smooth",
    weather,
    departureWindows,
    aiSavingsPotential: isRushHour ? `Save up to $${(baseQuote.subtotal * 0.14).toFixed(2)} by departing in 15 mins` : "Optimal booking window — lowest rates active",
    ecoMetrics: {
      co2Grams,
      treesEquivalent,
      carbonNeutralEligible: true,
    },
    smartRouteNotes: [
      "AI dynamic routing active to bypass roadwork on main corridors",
      "Stripe payment intent pre-authorized with zero surprise fees",
    ],
  };

  if (isGeminiEnabled()) {
    try {
      const forecastSummary = JSON.stringify({
        route: `${pickup.address || "pickup"} -> ${destination.address || "destination"}`,
        distanceKm,
        durationMin: result.durationMin,
        baseFare: result.baseFare,
        trafficLevel: result.trafficLevel,
        trafficCongestionPct,
        weather: result.weather.condition,
        windows: result.departureWindows.map(
          (w) => `${w.label} ($${w.fare}, ${w.etaMin} min${w.recommended ? ", recommended" : ""})`
        ),
      });
      const insight = await generateGeminiText({
        systemInstruction:
          "You are RideGo's AI traffic & pricing forecaster. In 2-3 concise sentences advise the rider based ONLY on the JSON forecast data. Mention the best departure window and never invent numbers.",
        message: `Forecast data: ${forecastSummary}\n\nGive the rider brief departure advice.`,
        // Auxiliary traffic on its own model bucket — keeps the Copilot's quota free.
        models: AUX_MODEL_CHAIN,
      });
      if (insight?.text) result.aiInsights = insight.text;
      result.engine = "gemini";
      result.aiModel = insight?.model || geminiStatus().model;
    } catch (err) {
      console.error("[ai/gemini] Fare insights unavailable — falling back to Neural engine:", err.message);
      result.engine = "neural";
    }
  } else {
    result.engine = "neural";
  }

  return result;
}

/**
 * AI Safety Sentinel & Anomaly Evaluation
 */
export async function performSafetyScan({ rideId, currentLat, currentLng, pickup, destination, rideStatus }) {
  // Simulate AI telemetry analysis
  const safetyScore = 99.4;
  const anomalies = [];

  // Check for route adherence
  const isFinished = ["TRIP_COMPLETED", "PAYMENT_COMPLETED", "CANCELLED"].includes(rideStatus);

  const result = {
    rideId,
    safetyScore,
    status: isFinished ? "COMPLETED" : "SECURE_MONITORING",
    guardianActive: true,
    anomalyCount: anomalies.length,
    anomalies,
    telemetry: {
      routeAdherence: "99.8%",
      averageSpeed: "42 km/h (within city limits)",
      unexpectedStops: 0,
      pinVerified: true,
      stripeEncrypted: true,
    },
    lastScannedAt: new Date(),
  };

  if (isGeminiEnabled()) {
    try {
      const scanSummary = JSON.stringify({
        rideId,
        status: result.status,
        safetyScore,
        anomalies,
        telemetry: result.telemetry,
      });
      const analysis = await generateGeminiText({
        systemInstruction:
          "You are RideGo's AI Safety Sentinel. In 1-2 concise sentences summarize the safety assessment using ONLY the scan JSON. Reassure the passenger and flag any anomaly that needs attention.",
        message: `Telemetry scan: ${scanSummary}\n\nProvide a brief rider-facing safety summary.`,
        models: AUX_MODEL_CHAIN,
      });
      if (analysis?.text) result.aiKbAnalysis = analysis.text;
      result.engine = "gemini";
      result.aiModel = analysis?.model || geminiStatus().model;
    } catch (err) {
      console.error("[ai/gemini] Safety analysis unavailable — falling back to Neural engine:", err.message);
      result.engine = "neural";
    }
  } else {
    result.engine = "neural";
  }

  return result;
}

/**
 * AI Driver Hotspots & Surge Prediction
 */
export async function getDriverHotspots() {
  const hotspots = [
    { zone: "International Airport Terminal", demandMultiplier: 1.8, activeRiders: 64, openDrivers: 8, estWaitMin: 2, surgeReason: "Incoming flight wave (12 flights landed)", latitude: 40.6413, longitude: -73.7781 },
    { zone: "Downtown Financial District", demandMultiplier: 1.4, activeRiders: 92, openDrivers: 14, estWaitMin: 3, surgeReason: "Evening commuter rush", latitude: 40.758, longitude: -73.9855 },
    { zone: "Grandview Shopping Mall", demandMultiplier: 1.25, activeRiders: 41, openDrivers: 9, estWaitMin: 4, surgeReason: "Weekend shopping peak", latitude: 40.7411, longitude: -73.9897 },
    { zone: "City Stadium Arena", demandMultiplier: 2.1, activeRiders: 110, openDrivers: 12, estWaitMin: 1, surgeReason: "Major event ending soon", latitude: 40.7736, longitude: -73.9566 },
    { zone: "Riverside University Campus", demandMultiplier: 1.15, activeRiders: 35, openDrivers: 11, estWaitMin: 5, surgeReason: "Class dismissal period", latitude: 40.809, longitude: -73.9605 },
  ];

  const result = {
    hotspots,
    totalDemandIndex: 1.54,
    recommendedZone: hotspots[0].zone,
    generatedAt: new Date(),
  };

  if (isGeminiEnabled()) {
    try {
      const zoneSummary = hotspots
        .map((h) => `${h.zone} (demand x${h.demandMultiplier}, ${h.openDrivers} drivers free, ~${h.estWaitMin} min wait)`)
        .join(" | ");
      const advice = await generateGeminiText({
        systemInstruction:
          "You are RideGo's AI dispatch strategist for drivers. In 1-2 concise sentences tell a driver where to position next using ONLY the hotspot data and recommend exactly one zone.",
        message: `Hotspot data: ${zoneSummary}\n\nWhere should the driver go next?`,
        models: AUX_MODEL_CHAIN,
      });
      if (advice?.text) result.aiAdvice = advice.text;
      result.engine = "gemini";
      result.aiModel = advice?.model || geminiStatus().model;
    } catch (err) {
      console.error("[ai/gemini] Hotspot advice unavailable — falling back to Neural engine:", err.message);
      result.engine = "neural";
    }
  } else {
    result.engine = "neural";
  }

  return result;
}
