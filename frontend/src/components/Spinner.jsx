import { Loader2 } from "lucide-react";

export default function Spinner({ label = "Loading...", className = "" }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-12 ${className}`}>
      <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      <p className="text-sm text-night-500">{label}</p>
    </div>
  );
}
