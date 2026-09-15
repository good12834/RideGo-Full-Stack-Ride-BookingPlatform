import { useEffect, useState } from "react";
import { LifeBuoy } from "lucide-react";
import Spinner from "../../components/Spinner";
import StatusBadge from "../../components/StatusBadge";
import { formatDate } from "../../components/RideCard";
import { useToast } from "../../components/Toast";
import api from "../../services/api";

export default function Complaints() {
  const toast = useToast();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState({});

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/tickets");
      setTickets(data.tickets);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function update(ticket, patch) {
    try {
      await api.put(`/admin/tickets/${ticket._id}`, patch);
      toast.success("Ticket updated");
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold tracking-tight">Complaints & tickets</h1>

      {tickets.length === 0 ? (
        <div className="card p-10 text-center text-night-400">
          <LifeBuoy className="mx-auto mb-2 h-8 w-8" />
          No support tickets. All clear!
        </div>
      ) : (
        <div className="space-y-4">
          {tickets.map((t) => (
            <div key={t._id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold">{t.subject}</p>
                  <p className="text-xs text-night-400">
                    {t.userId?.name} • {formatDate(t.createdAt)}
                    {t.rideId ? ` • Ride #${t.rideId.rideNumber}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge bg-night-100 text-night-500">{t.category.replaceAll("_", " ")}</span>
                  <StatusBadge status={t.status} />
                </div>
              </div>

              <p className="mt-3 rounded-xl bg-night-50 p-4 text-sm text-night-600">{t.message}</p>

              {t.response && (
                <p className="mt-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">
                  <b>Response:</b> {t.response}
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  className="input-base !w-64 !py-2.5 text-sm"
                  placeholder="Write a response..."
                  value={reply[t._id] || ""}
                  onChange={(e) => setReply({ ...reply, [t._id]: e.target.value })}
                />
                <button
                  className="btn-primary !py-2.5 text-xs"
                  onClick={() => update(t, { response: reply[t._id] || "We're looking into it.", status: "RESOLVED" })}
                >
                  Respond & resolve
                </button>
                <button className="btn-ghost !py-2.5 text-xs" onClick={() => update(t, { status: "IN_REVIEW" })}>
                  Mark in review
                </button>
                <button className="btn-ghost !py-2.5 text-xs !text-red-500" onClick={() => update(t, { status: "REJECTED" })}>
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
