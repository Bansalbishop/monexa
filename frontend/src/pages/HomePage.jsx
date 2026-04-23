import React, { useState } from "react";
import { useAuthStore } from "../stores/useAuthStore.js";
import { useNavigate } from "react-router-dom";
import { useRoomStore } from "../stores/useRoomStore.js";
import { HandCoins, Loader } from "lucide-react";

const Homepage = () => {
  const navigate = useNavigate();
  const { createRoom, joinRoom, isLoading } = useRoomStore();

  const { authUser } = useAuthStore();
  const [roomId, setRoomId] = useState("");
  const handleCreate = async () => {
    const id = await createRoom();
    if (id) {
      navigate(`/room/${id}`);
    }
  };
  const handleJoin = async (e) => {
    e.preventDefault();
    const id = await joinRoom(roomId);
    if (id) navigate(`/room/${id}`);
  };

  return (
    <div className="w-full min-h-[calc(100vh-64px)] bg-[#0F172A] border-t-1 flex flex-col items-center justify-center px-4">
      <div className="min-h-[50vh] w-full  flex flex-col  gap-10 items-center ">
        <div className="flex flex-col">
          <h2 className="text-white font-heading text-center text-3xl">
            Welcome, {authUser?.fullname}
          </h2>
          <p className="text-zinc-400 text-sm text-center font-heading font-light">
            Deal with players, not with cash!
          </p>
        </div>
        <div className="flex flex-col gap-5 mt-15">
          <button
            onClick={handleCreate}
            disabled={isLoading}
            className=" cursor-pointer px-2 py-4 w-80 text-white font-retro rounded-lg bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500"
          >
            {isLoading ? (
              <div className="flex  items-center justify-center gap-10">
                <Loader className="animate-spin size-5 text-white" />
                <p>Creating...</p>
              </div>
            ) : (
              "Create Room"
            )}
          </button>
          <div className="bg-gradient-to-r from-orange-400 via-amber-400 py-4 w-80 text-white font-retro rounded-lg to-yellow-300 flex flex-col items-center">
            <form onSubmit={handleJoin} className="flex flex-col items-center">
              <input
                type="text"
                placeholder="Room ID"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="px-6 py-3 w-70 outline-0"
              />
              <button
                type="submit"
                disabled={roomId === "" ? true : false}
                className=" cursor-pointer shadow-lg px-2 py-4 min-w-50 text-white font-retro rounded-lg bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-300"
              >
                {isLoading ? (
                  <div className="flex  items-center justify-center gap-10">
                    <Loader className="animate-spin size-5 text-white" />
                    <p>Joining...</p>
                  </div>
                ) : (
                  "Join Room"
                )}{" "}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Homepage;
