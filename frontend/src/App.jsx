import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { SocketProvider } from "./hooks/useSocket";
import { RideProvider } from "./context/RideContext";
import { ToastProvider } from "./components/Toast";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";
import AiCopilot from "./components/AiCopilot";

import Home from "./pages/Home";
import About from "./pages/About";
import Login from "./pages/Login";
import Register from "./pages/Register";

import PassengerDashboard from "./pages/passenger/PassengerDashboard";
import BookRide from "./pages/passenger/BookRide";
import ActiveRide from "./pages/passenger/ActiveRide";
import RideHistory from "./pages/passenger/RideHistory";
import RideDetail from "./pages/passenger/RideDetail";
import Profile from "./pages/passenger/Profile";

import DriverDashboard from "./pages/driver/DriverDashboard";
import ActiveTrip from "./pages/driver/ActiveTrip";
import Earnings from "./pages/driver/Earnings";
import DriverProfile from "./pages/driver/DriverProfile";

import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/Users";
import AdminDrivers from "./pages/admin/Drivers";
import AdminRides from "./pages/admin/Rides";
import AdminPayments from "./pages/admin/Payments";
import AdminPromos from "./pages/admin/Promos";
import AdminComplaints from "./pages/admin/Complaints";
import Analytics from "./pages/admin/Analytics";
import LiveOps from "./pages/admin/LiveOps";
import AuditLog from "./pages/admin/AuditLog";

import DashboardLayout from "./components/DashboardLayout";
import {
  LayoutDashboard,
  Map,
  PlusCircle,
  History,
  User as UserIcon,
  Car,
  Route as RouteIcon,
  CircleDollarSign,
  TicketPercent,
  LifeBuoy,
  BarChart3,
  Users,
  Radar,
  ScrollText,
} from "lucide-react";

const passengerNav = [
  { to: "/passenger", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/passenger/book", label: "Book a ride", icon: PlusCircle },
  { to: "/passenger/rides", label: "My rides", icon: History },
  { to: "/passenger/profile", label: "Profile", icon: UserIcon },
];

const driverNav = [
  { to: "/driver", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/driver/trip", label: "Active trip", icon: Map },
  { to: "/driver/earnings", label: "Earnings", icon: CircleDollarSign },
  { to: "/driver/profile", label: "My profile", icon: Car },
];

const adminNav = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/drivers", label: "Drivers", icon: Car },
  { to: "/admin/rides", label: "Rides", icon: RouteIcon },
  { to: "/admin/payments", label: "Payments", icon: CircleDollarSign },
  { to: "/admin/promos", label: "Promos", icon: TicketPercent },
  { to: "/admin/complaints", label: "Complaints", icon: LifeBuoy },
  { to: "/admin/live", label: "Live map", icon: Radar },
  { to: "/admin/audit", label: "Audit log", icon: ScrollText },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
];

function withPublic(Component) {
  return (
    <>
      <Navbar />
      <Component />
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        <AuthProvider>
          <SocketProvider>
            <RideProvider>
              <Routes>
                {/* Public */}
                <Route path="/" element={withPublic(Home)} />
                <Route path="/about" element={withPublic(About)} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Passenger */}
                <Route
                  path="/passenger"
                  element={
                    <ProtectedRoute roles={["passenger", "admin"]}>
                      <DashboardLayout nav={passengerNav} brand="Passenger" />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<PassengerDashboard />} />
                  <Route path="book" element={<BookRide />} />
                  <Route path="active/:id" element={<ActiveRide />} />
                  <Route path="rides" element={<RideHistory />} />
                  <Route path="rides/:id" element={<RideDetail />} />
                  <Route path="profile" element={<Profile />} />
                </Route>

                {/* Driver */}
                <Route
                  path="/driver"
                  element={
                    <ProtectedRoute roles={["driver", "admin"]}>
                      <DashboardLayout nav={driverNav} brand="Driver" />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<DriverDashboard />} />
                  <Route path="trip" element={<ActiveTrip />} />
                  <Route path="earnings" element={<Earnings />} />
                  <Route path="profile" element={<DriverProfile />} />
                </Route>

                {/* Admin */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute roles={["admin"]}>
                      <DashboardLayout nav={adminNav} brand="Admin" />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<AdminDashboard />} />
                  <Route path="users" element={<AdminUsers />} />
                  <Route path="drivers" element={<AdminDrivers />} />
                  <Route path="rides" element={<AdminRides />} />
                  <Route path="payments" element={<AdminPayments />} />
                  <Route path="promos" element={<AdminPromos />} />
                  <Route path="complaints" element={<AdminComplaints />} />
                  <Route path="live" element={<LiveOps />} />
                  <Route path="audit" element={<AuditLog />} />
                  <Route path="analytics" element={<Analytics />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>

              {/* Global AI Assistant Widget */}
              <AiCopilot />
            </RideProvider>
          </SocketProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
