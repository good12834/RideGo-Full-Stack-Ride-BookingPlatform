import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import api from "../services/api";
import { useSocket } from "../hooks/useSocket";

const RideContext = createContext(null);

export function RideProvider({ children }) {
  const { socket, connected } = useSocket();
  const [activeRide, setActiveRide] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef(null);
  const user = JSON.parse(localStorage.getItem("ridego_user") || "null");

  const refreshActive = useCallback(async () => {
    if (!localStorage.getItem("ridego_token")) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get("/rides/active");
      setActiveRide(data.ride);
    } catch {
      setActiveRide(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshActive();
  }, [refreshActive]);

  // Poll as a fallback when socket is down
  useEffect(() => {
    if (connected) return;
    pollRef.current = setInterval(refreshActive, 5000);
    return () => clearInterval(pollRef.current);
  }, [connected, refreshActive]);

  // Socket events for passengers
  useEffect(() => {
    if (!socket || !user || user.role !== "passenger") return undefined;

    const handlers = {
      "ride:accepted": (payload) => {
        setActiveRide((prev) =>
          prev && String(prev._id) === String(payload.rideId)
            ? { ...prev, status: "DRIVER_ASSIGNED", driverInfo: payload.driver }
            : prev
        );
        refreshActive();
      },
      "ride:driverLocation": (payload) => {
        setDriverLocation({ latitude: payload.latitude, longitude: payload.longitude });
      },
      "ride:driverArriving": () => refreshActive(),
      "ride:driverArrived": () => refreshActive(),
      "ride:tripStarted": () => refreshActive(),
      "ride:tripCompleted": () => refreshActive(),
      "ride:cancelled": () => refreshActive(),
    };

    for (const [event, fn] of Object.entries(handlers)) socket.on(event, fn);
    return () => {
      for (const [event, fn] of Object.entries(handlers)) socket.off(event, fn);
    };
  }, [socket, user, refreshActive]);

  return (
    <RideContext.Provider
      value={{ activeRide, setActiveRide, driverLocation, refreshActive, loading }}
    >
      {children}
    </RideContext.Provider>
  );
}

export function useRide() {
  const ctx = useContext(RideContext);
  if (!ctx) throw new Error("useRide must be used within RideProvider");
  return ctx;
}
