import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, X } from "lucide-react";
import api from "../services/api";

const TAGS = ["Great driver", "Clean car", "Safe driving", "Fast route", "Friendly"];

export default function RatingModal({ ride, onClose, onRated }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [tags, setTags] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!ride) return null;

  async function submit() {
    if (!rating) {
      setError("Please choose a star rating");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await api.post(`/rides/${ride._id}/rate`, { rating, comment, tags });
      onRated?.();
      onClose();
    } catch (err) {
      setError(err.message || "Could not submit rating");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-night-950/50 p-4 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="w-full max-w-md rounded-2xl bg-white p-6 shadow-card"
          initial={{ scale: 0.94, y: 16 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0 }}
          transition={{ type: "spring", damping: 22, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h3 className="text-lg font-bold">How was your ride?</h3>
              <p className="text-sm text-night-500">
                Ride #{ride.rideNumber} — {ride.destination?.address}
              </p>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 text-night-400 hover:bg-night-100">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mb-4 flex justify-center gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(n)}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star
                  className={`h-9 w-9 transition ${
                    n <= (hover || rating)
                      ? "fill-amber-400 text-amber-400"
                      : "text-night-200"
                  }`}
                />
              </button>
            ))}
          </div>

          <div className="mb-4 flex flex-wrap justify-center gap-2">
            {TAGS.map((t) => (
              <button
                key={t}
                onClick={() =>
                  setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))
                }
                className={`badge border transition ${
                  tags.includes(t)
                    ? "border-primary-200 bg-primary-50 text-primary-600"
                    : "border-night-200 bg-white text-night-500"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <textarea
            className="input-base min-h-20 resize-none"
            placeholder="Add a comment (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />

          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

          <button className="btn-primary mt-4 w-full" onClick={submit} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit rating"}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
