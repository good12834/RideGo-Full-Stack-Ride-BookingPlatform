import axios from "axios";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_URL,
});
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("ridego_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const requestUrl = err.config?.url || "";
    if (status === 401 && !requestUrl.includes("/auth/login")) {
      localStorage.removeItem("ridego_token");
      localStorage.removeItem("ridego_user");
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    // Keep the HTTP status + response body on the error so callers can branch on
    // e.g. err.status === 409 and read err.data.rideId. The body may be a JSON
    // object, a string, or absent entirely — only build an Error from a string
    // message so backend errors never surface as confusing client-side stack
    // traces.
    const body = err.response?.data;
    const rawMessage =
      typeof body === "string"
        ? body
        : typeof body?.message === "string"
          ? body.message
          : "";
    const error = rawMessage
      ? Object.assign(new Error(rawMessage), { status, data: body })
      : Object.assign(err, { status, data: body });
    return Promise.reject(error);
  }
);

export default api;
