import { useEffect, useState } from "react";
import { Search, Ban, ShieldCheck, Lock } from "lucide-react";
import Spinner from "../../components/Spinner";
import { formatDate } from "../../components/RideCard";
import { useToast } from "../../components/Toast";
import api from "../../services/api";

export default function Users() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/users", { params: { search, role, limit: 50 } });
      setUsers(data.users);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, role]);

  async function toggleBlock(u) {
    try {
      await api.put(`/admin/users/${u._id}/block`);
      toast.success(`${u.name} ${u.isBlocked ? "unblocked" : "blocked"}`);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">Users</h1>
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-night-400" />
            <input
              className="input-base !w-60 !py-2.5 pl-10"
              placeholder="Search name, email, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="input-base !w-36 !py-2.5" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">All roles</option>
            <option value="passenger">Passengers</option>
            <option value="driver">Drivers</option>
            <option value="admin">Admins</option>
          </select>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-160 text-sm">
          <thead>
            <tr className="border-b border-night-100 text-left text-xs uppercase tracking-wide text-night-400">
              <th className="px-5 py-3.5">User</th>
              <th className="px-5 py-3.5">Role</th>
              <th className="px-5 py-3.5">Phone</th>
              <th className="px-5 py-3.5">Joined</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-night-400">Loading...</td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-night-400">No users found.</td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u._id} className="border-b border-night-50 last:border-0 hover:bg-night-50/60">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-100 text-sm font-bold text-primary-600">
                        {u.name?.slice(0, 1)}
                      </span>
                      <div>
                        <p className="font-semibold">{u.name}</p>
                        <p className="text-xs text-night-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="capitalize">{u.role}</span>
                      {u.isProtected && (
                        <span className="badge bg-primary-100 text-primary-700" title="Protected role account — cannot be blocked or re-roled">
                          <Lock className="mr-1 h-3 w-3" /> Protected
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-night-500">{u.phone || "—"}</td>
                  <td className="px-5 py-3.5 text-night-500">{formatDate(u.createdAt)}</td>
                  <td className="px-5 py-3.5">
                    {u.isBlocked ? (
                      <span className="badge bg-red-100 text-red-700">Blocked</span>
                    ) : (
                      <span className="badge bg-emerald-100 text-emerald-700">Active</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {u.role !== "admin" && !u.isProtected && (
                      <button
                        onClick={() => toggleBlock(u)}
                        className={`btn-ghost !px-3 !py-1.5 text-xs ${u.isBlocked ? "!text-emerald-600" : "!text-red-500"}`}
                      >
                        {u.isBlocked ? <ShieldCheck className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                        {u.isBlocked ? "Unblock" : "Block"}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
