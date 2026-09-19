// Protected role accounts
//
// RideGo ships with exactly ONE protected account for each role the platform
// operator provisions: **admin** and **driver**. Passengers are deliberately NOT
// seeded — every passenger creates their own account from /register, so there is
// no shared passenger login.
//
// Unlike the old "demo" logins these protected accounts are:
//   * configured through environment variables (never hard-coded in the UI),
//   * unique — each role gets its own password, and if a password is left blank
//     a cryptographically random one is generated per account,
//   * immutable — they can never be blocked, rejected or suspended from the
//     admin console and their role can never be reassigned
//     (see the `isProtected` flag on the User model).
//
// `ensureProtectedAccounts()` is idempotent. It runs automatically on every
// backend boot and is also used by the seeder, so both accounts always exist
// even on a brand-new (e.g. in-memory) database.
import crypto from "node:crypto";
import User from "../models/User.js";
import Driver from "../models/Driver.js";

function raw(key, fallback = "") {
  const value = process.env[key];
  return value === undefined || String(value).trim() === "" ? fallback : String(value).trim();
}

/** 24-char URL-safe password (~144 bits of entropy) used when no env value is set. */
export function generateProtectedPassword() {
  return crypto.randomBytes(18).toString("base64url");
}

// One definition per protected role. Emails/passwords come from backend/.env so
// each deployment gets its own unguessable credentials.
//
// Built lazily (not at module-evaluation time) because ES module imports are
// hoisted: the importer's `dotenv.config()` runs *after* this module is
// evaluated, so reading process.env at import time would see an empty env.
function buildProtectedAccounts() {
  return [
    {
      role: "admin",
      label: "Admin",
      name: raw("PROTECTED_ADMIN_NAME", "RideGo Administrator"),
      email: raw("PROTECTED_ADMIN_EMAIL", "admin@ridego.dev").toLowerCase(),
      phone: raw("PROTECTED_ADMIN_PHONE", "+1 555 0100"),
      password: raw("PROTECTED_ADMIN_PASSWORD"),
    },
    {
      role: "driver",
      label: "Driver",
      name: raw("PROTECTED_DRIVER_NAME", "RideGo Driver"),
      email: raw("PROTECTED_DRIVER_EMAIL", "driver@ridego.dev").toLowerCase(),
      phone: raw("PROTECTED_DRIVER_PHONE", "+1 555 0102"),
      licenseNumber: raw("PROTECTED_DRIVER_LICENSE", "DL-000001"),
      password: raw("PROTECTED_DRIVER_PASSWORD"),
    },
  ];
}

let cachedAccounts = null;

/** The protected account definitions, resolved once from the current environment. */
export function getProtectedAccounts() {
  if (!cachedAccounts) cachedAccounts = buildProtectedAccounts();
  return cachedAccounts;
}

/** Look up a definition by role ("admin" | "driver"). */
export function protectedAccountFor(role) {
  return getProtectedAccounts().find((account) => account.role === role) || null;
}

/** True when the given email belongs to one of the protected role accounts. */
export function isProtectedEmail(email = "") {
  const needle = String(email).toLowerCase().trim();
  return getProtectedAccounts().some((account) => account.email === needle);
}

// The protected driver must always be able to accept rides.
async function ensureDriverProfile(userId, def) {
  const driver = await Driver.findOne({ userId });
  if (!driver) {
    await Driver.create({
      userId,
      licenseNumber: def.licenseNumber || "DL-000001",
      status: "APPROVED",
      isApproved: true,
      isOnline: false,
      rating: 5,
      approvedAt: new Date(),
    });
    return;
  }

  let dirty = false;
  if (driver.status !== "APPROVED") {
    driver.status = "APPROVED";
    driver.rejectionReason = "";
    dirty = true;
  }
  if (!driver.isApproved) {
    driver.isApproved = true;
    dirty = true;
  }
  if (!driver.approvedAt) {
    driver.approvedAt = new Date();
    dirty = true;
  }
  if (dirty) await driver.save();
}

/**
 * Create (or heal) the three protected role accounts.
 *
 * Passwords configured in the environment are authoritative: if a stored hash no
 * longer matches the configured password it is reset, which doubles as the
 * supported way to rotate credentials.
 *
 * @returns {Promise<{accounts: Array, created: Array<{role:string,label:string,email:string,password:string}>}>}
 *          `created` only contains accounts inserted during this call — the only
 *          place a generated plaintext password is ever exposed.
 */
export async function ensureProtectedAccounts() {
  const created = [];

  for (const def of getProtectedAccounts()) {
    const generated = def.password ? "" : generateProtectedPassword();
    const password = def.password || generated;

    let user = await User.findOne({ email: def.email }).select("+password");

    if (!user) {
      user = await User.create({
        name: def.name,
        email: def.email,
        password,
        phone: def.phone,
        role: def.role,
        isProtected: true,
      });
      created.push({
        role: def.role,
        label: def.label,
        email: def.email,
        password,
        generated: Boolean(generated),
      });
    } else {
      // Heal anything an operator may have tampered with.
      let dirty = false;
      if (user.role !== def.role) {
        user.role = def.role;
        dirty = true;
      }
      if (!user.isProtected) {
        user.isProtected = true;
        dirty = true;
      }
      if (user.isBlocked) {
        user.isBlocked = false;
        dirty = true;
      }
      if (def.password && !(await user.comparePassword(def.password))) {
        user.password = def.password;
        dirty = true;
      }
      if (dirty) await user.save();
    }

    if (def.role === "driver") await ensureDriverProfile(user._id, def);
  }

  return { accounts: getProtectedAccounts(), created };
}

/**
 * Human-readable credential block for accounts whose password was auto-generated
 * because PROTECTED_<ROLE>_PASSWORD was blank. Returns an empty string when every
 * created account used an environment password, so logs never echo credentials
 * that already live in the environment file.
 */
export function formatProtectedAccountReport(created = []) {
  const generated = created.filter((c) => c.generated);
  if (!generated.length) return "";
  const width = Math.max(...generated.map((c) => c.email.length));
  const lines = generated.map((c) => `  ${c.label.padEnd(9)} ${c.email.padEnd(width)}  ${c.password}`);
  return [
    "[protected-accounts] Generated credentials for these protected role accounts",
    "(set PROTECTED_<ROLE>_PASSWORD in backend/.env to control them yourself):",
    ...lines,
  ].join("\n");
}