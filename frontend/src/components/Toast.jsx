import { createContext, useContext, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const push = useCallback((message, type = "success", duration = 4000) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const toast = {
    success: (m, d) => push(m, "success", d),
    error: (m, d) => push(m, "error", d),
    info: (m, d) => push(m, "info", d),
  };

  const icons = {
    success: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
    error: <AlertCircle className="h-5 w-5 text-red-500" />,
    info: <Info className="h-5 w-5 text-sky-500" />,
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40 }}
              className={`pointer-events-auto flex items-start gap-3 rounded-xl border p-4 shadow-card backdrop-blur ${
                t.type === "error"
                  ? "border-red-200 bg-red-50"
                  : t.type === "info"
                    ? "border-sky-200 bg-sky-50"
                    : "border-emerald-200 bg-emerald-50"
              }`}
            >
              {icons[t.type]}
              <p className="flex-1 text-sm font-medium text-night-800">{t.message}</p>
              <button
                onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
                className="text-night-400 hover:text-night-600"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
