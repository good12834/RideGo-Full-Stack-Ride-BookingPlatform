import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Spinner from "./Spinner";

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner label="Checking your session..." className="min-h-screen" />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;

  if (roles && !roles.includes(user.role)) {
    const home =
      user.role === "admin"
        ? "/admin"
        : user.role === "driver"
          ? "/driver"
          : "/passenger";
    return <Navigate to={home} replace />;
  }

  return children;
}
