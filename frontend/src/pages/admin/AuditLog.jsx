import { useEffect, useState } from "react";
import { ShieldCheck, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { formatDate } from "../../components/RideCard";
import Spinner from "../../components/Spinner";
import api from "../../services/api";

const ACTION_COLORS = {
  BLOCK_USER: "text-red-600 bg-red-50 border-red-200",
  UNBLOCK_USER: "text-emerald-600 bg-emerald-50 border-emerald-200",
  APPROVE_DRIVER: "text-emerald-600 bg-emerald-50 border-emerald-200",
  REJECT_DRIVER: "text-red-600 bg-red-50 border-red-200",
  SUSPEND_DRIVER: "text-red-600 bg-red-50 border-red-200",
  CANCEL_RIDE: "text-amber-600 bg-amber-50 border-amber-200",
  CREATE_PROMO: "text-primary-600 bg-primary-50 border-primary-200",
  UPDATE_PROMO: "text-sky-600 bg-sky-50 border-sky-200",
  DELETE_PROMO: "text-red-600 bg-red-50 border-red-200",
};

function actionClass(action) {
  return ACTION_COLORS[action] || "text-night-600 bg-night-50 border-night-200";
}

export default function AuditLog() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get("/admin/logs", { params: { page, limit: 25, action: action || undefined, search: search || undefined } })
      .then(({ data: d }) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [page, action, search]);

  if (!data && loading) return <Spinner />;

  const logs = data?.logs || [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Audit Log</h1>
        <p className="text-xs text-night-400">
          Every admin action (block, approve, suspend, promo changes, ride cancellations) is recorded here.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-night-300" />
          <input
            className="input-base !w-64 !py-2.5 pl-9"
            placeholder="Search action or target…"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
          />
        </div>
        <select
          className="input-base !w-56 !py-2.5"
          value={action}
          onChange={(e) => {
            setPage(1);
            setAction(e.target.value);
          }}
        >
          <option value="">All actions</option>
          {(data?.actionTypes || []).map((a) => (
            <option key={a} value={a}>
              {a.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-160 text-sm">
          <thead>
            <tr className="border-b border-night-100 text-left text-xs uppercase tracking-wide text-night-400">
              <th className="px-5 py-3.5">When</th>
              <th className="px-5 py-3.5">Admin</th>
              <th className="px-5 py-3.5">Action</th>
              <th className="px-5 py-3.5">Target</th>
              <th className="px-5 py-3.5">Details</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="py-10 text-center text-night-400">Loading…</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={5} className="py-10 text-center text-night-400">No audit entries found.</td></tr>
            ) : (
              logs.map((l) => (
                <tr key={l._id} className="border-b border-night-50 last:border-0 hover:bg-night-50/60">
                  <td className="px-5 py-3 text-xs text-night-500">{formatDate(l.createdAt)}</td>
                  <td className="px-5 py-3">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <ShieldCheck className="h-3.5 w-3.5 text-primary-500" />
                      {l.adminId?.name || "System"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`badge border text-[11px] font-bold ${actionClass(l.action)}`}>
                      {l.action.replaceAll("_", " ")}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-night-500">
                    {l.targetType || "—"}
                    {l.targetId ? <span className="ml-1 font-mono text-[10px] text-night-300">{String(l.targetId).slice(-6)}</span> : null}
                  </td>
                  <td className="max-w-64 px-5 py-3">
                    <p className="truncate text-xs text-night-500" title={l.meta ? JSON.stringify(l.meta) : ""}>
                      {l.meta && Object.keys(l.meta).length ? JSON.stringify(l.meta) : "—"}
                    </p>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data?.pages > 1 && (
        <div className="flex items-center justify-between">
          <button className="btn-ghost !py-2 text-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="h-4 w-4" /> Prev
          </button>
          <span className="text-xs text-night-400">
            Page {data.page} of {data.pages} • {data.total} entries
          </span>
          <button className="btn-ghost !py-2 text-sm" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
