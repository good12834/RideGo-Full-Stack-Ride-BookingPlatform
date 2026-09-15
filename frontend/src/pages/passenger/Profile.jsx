import { useState } from "react";
import { Wallet, Plus, User as UserIcon, Phone, Save, ShieldCheck, X, CreditCard, Lock, Sparkles } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";
import { formatMoney } from "../../components/RideCard";
import StripeCheckoutModal from "../../components/StripeCheckoutModal";
import api from "../../services/api";

const TOPUP_PRESETS = [25, 50, 100, 200];

export default function Profile() {
  const { user, refresh } = useAuth();
  const toast = useToast();

  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [saving, setSaving] = useState(false);
  const [topUp, setTopUp] = useState("50");
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [contacts, setContacts] = useState(user?.trustedContacts || []);

  async function save() {
    setSaving(true);
    try {
      await api.put("/auth/me", { name, phone });
      await refresh();
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  function handleStripeTopUp() {
    const amount = Number(topUp);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid amount (minimum $1.00)");
      return;
    }
    setShowStripeModal(true);
  }

  async function saveContacts(next) {
    setContacts(next);
    try {
      await api.put("/auth/me", { trustedContacts: next });
      await refresh();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight">Passenger Profile</h1>
        <span className="badge border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-bold">
          <Lock className="h-3 w-3" /> Stripe Verified
        </span>
      </div>

      {/* Wallet Card */}
      <div className="card overflow-hidden border-primary-200 bg-gradient-to-br from-white via-primary-50/20 to-amber-50/30 p-6 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-glow">
              <Wallet className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-night-500">RideGo Wallet Balance</p>
              <p className="text-3xl font-black text-night-950">{formatMoney(user?.walletBalance)}</p>
            </div>
          </div>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
            Instant 1-Click Trips
          </span>
        </div>

        {/* Quick Amount Buttons */}
        <div className="pt-2">
          <label className="block text-xs font-bold text-night-700 mb-2">Select Top-up Amount</label>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {TOPUP_PRESETS.map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setTopUp(String(amt))}
                className={`rounded-xl border py-2 text-xs font-bold transition ${
                  Number(topUp) === amt
                    ? "border-primary-500 bg-primary-500 text-white shadow-sm"
                    : "border-night-200 bg-white text-night-700 hover:border-night-300"
                }`}
              >
                +${amt}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-night-400">$</span>
              <input
                className="input-base pl-8 !py-2.5 text-sm font-bold"
                type="number"
                min="1"
                placeholder="Custom amount"
                value={topUp}
                onChange={(e) => setTopUp(e.target.value)}
              />
            </div>
            <button className="btn-primary !px-5 !py-2.5 text-xs font-extrabold" onClick={handleStripeTopUp}>
              <CreditCard className="h-4 w-4" /> Top up with Stripe
            </button>
          </div>
          <p className="mt-2 text-[11px] text-night-400 flex items-center gap-1">
            <Lock className="h-3 w-3 text-emerald-600" /> Protected by Stripe 256-bit AES encryption.
          </p>
        </div>
      </div>

      {/* Personal info */}
      <div className="card space-y-4 p-5">
        <p className="flex items-center gap-2 font-bold">
          <UserIcon className="h-4 w-4 text-primary-500" /> Personal info
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-night-700">Name</label>
            <input className="input-base" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-night-700">Phone</label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-night-400" />
              <input className="input-base pl-11" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-night-700">Email</label>
          <input className="input-base bg-night-50" value={user?.email || ""} disabled />
        </div>
        <button className="btn-primary" onClick={save} disabled={saving}>
          <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save changes"}
        </button>
      </div>

      {/* Trusted contacts */}
      <div className="card space-y-3 p-5">
        <p className="flex items-center gap-2 font-bold">
          <ShieldCheck className="h-4 w-4 text-primary-500" /> Trusted contacts (Auto-share live GPS trips)
        </p>
        {contacts.map((c, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              className="input-base flex-1 !py-2.5"
              placeholder="Name"
              value={c.name}
              onChange={(e) => {
                const next = [...contacts];
                next[i] = { ...next[i], name: e.target.value };
                setContacts(next);
              }}
            />
            <input
              className="input-base flex-1 !py-2.5"
              placeholder="Phone"
              value={c.phone}
              onChange={(e) => {
                const next = [...contacts];
                next[i] = { ...next[i], phone: e.target.value };
                setContacts(next);
              }}
            />
            <button
              className="rounded-lg p-2.5 text-red-500 hover:bg-red-50"
              onClick={() => saveContacts(contacts.filter((_, j) => j !== i))}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
        {contacts.length < 5 && (
          <button
            className="btn-ghost !py-2.5 text-sm font-semibold"
            onClick={() => saveContacts([...contacts, { name: "", phone: "" }])}
          >
            <Plus className="h-4 w-4" /> Add contact
          </button>
        )}
      </div>

      {/* Stripe Modal for Topup */}
      <StripeCheckoutModal
        isOpen={showStripeModal}
        onClose={() => setShowStripeModal(false)}
        topupAmount={Number(topUp)}
        title="Top Up RideGo Wallet via Stripe"
        onSuccess={() => {
          refresh?.();
        }}
      />
    </div>
  );
}
