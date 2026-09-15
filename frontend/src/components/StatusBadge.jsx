const RIDE_STYLES = {
  REQUESTED: "bg-amber-100 text-amber-700",
  SEARCHING_DRIVER: "bg-sky-100 text-sky-700 ridego-pulse",
  DRIVER_ASSIGNED: "bg-indigo-100 text-indigo-700",
  DRIVER_ARRIVING: "bg-indigo-100 text-indigo-700",
  DRIVER_ARRIVED: "bg-violet-100 text-violet-700",
  TRIP_STARTED: "bg-emerald-100 text-emerald-700",
  TRIP_COMPLETED: "bg-night-100 text-night-700",
  PAYMENT_COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-700",
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  SUSPENDED: "bg-red-100 text-red-700",
  REJECTED: "bg-red-100 text-red-700",
  PAID: "bg-emerald-100 text-emerald-700",
  OPEN: "bg-amber-100 text-amber-700",
  IN_REVIEW: "bg-sky-100 text-sky-700",
  RESOLVED: "bg-emerald-100 text-emerald-700",
};

export function formatStatus(s) {
  return String(s || "").replaceAll("_", " ");
}

export default function StatusBadge({ status, className = "" }) {
  const style = RIDE_STYLES[status] || "bg-night-100 text-night-600";
  return (
    <span className={`badge ${style} ${className}`}>
      {status === "SEARCHING_DRIVER" && (
        <span className="h-1.5 w-1.5 rounded-full bg-current ridego-pulse" />
      )}
      {formatStatus(status)}
    </span>
  );
}
