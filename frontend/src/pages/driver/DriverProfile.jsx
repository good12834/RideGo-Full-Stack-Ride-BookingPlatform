import { useEffect, useState } from "react";
import {
  CarFront,
  Plus,
  Trash2,
  IdCard,
  BadgeCheck,
  Star,
  ShieldQuestion,
  Upload,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";
import { formatMoney } from "../../components/RideCard";
import api from "../../services/api";

export default function DriverProfile() {
  const { driver, refresh } = useAuth();
  const toast = useToast();

  const [vehicles, setVehicles] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [license, setLicense] = useState(driver?.licenseNumber || "");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    make: "",
    model: "",
    year: "",
    color: "",
    plateNumber: "",
    vehicleType: "economy",
    image: null,
  });
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const [p, r] = await Promise.all([api.get("/driver/profile"), api.get("/driver/ratings")]);
      setVehicles(p.data.vehicles || []);
      setRatings(r.data.ratings || []);
      setLicense(p.data.driver.licenseNumber || "");
    } catch (err) {
      toast.error(err.message);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveLicense() {
    try {
      await api.put("/driver/profile", { licenseNumber: license });
      await refresh?.();
      toast.success("License updated");
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function addVehicle(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v !== null && v !== "") fd.append(k, v);
      });
      await api.post("/driver/vehicles", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Vehicle added");
      setShowForm(false);
      setForm({ make: "", model: "", year: "", color: "", plateNumber: "", vehicleType: "economy", image: null });
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeVehicle(id) {
    if (!window.confirm("Remove this vehicle?")) return;
    try {
      await api.delete(`/driver/vehicles/${id}`);
      toast.success("Vehicle removed");
      await load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  const statusBadge = {
    APPROVED: { icon: BadgeCheck, cls: "bg-emerald-100 text-emerald-700", label: "Approved" },
    PENDING: { icon: ShieldQuestion, cls: "bg-amber-100 text-amber-700", label: "Pending review" },
    SUSPENDED: { icon: ShieldQuestion, cls: "bg-red-100 text-red-700", label: "Suspended" },
    REJECTED: { icon: ShieldQuestion, cls: "bg-red-100 text-red-700", label: "Rejected" },
  }[driver?.status] || { icon: ShieldQuestion, cls: "bg-night-100 text-night-600", label: driver?.status };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Driver profile</h1>

      {/* Status */}
      <div className="card flex flex-wrap items-center gap-4 p-5">
        <span className={`badge ${statusBadge.cls} !px-3 !py-1.5`}>
          <statusBadge.icon className="h-4 w-4" /> {statusBadge.label}
        </span>
        <div className="flex items-center gap-1">
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          <span className="font-bold">{Number(driver?.rating || 5).toFixed(1)}</span>
          <span className="text-sm text-night-400">({driver?.ratingCount || 0} ratings)</span>
        </div>
        <div className="ml-auto text-sm text-night-500">
          <b className="text-night-800">{driver?.totalTrips || 0}</b> trips •{" "}
          <b className="text-night-800">{formatMoney(driver?.totalEarnings)}</b> lifetime
        </div>
      </div>

      {/* License */}
      <div className="card space-y-3 p-5">
        <p className="flex items-center gap-2 font-bold">
          <IdCard className="h-4 w-4 text-primary-500" /> License
        </p>
        <div className="flex gap-2">
          <input className="input-base" value={license} onChange={(e) => setLicense(e.target.value)} />
          <button className="btn-ghost" onClick={saveLicense}>
            Save
          </button>
        </div>
      </div>

      {/* Vehicles */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">My vehicles</h2>
          <button className="btn-primary !py-2 text-sm" onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-4 w-4" /> Add vehicle
          </button>
        </div>

        {showForm && (
          <form onSubmit={addVehicle} className="card space-y-3 p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <input required className="input-base" placeholder="Make (Toyota)" value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} />
              <input required className="input-base" placeholder="Model (Camry)" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
              <input required className="input-base" type="number" placeholder="Year (2023)" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
              <input required className="input-base" placeholder="Color (White)" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
              <input required className="input-base" placeholder="Plate number" value={form.plateNumber} onChange={(e) => setForm({ ...form, plateNumber: e.target.value.toUpperCase() })} />
              <select className="input-base" value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}>
                <option value="economy">Economy</option>
                <option value="comfort">Comfort</option>
                <option value="xl">XL</option>
              </select>
            </div>
            <label className="btn-ghost w-full cursor-pointer text-sm">
              <Upload className="h-4 w-4" />
              {form.image ? form.image.name : "Upload vehicle photo (optional)"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setForm({ ...form, image: e.target.files?.[0] || null })}
              />
            </label>
            <button className="btn-primary w-full" disabled={busy}>
              {busy ? "Saving..." : "Save vehicle"}
            </button>
          </form>
        )}

        {vehicles.length === 0 && !showForm && (
          <div className="card p-8 text-center text-night-400">
            <CarFront className="mx-auto mb-2 h-8 w-8" />
            <p>Add your first vehicle to receive economy, comfort or XL requests.</p>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {vehicles.map((v) => (
            <div key={v._id} className="card flex items-center gap-4 p-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-100 text-primary-600">
                <CarFront className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">
                  {v.make} {v.model}
                </p>
                <p className="text-sm text-night-400">
                  {v.color} • {v.year} • {v.vehicleType}
                </p>
                <p className="font-mono text-sm font-bold">{v.plateNumber}</p>
              </div>
              <button className="rounded-lg p-2 text-red-500 hover:bg-red-50" onClick={() => removeVehicle(v._id)}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Ratings */}
      <div className="space-y-3">
        <h2 className="font-bold">Recent ratings</h2>
        {ratings.length === 0 ? (
          <div className="card p-6 text-center text-night-400">No ratings yet.</div>
        ) : (
          <div className="space-y-2">
            {ratings.slice(0, 8).map((r) => (
              <div key={r._id} className="card flex items-start gap-3 p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-night-100 text-sm font-bold text-night-600">
                  {r.passengerId?.name?.slice(0, 1) || "?"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold">{r.passengerId?.name || "Passenger"}</p>
                    <span className="flex items-center gap-0.5">
                      {[...Array(r.rating)].map((_, i) => (
                        <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                      ))}
                    </span>
                  </div>
                  {r.comment && <p className="mt-0.5 text-sm text-night-500">"{r.comment}"</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
