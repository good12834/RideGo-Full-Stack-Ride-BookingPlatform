import { useEffect, useState } from "react";
import Spinner from "../../components/Spinner";
import StatusBadge from "../../components/StatusBadge";
import { formatMoney, formatDate } from "../../components/RideCard";
import { useToast } from "../../components/Toast";
import api from "../../services/api";

export default function Payments() {
  const toast = useToast();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/admin/payments")
      .then(({ data }) => setPayments(data.payments))
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold tracking-tight">Payments</h1>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-180 text-sm">
          <thead>
            <tr className="border-b border-night-100 text-left text-xs uppercase tracking-wide text-night-400">
              <th className="px-5 py-3.5">Reference</th>
              <th className="px-5 py-3.5">Passenger</th>
              <th className="px-5 py-3.5">Ride</th>
              <th className="px-5 py-3.5">Method</th>
              <th className="px-5 py-3.5">Amount</th>
              <th className="px-5 py-3.5">Commission</th>
              <th className="px-5 py-3.5">Date</th>
              <th className="px-5 py-3.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr><td colSpan={8} className="py-10 text-center text-night-400">No payments yet.</td></tr>
            ) : (
              payments.map((p) => (
                <tr key={p._id} className="border-b border-night-50 last:border-0 hover:bg-night-50/60">
                  <td className="px-5 py-3.5 font-mono text-xs text-night-500">{p.transactionRef || "—"}</td>
                  <td className="px-5 py-3.5">{p.passengerId?.name || "—"}</td>
                  <td className="px-5 py-3.5 font-mono text-xs">#{p.rideId?.rideNumber || "—"}</td>
                  <td className="px-5 py-3.5">
                    <span className="capitalize">{p.method}</span>
                    {p.cardLast4 && <span className="text-night-400"> •••• {p.cardLast4}</span>}
                  </td>
                  <td className="px-5 py-3.5 font-bold">{formatMoney(p.amount)}</td>
                  <td className="px-5 py-3.5 text-night-500">{formatMoney(p.commission)}</td>
                  <td className="px-5 py-3.5 text-night-500">{formatDate(p.paidAt || p.createdAt)}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={p.status} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
