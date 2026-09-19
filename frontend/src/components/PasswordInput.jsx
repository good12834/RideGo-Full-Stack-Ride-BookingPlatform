import { useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";

/**
 * Password field with a show/hide (eye) toggle.
 * Same styling as the other auth inputs: left Lock icon + `.input-base pl-11`.
 */
export default function PasswordInput({
  value,
  onChange,
  placeholder = "••••••••",
  className = "",
  id,
  ...rest
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-night-400" />
      <input
        {...rest}
        id={id}
        type={visible ? "text" : "password"}
        className={`input-base pl-11 pr-12 ${className}`}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        title={visible ? "Hide password" : "Show password"}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-night-400 transition hover:bg-night-100 hover:text-night-600 focus:outline-none focus:ring-4 focus:ring-primary-100"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
