import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

export const useAuthStore = create((set) => ({
  authUser: null,
  isCheckingAuth: true,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");
      set({ authUser: res.data });
    } catch (error) {
      console.log("Error in checkAuth", error);
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },
  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      await axiosInstance.post("/auth/login", data);
      const res = await axiosInstance.get("/auth/check");
      set({ authUser: res.data });
      toast.success("Logged in successfully!");
    } catch (error) {
      const msg =
        error.response?.data?.message || "Login failed. Please try again.";
      toast.error(msg);
      console.error("Error in login ", error);
      set({ authUser: null });
    } finally {
      set({ isLoggingIn: false });
    }
  },
  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      await axiosInstance.post("/auth/signup", data);
      const res = await axiosInstance.get("/auth/check");
      set({ authUser: res.data });
      toast.success("Account created successfully!");
    } catch (error) {
      const msg =
        error.response?.data?.message || "Signup failed. Please try again.";
      toast.error(msg);
      console.error("Error in signup ", error);
      set({ authUser: null });
    } finally {
      set({ isSigningUp: false });
    }
  },
  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      set({ authUser: null });
      toast.success("Logged out!");
    } catch (error) {
      toast.error("Logout failed. Please try again.");
      console.error("Error in logout ", error);
    }
  },
}));
