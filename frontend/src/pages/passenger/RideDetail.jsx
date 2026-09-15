import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Star, MapPin, Navigation } from "lucide-react";
import StatusBadge from "../../components/StatusBadge";
import RideMap from "../../components/RideMap";
import Spinner from "../../components/Spinner";
import api from "../../services/api";

export default function RideDetail() {
  const { id } = useParams();
  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/rides/${id}`)
      .then(({ data }) => setRide(data.ride))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Spinner />;
  if (!ride) return <div className="card mx-auto max-w-md p-10 text-center text-night-400">Ride not found.</div>;

  const driverUser = ride.driverId?.userId;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link to="/passenger/rides" className="flex items-center gap-1.5 text-sm font-semibold text-night-500 hover:text-night-800">
        <ArrowLeft className="h-4 w-4" /> All rides
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold">Ride #{ride.rideNumber}</h1>
        <StatusBadge status={ride.status} />
      </div>

      <RideMap pickup={ride.pickup} destination={ride.destination} className="h-64" interactive={false} />

      <div className="card space-y-3 p-5">
        <div className="flex items-start gap-2.5 text-sm">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
          <span>{ride.pickup.address}</span>
        </div>
        <div className="flex items-start gap-2.5 text-sm">
          <Navigation className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <span>{ride.destination.address}</span>
        </div>
        <div className="grid grid-cols-3 gap-3 border-t border-night-100 pt-3 text-center text-sm">
          <div>
            <p className="font-extrabold">{Number(ride.distance).toFixed(1)} km</p>
            <p className="text-xs text-night-400">distance</p>
          </div>
          <div>
            <p className="font-extrabold">{ride.duration} min</p>
            <p className="text-xs text-night-400">duration</p>
          </div>
          <div>
            <p className="font-extrabold">${Number(ride.fare).toFixed(2)}</p>
            <p className="text-xs text-night-400">fare</p>
          </div>
        </div>
      </div>

      {driverUser && (
        <div className="card flex items-center gap-4 p-5">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-100 text-primary-600">
            {driverUser.name?.slice(0, 1)}
          </span>
          <div className="flex-1">
            <p className="font-bold">{driverUser.name}</p>
            <p className="text-sm text-night-500 capitalize">
              {ride.rideType} • {ride.vehicleId ? `${ride.vehicleId.color} ${ride.vehicleId.make} ${ride.vehicleId.model}` : ""}
            </p>
          </div>
          {ride.vehicleId && (
            <span className="rounded-xl bg-night-100 px-3 py-1.5 font-mono text-sm font-bold">
              {ride.vehicleId.plateNumber}
            </span>
          )}
        </div>
      )}

      {ride.paymentMethod && (
        <div className="card flex items-center justify-between p-5 text-sm">
          <span className="text-night-500">
            Paid via <span className="font-semibold capitalize text-night-800">{ride.paymentMethod}</span>
          </span>
          <StatusBadge status={ride.paymentStatus} />
        </div>
      )}
    </div>
  );
}
