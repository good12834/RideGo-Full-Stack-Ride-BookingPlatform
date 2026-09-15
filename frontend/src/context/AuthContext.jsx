import { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("ridego_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = localStorage.getItem("ridego_token");
    if (!token) {
      setLoading(false);
      return null;
    }
    try {
      const { data } = await api.get("/auth/me");
      setUser(data.user);
      setDriver(data.driver || null);
      localStorage.setItem("ridego_user", JSON.stringify(data.user));
      setLoading(false);
      return data.user;
    } catch {
      localStorage.removeItem("ridego_token");
      localStorage.removeItem("ridego_user");
      setUser(null);
      setLoading(false);
      return null;
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("ridego_token", data.token);
    localStorage.setItem("ridego_user", JSON.stringify(data.user));
    setUser(data.user);
    if (data.user.role === "driver") {
      try {
        const { data: meData } = await api.get("/auth/me");
        setDriver(meData.driver || null);
      } catch {
        /* noop */
      }
    }
    return data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    localStorage.setItem("ridego_token", data.token);
    localStorage.setItem("ridego_user", JSON.stringify(data.user));
    setUser(data.user);
    if (data.driver) setDriver(data.driver);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("ridego_token");
    localStorage.removeItem("ridego_user");
    setUser(null);
    setDriver(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, driver, loading, login, register, logout, refresh, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
