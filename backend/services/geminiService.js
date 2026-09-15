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
const GEMINI_MODEL = (process.env.GEMINI_MODEL || "gemini-3.6-flash").trim();
const REQUEST_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS || 30000);
const MAX_RETRIES = 1;

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
  };
}

let geminiClient = null;
if (isGeminiEnabled()) {
  try {
    geminiClient = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    console.log(`[gemini] AI Intelligence & Neural Engine connected -> ${GEMINI_MODEL}`);
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
 * Generates a text reply from Gemini.
 * Returns the reply text or throws; callers must provide a local fallback.
 */
export async function generateGeminiText({ systemInstruction, message, history = [], context = {} }) {
  if (!geminiClient) throw new Error("Gemini engine not available");

  let lastError = null;
  const prompt = buildPrompt({ message, history, context });

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const payload = {
        model: GEMINI_MODEL,
        contents: prompt,
      };
      if (systemInstruction) {
        payload.config = { systemInstruction };
      }
      return await generateWithTimeout(payload);
    } catch (err) {
      lastError = err;
      console.warn(`[gemini] Attempt ${attempt + 1}/${MAX_RETRIES + 1} failed: ${err.message}`);
    }
  }
  throw lastError;
}