import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
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
      return room.roomId;
    } catch (error) {
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
      return id;
    } catch (error) {
      console.error("Join Error ", error);
    } finally {
      set({ isLoading: false });
    }
  },
  getRoom: async (id) => {
    try {
      set({ isLoading: true });
      const res = await axiosInstance.get(`/room/${id}`);
      set({ room: res.data.room });
    } catch (error) {
      console.error("get Room Error", error);
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
    } catch (err) {
      console.error("Start game error", err);
    } finally {
      set({ isLoading: false });
    }
  },

  listenToRoom: () => {
    socket.off("room_updated");

    socket.on("room_updated", (updatedRoom) => {
      set((state) => {
        if (state.room?.roomId === updatedRoom.roomId) {
          return { room: updatedRoom };
        }
        return state;
      });
    });
  },
  stopListening: () => {
    socket.off("room_updated");
  },
  transfer: async (roomId, data) => {
    try {
      await axiosInstance.post(`/room/${roomId}/transfer`, data);
    } catch (err) {
      console.error("Transfer error", err);
    }
  },
  transferAll: async (roomId, data) => {
    try {
      await axiosInstance.post(`/room/${roomId}/transferall`, data);
    } catch (err) {
      console.error("TransferAll error", err);
    }
  },
  bankTransfer: async (roomId, data) => {
    try {
      await axiosInstance.post(`/room/${roomId}/banktransfer`, data);
    } catch (err) {
      console.error("Bank transfer error", err);
    }
  },
  payCredit: async (roomId, data) => {
    try {
      await axiosInstance.post(`/room/${roomId}/paycredit`, data);
    } catch (err) {
      console.error("Pay credit error", err);
    }
  },
  useCredit: async (roomId, data) => {
    try {
      await axiosInstance.post(`/room/${roomId}/usecredit`, data);
    } catch (err) {
      console.error("Use credit error", err);
    }
  },
}));
