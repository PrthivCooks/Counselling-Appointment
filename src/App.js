import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";
import AppointmentSlots from "./components/AppointmentSlots";
import AdminDashboard from "./components/AdminDashboard";

const App = () => {
  const [userRole, setUserRole] = useState(null);

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login setUserRole={setUserRole} />} />
        <Route path="/register" element={<Register />} />

        {/* User Role-Specific Routes */}
        <Route
          path="/appointments"
          element={userRole === "user" ? <AppointmentSlots /> : <Navigate to="/login" />}
        />
        <Route
          path="/admin"
          element={userRole === "admin" ? <AdminDashboard /> : <Navigate to="/login" />}
        />
      </Routes>
    </Router>
  );
};

export default App;
