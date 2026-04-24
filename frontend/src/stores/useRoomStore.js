import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { socket } from "../lib/socket.js";
import { useAuthStore } from "./useAuthStore.js";

export const useRoomStore = create((set) => ({
  room: null,
  isLoading: false,

  createRoom: async () => {
    set({ isLoading: true });
    try {
      const res = await axiosInstance.post("/room/create");
      const room = res.data.room;
      const user = useAuthStore.getState().authUser;

      if (user) {
        socket.emit("join_room", {
          roomId: room.roomId,
          userId: user._id,
        });
      }

      set({ room });
      toast.success(`Room ${room.roomId} created!`);
      return room.roomId;
    } catch (error) {
      const msg =
        error.response?.data?.message || "Failed to create room";
      toast.error(msg);
      console.error("Create room error", error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  joinRoom: async (id) => {
    set({ isLoading: true });
    try {
      const res = await axiosInstance.post("/room/join", {
        roomId: id,
      });

      const room = res.data.room;
      const user = useAuthStore.getState().authUser;
      if (!user) return;

      socket.emit("join_room", {
        roomId: id,
        userId: user._id,
      });

      set({ room });

      // Show different toast for reconnection vs new join
      if (res.data.message === "Reconnected to room") {
        toast.success(`Reconnected to room ${id}!`, { icon: "🔄" });
      } else {
        toast.success(`Joined room ${id}!`);
      }
      return id;
    } catch (error) {
      const msg =
        error.response?.data?.message || "Failed to join room";
      toast.error(msg);
      console.error("Join Error ", error);
    } finally {
      set({ isLoading: false });
    }
  },

  // Rejoin an existing room (used after page refresh / socket reconnect)
  rejoinRoom: async (id) => {
    try {
      const res = await axiosInstance.post(`/room/${id}/rejoin`);
      const room = res.data.room;
      const user = useAuthStore.getState().authUser;

      if (user) {
        socket.emit("join_room", {
          roomId: id,
          userId: user._id,
        });
      }

      set({ room });
      return room;
    } catch (error) {
      // Silently fail — getRoom will handle the fallback
      console.error("Rejoin error (may be expected)", error);
      return null;
    }
  },

  getRoom: async (id) => {
    try {
      set({ isLoading: true });
      const res = await axiosInstance.get(`/room/${id}`);
      set({ room: res.data.room });
      return res.data.room;
    } catch (error) {
      const msg =
        error.response?.data?.message || "Failed to load room";
      toast.error(msg);
      console.error("get Room Error", error);
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  startGame: async ({
    roomId,
    initialAmount,
    bankBalance,
    isBankerAlsoPlayer,
  }) => {
    try {
      set({ isLoading: true });
      await axiosInstance.post(`/room/${roomId}/start`, {
        initialAmount,
        bankBalance,
        isBankerAlsoPlayer,
      });
      toast.success("🎮 Game started!");
    } catch (err) {
      const msg =
        err.response?.data?.message || "Failed to start game";
      toast.error(msg);
      console.error("Start game error", err);
    } finally {
      set({ isLoading: false });
    }
  },

  listenToRoom: () => {
    socket.off("room_updated");
    socket.off("player_joined");
    socket.off("player_left");
    socket.off("player_reconnected");

    socket.on("room_updated", (updatedRoom) => {
      set((state) => {
        if (state.room?.roomId === updatedRoom.roomId) {
          return { room: updatedRoom };
        }
        return state;
      });
    });

    socket.on("player_joined", ({ name }) => {
      toast.success(`${name} joined the room!`, {
        icon: "👋",
      });
    });

    socket.on("player_left", ({ name }) => {
      toast(`${name} left the room`, {
        icon: "🚪",
        style: {
          background: "#1E293B",
          color: "#f97316",
          border: "1px solid rgba(249, 115, 22, 0.3)",
        },
      });
    });

    socket.on("player_reconnected", ({ name }) => {
      toast.success(`${name} reconnected!`, {
        icon: "🔄",
      });
    });
  },

  stopListening: () => {
    socket.off("room_updated");
    socket.off("player_joined");
    socket.off("player_left");
    socket.off("player_reconnected");
  },

  transfer: async (roomId, data) => {
    try {
      await axiosInstance.post(`/room/${roomId}/transfer`, data);
      toast.success("💸 Payment sent!");
    } catch (err) {
      const msg =
        err.response?.data?.message || "Transfer failed";
      toast.error(msg);
      console.error("Transfer error", err);
    }
  },

  transferAll: async (roomId, data) => {
    try {
      await axiosInstance.post(`/room/${roomId}/transferall`, data);
      toast.success("💸 Paid everyone!");
    } catch (err) {
      const msg =
        err.response?.data?.message || "Transfer failed";
      toast.error(msg);
      console.error("TransferAll error", err);
    }
  },

  bankTransfer: async (roomId, data) => {
    try {
      await axiosInstance.post(`/room/${roomId}/banktransfer`, data);
      toast.success("🏦 Bank transfer done!");
    } catch (err) {
      const msg =
        err.response?.data?.message || "Bank transfer failed";
      toast.error(msg);
      console.error("Bank transfer error", err);
    }
  },

  payCredit: async (roomId, data) => {
    try {
      await axiosInstance.post(`/room/${roomId}/paycredit`, data);
      toast.success("💳 Credit repaid!");
    } catch (err) {
      const msg =
        err.response?.data?.message || "Credit repayment failed";
      toast.error(msg);
      console.error("Pay credit error", err);
    }
  },

  useCredit: async (roomId, data) => {
    try {
      await axiosInstance.post(`/room/${roomId}/usecredit`, data);
      toast.success("💳 Credit taken!");
    } catch (err) {
      const msg =
        err.response?.data?.message || "Failed to use credit";
      toast.error(msg);
      console.error("Use credit error", err);
    }
  },
}));
