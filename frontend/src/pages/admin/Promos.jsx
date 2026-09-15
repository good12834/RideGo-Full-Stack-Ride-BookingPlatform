import { useEffect, useState } from "react";
import { Plus, Trash2, TicketPercent, Power } from "lucide-react";
import { formatDate } from "../../components/RideCard";
import { useToast } from "../../components/Toast";
import api from "../../services/api";

export default function Promos() {
  const toast = useToast();
  const [promos, setPromos] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    code: "",
    discountType: "percentage",
    discountValue: "",
    maxUses: 1000,
    expiresAt: "",
  });

  async function load() {
    try {
      const { data } = await api.get("/admin/promos");
      setPromos(data.promos);
    } catch (err) {
      toast.error(err.message);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function create(e) {
    e.preventDefault();
    try {
      await api.post("/admin/promos", {
        ...form,
        discountValue: Number(form.discountValue),
        maxUses: Number(form.maxUses) || 1000,
        expiresAt: form.expiresAt || undefined,
      });
      toast.success("Promo created");
      setShowForm(false);
      setForm({ code: "", discountType: "percentage", discountValue: "", maxUses: 1000, expiresAt: "" });
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function toggle(promo) {
    try {
      await api.put(`/admin/promos/${promo._id}`, { active: !promo.active });
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function remove(promo) {
    if (!window.confirm(`Delete promo ${promo.code}?`)) return;
    try {
      await api.delete(`/admin/promos/${promo._id}`);
      toast.success("Promo deleted");
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight">Promo codes</h1>
        <button className="btn-primary !py-2 text-sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" /> New promo
        </button>
      </div>

      {showForm && (
        <form onSubmit={create} className="card grid gap-3 p-5 sm:grid-cols-3 lg:grid-cols-6">
          <input required className="input-base uppercase" placeholder="CODE" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
          <select className="input-base" value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value })}>
            <option value="percentage">Percentage %</option>
            <option value="fixed">Fixed $</option>
          </select>
          <input required type="number" min="1" className="input-base" placeholder="Value" value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: e.target.value })} />
          <input type="number" min="1" className="input-base" placeholder="Max uses" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} />
          <input type="date" className="input-base" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
          <button className="btn-primary">Create</button>
        </form>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {promos.length === 0 && (
          <div className="card p-10 text-center text-night-400 sm:col-span-2 lg:col-span-3">
            <TicketPercent className="mx-auto mb-2 h-8 w-8" />
            No promo codes yet. Create your first one.
          </div>
        )}
        {promos.map((p) => (
          <div key={p._id} className={`card p-5 ${!p.active ? "opacity-60" : ""}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-lg font-extrabold tracking-wider text-primary-600">{p.code}</p>
                <p className="text-sm text-night-500">
                  {p.discountType === "percentage" ? `${p.discountValue}% off` : `$${p.discountValue} off`}
                </p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => toggle(p)}
                  className={`rounded-lg p-2 ${p.active ? "text-emerald-600 hover:bg-emerald-50" : "text-night-300 hover:bg-night-50"}`}
                  title={p.active ? "Deactivate" : "Activate"}
                >
                  <Power className="h-4 w-4" />
                </button>
                <button onClick={() => remove(p)} className="rounded-lg p-2 text-red-500 hover:bg-red-50">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="mt-3 space-y-0.5 text-xs text-night-400">
              <p>Used {p.usedCount} / {p.maxUses} times</p>
              <p>{p.expiresAt ? `Expires ${formatDate(p.expiresAt)}` : "No expiry"}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
