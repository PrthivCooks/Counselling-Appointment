import React, { useState } from "react";
import { auth, database } from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { ref, get } from "firebase/database";
import { Link, useNavigate } from "react-router-dom";
import "../css/login.css";

const Login = ({ setUserRole }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      // Sign in the user
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userId = userCredential.user.uid;

      console.log("User logged in, UID:", userId);

      // Fetch user role from the `users` node
      const userRef = ref(database, `users/${userId}`);
      const snapshot = await get(userRef);

      if (snapshot.exists()) {
        const userData = snapshot.val();
        const userRole = userData.role;

        console.log("User role found:", userRole);

        if (userRole) {
          setUserRole(userRole);

          // Navigate based on role
          if (userRole.startsWith("admin")) {
            navigate("/admin");
          } else if (userRole.startsWith("counselor")) {
            navigate("/counselor-dashboard");
          } else {
            navigate("/appointments");
          }
        } else {
          alert("Role not found. Please contact the admin.");
        }
      } else {
        alert("User data not found. Please contact the admin.");
        console.log("Snapshot does not exist for userId:", userId);
      }
    } catch (error) {
      console.error("Login error:", error.message);
      alert("Login failed: " + error.message);
    }
  };

  return (
    <div className="title">
      <h1>Counselling Appointment</h1>
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Login</button>
      </form>
      <p>
        Don't have an account? <Link to="/register">Sign up</Link>
      </p>
    </div>
  );
};

export default Login;
