import React, { useEffect } from "react";
import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage";
import SignupPage from "./pages/SignupPage";
import LoginPage from "./pages/LoginPage";
import { useAuthStore } from "./stores/useAuthStore";
import { Navigate, Route, Routes } from "react-router-dom";
import { Loader } from "lucide-react";
import RoomPage from "./pages/RoomPage";
import { Toaster } from "react-hot-toast";
import GamePage from "./pages/GamePage";
import { socket } from "./lib/socket";

const App = () => {
  const { authUser, checkAuth, isCheckingAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Connect/disconnect socket based on auth state
  useEffect(() => {
    if (authUser) {
      if (!socket.connected) {
        socket.connect();
      }
    } else {
      if (socket.connected) {
        socket.disconnect();
      }
    }
  }, [authUser]);

  if (isCheckingAuth)
    return (
      <div className="w-full min-h-screen bg-[#0F172A] flex items-center justify-center">
        <Loader className="size-10 animate-spin text-indigo-400"></Loader>
      </div>
    );

  return (
    <div>
      <Navbar />
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: "#1E293B",
            color: "#fff",
            borderRadius: "12px",
            border: "1px solid rgba(255,255,255,0.1)",
            padding: "12px 16px",
            fontSize: "14px",
            fontWeight: "500",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          },
          success: {
            iconTheme: {
              primary: "#22c55e",
              secondary: "#fff",
            },
          },
          error: {
            iconTheme: {
              primary: "#ef4444",
              secondary: "#fff",
            },
          },
        }}
      />

      <Routes>
        <Route
          path="/"
          element={authUser ? <HomePage /> : <Navigate to="/login" />}
        />
        <Route
          path="/signup"
          element={!authUser ? <SignupPage /> : <Navigate to="/" />}
        />
        <Route
          path="/login"
          element={!authUser ? <LoginPage /> : <Navigate to="/" />}
        />
        <Route
          path="/room/:id"
          element={!authUser ? <LoginPage /> : <RoomPage />}
        />
        <Route
          path="/room/:id/start"
          element={!authUser ? <LoginPage /> : <GamePage />}
        />
      </Routes>
    </div>
  );
};

export default App;
