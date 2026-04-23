import React, { useEffect } from "react";
import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage";
import SignupPage from "./pages/SignupPage";
import LoginPage from "./pages/LoginPage";
import { useAuthStore } from "./stores/useAuthStore";
import { Navigate, Route, Routes } from "react-router-dom";
import { Loader } from "lucide-react";
import RoomPage from "./pages/RoomPage";
import GamePage from "./pages/GamePage";
const App = () => {
  const { authUser, checkAuth, isCheckingAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isCheckingAuth)
    return (
      <div>
        <Loader className="size-6 animate-spin"></Loader>
      </div>
    );

  return (
    <div>
      <Navbar />

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
