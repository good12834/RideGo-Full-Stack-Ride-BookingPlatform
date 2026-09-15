import { useEffect, useState } from "react";
import { CircleDollarSign, Car, TrendingUp, Percent } from "lucide-react";
import { formatMoney } from "../../components/RideCard";
import Spinner from "../../components/Spinner";
import api from "../../services/api";

function Bars({ data }) {
  const max = Math.max(...data.map((d) => d.amount), 1);
  return (
    <div className="flex h-48 items-end gap-2">
      {data.map((d) => (
        <div key={d.date} className="flex flex-1 flex-col items-center gap-1.5">
          <span className="text-[10px] font-bold text-night-500">
            {d.amount > 0 ? `$${d.amount.toFixed(0)}` : ""}
          </span>
          <div
            className="w-full max-w-10 rounded-t-lg bg-gradient-to-t from-primary-400 to-primary-500 transition-all"
            style={{ height: `${Math.max(4, (d.amount / max) * 100)}%` }}
          />
          <span className="text-[10px] font-semibold text-night-400">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function Earnings() {
  const [range, setRange] = useState("week");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get("/driver/earnings", { params: { range } })
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [range]);

  if (loading && !data) return <Spinner />;
  if (!data) return <div className="card p-10 text-center text-night-400">Could not load earnings.</div>;

  const commission = Math.max(0, data.gross - data.net);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight">Earnings</h1>
        <div className="flex rounded-xl bg-night-100 p-1">
          {["week", "month"].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-lg px-4 py-1.5 text-sm font-bold capitalize transition ${
                range === r ? "bg-white text-primary-600 shadow-sm" : "text-night-500"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { icon: CircleDollarSign, label: `Net ${range}`, value: formatMoney(data.net), accent: "bg-emerald-100 text-emerald-600" },
          { icon: Car, label: "Trips", value: data.trips, accent: "bg-sky-100 text-sky-600" },
          { icon: TrendingUp, label: "Lifetime", value: formatMoney(data.lifetime?.totalEarnings), accent: "bg-primary-100 text-primary-600" },
          { icon: Percent, label: "Commission", value: formatMoney(commission), accent: "bg-amber-100 text-amber-600" },
        ].map((s) => (
          <div key={s.label} className="card p-5">
            <span className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${s.accent}`}>
              <s.icon className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
            </span>
            <p className="text-xl font-extrabold">{s.value}</p>
            <p className="text-xs capitalize text-night-400">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold">Net earnings by day</h2>
          <span className="text-sm font-bold text-primary-600">{formatMoney(data.net)}</span>
        </div>
        <Bars data={data.byDay} />
      </div>

      <div className="card space-y-3 p-6 text-sm">
        <div className="flex justify-between">
          <span className="text-night-500">Gross fares</span>
          <span className="font-bold">{formatMoney(data.gross)}</span>
        </div>
        <div className="flex justify-between text-red-500">
          <span>Platform commission (10%)</span>
          <span className="font-bold">-{formatMoney(commission)}</span>
        </div>
        <div className="flex justify-between border-t border-night-100 pt-3 text-base font-extrabold">
          <span>Net earnings</span>
          <span>{formatMoney(data.net)}</span>
        </div>
        <p className="pt-1 text-xs text-night-400">
          Lifetime: {data.lifetime?.totalTrips || 0} trips • {formatMoney(data.lifetime?.totalEarnings)} earned •{" "}
          {Number(data.lifetime?.rating || 5).toFixed(1)} rating
        </p>
      </div>
    </div>
  );
}
