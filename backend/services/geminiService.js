import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

// ============================================================================
// RideGo AI Intelligence & Neural Engine — Google Gemini API connector
// ----------------------------------------------------------------------------
// Reads GEMINI_API_KEY from environment. When the key is present and valid the
// platform upgrades from the built-in deterministic Neural NLP engine to the
// Gemini foundation model. Every call is wrapped with a timeout + retry and the
// callers in aiService.js ALWAYS fall back to the local engine on failure so
// the API never breaks when Gemini is unavailable.
// ============================================================================

const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || "").trim();
const GEMINI_MODEL = (process.env.GEMINI_MODEL || "gemini-2.5-flash").trim();
const REQUEST_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS || 30000);
const CACHE_TTL_MS = Number(process.env.GEMINI_CACHE_TTL_MS || 5 * 60 * 1000);
const MAX_CACHE_ENTRIES = 200;

// Free-tier Gemini quota is metered PER MODEL. When the primary model answers
// 429 we fail over to the next model in the chain (fresh quota bucket) instead
// of dropping the user back to the built-in Neural engine's canned text.
const GEMINI_FALLBACK_MODELS = (process.env.GEMINI_FALLBACK_MODELS || "gemini-flash-latest,gemini-3.5-flash-lite").split(",");
// Auxiliary features (fare forecast, safety KB, hotspot advice) get their own
// model so their chatty traffic never drains the Copilot's quota.
const GEMINI_AUX_MODEL = (process.env.GEMINI_AUX_MODEL || "gemini-3.5-flash-lite").trim();
const ATTEMPTS_PER_MODEL = Math.max(1, Number(process.env.GEMINI_ATTEMPTS_PER_MODEL || 2));
// Never block an HTTP response for the full server-reported retryDelay (often
// 50s+): pause briefly, then let a different model answer immediately instead.
const MAX_BACKOFF_MS = Math.max(0, Number(process.env.GEMINI_BACKOFF_MS || 1200));

function uniqueModels(list) {
  return list
    .map((m) => String(m || "").trim())
    .filter(Boolean)
    .filter((m, i, arr) => arr.indexOf(m) === i);
}

/** Copilot chain: primary model first, then quota-friendly fallbacks. */
export const MODEL_CHAIN = uniqueModels([GEMINI_MODEL, ...GEMINI_FALLBACK_MODELS]);
/** Auxiliary/background features: separate bucket first, copilot chain as backup. */
export const AUX_MODEL_CHAIN = uniqueModels([GEMINI_AUX_MODEL, ...MODEL_CHAIN]);

// Identical prompts (same question, same route forecast) reuse the real Gemini
// answer for a few minutes instead of burning free-tier quota and dropping back
// to the built-in Neural engine on a 429.
const responseCache = new Map();

function readCache(key) {
  const hit = responseCache.get(key);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    responseCache.delete(key);
    return null;
  }
  return { text: hit.text, model: hit.model, cached: true };
}

function writeCache(key, text, model) {
  if (responseCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = responseCache.keys().next().value;
    responseCache.delete(oldestKey);
  }
  responseCache.set(key, { text, model, expiresAt: Date.now() + CACHE_TTL_MS });
}

/** Pulls the HTTP status code out of the JSON error body Gemini returns. */
function errorCode(err) {
  const match = String(err?.message || "").match(/"code"\s*:\s*(\d{3})/);
  return match ? Number(match[1]) : null;
}

const RETRYABLE_CODES = new Set([429, 500, 502, 503, 504]);

function isRetryable(err) {
  const code = errorCode(err);
  if (code !== null) return RETRYABLE_CODES.has(code);
  // Network hiccups / timeouts are worth another shot (possibly on another model).
  return true;
}

function backoffMs(err) {
  const match = String(err?.message || "").match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/);
  if (match) return Math.min(Number(match[1]) * 1000, MAX_BACKOFF_MS);
  return Math.min(600, MAX_BACKOFF_MS);
}

function sleep(ms) {
  return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
}

/** True when a real Gemini API key is configured (supports AIza... & AQ... formats). */
export function isGeminiEnabled() {
  return Boolean(
    GEMINI_API_KEY &&
      GEMINI_API_KEY.length > 12 &&
      !/your[_-]?(gemini|api)[_-]?key/i.test(GEMINI_API_KEY) &&
      !/^xxx/i.test(GEMINI_API_KEY)
  );
}

/** Current engine status — handy for UI badges & /api/ai/status. */
export function geminiStatus() {
  return {
    engine: isGeminiEnabled() && geminiClient ? "gemini" : "neural",
    enabled: Boolean(geminiClient),
    model: geminiClient ? GEMINI_MODEL : null,
    models: geminiClient ? MODEL_CHAIN : [],
    auxModel: geminiClient ? AUX_MODEL_CHAIN[0] : null,
  };
}

let geminiClient = null;
if (isGeminiEnabled()) {
  try {
    geminiClient = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    console.log(`[gemini] AI Intelligence & Neural Engine connected -> ${MODEL_CHAIN.join(" | ")}`);
  } catch (err) {
    console.error("[gemini] Failed to initialize Gemini client:", err.message);
    geminiClient = null;
  }
} else {
  console.log("[gemini] No GEMINI_API_KEY set — using built-in Neural NLP engine");
}

function buildPrompt({ message, history = [], context = {} }) {
  const lines = [];
  if (history && history.length) {
    const recent = history.slice(-8);
    for (const turn of recent) {
      const role = turn.role === "user" ? "User" : "Assistant";
      lines.push(`${role}: ${turn.content}`);
    }
  }
  if (context && typeof context === "object") {
    const keys = Object.keys(context);
    if (keys.length) {
      lines.push("Context:");
      for (const key of keys) {
        lines.push(`- ${key}: ${JSON.stringify(context[key])}`);
      }
    }
  }
  lines.push(`User: ${message}`);
  return lines.join("\n");
}

async function generateWithTimeout(payload) {
  if (!geminiClient) throw new Error("Gemini client not initialized");
  const call = geminiClient.models.generateContent(payload);
  let timer = null;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("Gemini request timed out")), REQUEST_TIMEOUT_MS);
  });
  try {
    const response = await Promise.race([call, timeout]);
    return (response && response.text ? response.text : "").trim();
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Generates a text reply from Gemini with automatic model failover.
 *
 * Walks the given model chain (or the Copilot chain by default). Each model gets
 * ATTEMPTS_PER_MODEL tries with a short backoff, then the next model is used —
 * because free-tier quota is metered per model, a 429 on one model is instantly
 * answered by the next one. Identical prompts are served from a short-lived
 * cache, so repeated questions never consume quota.
 *
 * @returns {Promise<{text: string, model: string, cached: boolean}>}
 * @throws when every model in the chain fails; callers must have a local fallback.
 */
export async function generateGeminiText({ systemInstruction, message, history = [], context = {}, temperature, models }) {
  if (!geminiClient) throw new Error("Gemini engine not available");

  const prompt = buildPrompt({ message, history, context });
  const chain = uniqueModels(models?.length ? models : MODEL_CHAIN);
  // Model-agnostic key: whichever model produced the answer can serve it again.
  const cacheKey = `${JSON.stringify({ systemInstruction: systemInstruction || "", temperature: temperature ?? null })}::${prompt}`;

  const cached = readCache(cacheKey);
  if (cached) return cached;

  let lastError = null;
  for (const model of chain) {
    for (let attempt = 0; attempt < ATTEMPTS_PER_MODEL; attempt++) {
      try {
        const payload = { model, contents: prompt };
        const config = {};
        if (systemInstruction) config.systemInstruction = systemInstruction;
        if (Number.isFinite(temperature)) config.temperature = temperature;
        if (Object.keys(config).length) payload.config = config;

        const text = await generateWithTimeout(payload);
        if (!text) throw new Error("Gemini returned an empty response");

        writeCache(cacheKey, text, model);
        return { text, model, cached: false };
      } catch (err) {
        lastError = err;
        console.warn(`[gemini] ${model} attempt ${attempt + 1}/${ATTEMPTS_PER_MODEL} failed: ${err.message}`);
        if (!isRetryable(err)) break; // e.g. 404 model retired — jump to the next model
        if (attempt < ATTEMPTS_PER_MODEL - 1) await sleep(backoffMs(err));
      }
    }
  }

  throw lastError || new Error("Gemini request failed");
}