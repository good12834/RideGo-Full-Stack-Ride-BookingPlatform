import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import RideCard from "../../components/RideCard";
import Spinner from "../../components/Spinner";
import api from "../../services/api";

export default function RideHistory() {
  const [rides, setRides] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get("/rides/history", { params: { page, limit: 10 } })
      .then(({ data }) => {
        setRides(data.rides);
        setPages(data.pages || 1);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-extrabold tracking-tight">My rides</h1>

      {loading ? (
        <Spinner />
      ) : rides.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-night-400">No rides yet.</p>
          <Link to="/passenger" className="btn-primary mt-4">
            Book your first ride
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-4">
            {rides.map((r) => (
              <RideCard key={r._id} ride={r} />
            ))}
          </div>
          {pages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button className="btn-ghost !p-2.5" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-semibold text-night-500">
                Page {page} of {pages}
              </span>
              <button className="btn-ghost !p-2.5" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
