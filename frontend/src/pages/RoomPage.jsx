import React, { useState } from "react";
import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useRoomStore } from "../stores/useRoomStore";
import { useAuthStore } from "../stores/useAuthStore";
import { socket } from "../lib/socket";
import { Check, Loader, X } from "lucide-react";
import toast from "react-hot-toast";

const RoomPage = () => {
  const { id } = useParams();
  const [initialAmount, setInitialAmount] = useState("");
  const [bankBalance, setBankBalance] = useState("");
  const [isPlayer, setIsPlayer] = useState(true);
  const navigate = useNavigate();

  const { room, getRoom, startGame, listenToRoom, stopListening, isLoading } =
    useRoomStore();
  const { authUser } = useAuthStore();

  // Join the socket room
  useEffect(() => {
    if (!authUser || !id) return;

    socket.emit("join_room", {
      roomId: id,
      userId: authUser._id,
    });
  }, [id, authUser]);

  // Listen for game_started — navigates ALL players (including host)
  useEffect(() => {
    const handleGameStarted = (updatedRoom) => {
      toast.success("🎮 Game is starting!", { duration: 2000 });
      navigate(`/room/${updatedRoom.roomId}/start`);
    };

    socket.on("game_started", handleGameStarted);

    return () => socket.off("game_started", handleGameStarted);
  }, [navigate]);

  // Fetch room data and listen for updates
  useEffect(() => {
    getRoom(id);
    listenToRoom();

    return () => stopListening();
  }, [id]);

  const handleStartGame = async (e) => {
    e.preventDefault();

    if (!initialAmount || !bankBalance) {
      toast.error("Please enter all values");
      return;
    }

    if (Number(initialAmount) <= 0 || Number(bankBalance) <= 0) {
      toast.error("Values must be greater than 0");
      return;
    }

    await startGame({
      roomId: room.roomId,
      initialAmount: Number(initialAmount),
      bankBalance: Number(bankBalance),
      isBankerAlsoPlayer: isPlayer,
    });
    // Navigation is handled by the game_started socket event
  };

  if (!room) {
    return (
      <div className="w-full min-h-[calc(100vh-64px)] bg-[#0F172A] flex items-center justify-center px-4 text-white">
        <Loader className="size-10 animate-spin"></Loader>
      </div>
    );
  }

  return (
    <div className="w-full relative border-t-2 min-h-[calc(100vh-64px)] bg-[#0F172A] flex flex-col items-center px-4 ">
      <div className="w-full h-auto flex items-center justify-between mb-4">
        <h1 className="font-retro font-bold text-white mt-5 mb-2   ">
          Room: {room.roomId}
        </h1>
        <p className="text-gray-400 ">Players: {room.players.length}</p>
      </div>
      <div className=" w-full h-[90vw] md:h-[60vw] lg:h-[20vw] overflow-y-scroll scrollbar-hide  grid grid-cols-3  gap-3">
        {room.players.map((p) => (
          <div key={p.userId?._id} className="flex flex-col items-center">
            <img
              src={p.userId?.profilePic}
              className="size-23 rounded-full object-cover"
            />
            <span className="font-heading text-white mt-2">
              {p.userId?.fullname}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-6 text-gray-400">Waiting for players...</p>

      {room.hostId?.toString() === authUser._id?.toString() ? (
        <div className="absolute w-full bottom-0 pb-5 bg-gradient-to-r from-orange-400 via-amber-400 py-4 w-80 text-white font-retro rounded-lg to-yellow-300 flex flex-col items-center">
          <form
            onSubmit={handleStartGame}
            className="flex flex-col md:flex-row gap-2  md:gap-5 items-center"
          >
            <input
              type="number"
              placeholder="Player Amount"
              value={initialAmount}
              onChange={(e) => setInitialAmount(e.target.value)}
              className="px-6 py-3 w-70 outline-0 border-2 rounded-lg "
            />
            <input
              type="number"
              placeholder="Bank Value"
              value={bankBalance}
              onChange={(e) => setBankBalance(e.target.value)}
              className="px-6 py-3 w-70 outline-0 border-2 rounded-lg"
            />
            <div className="flex gap-2 md:flex-col items-center  justify-center">
              <div
                onClick={() => setIsPlayer(!isPlayer)}
                className="size-8 outline-0 border-2 rounded-full"
              >
                {isPlayer ? (
                  <div className="bg-green-400 font-white w-full rounded-full h-full">
                    <Check className="pt-1 pl-1" />
                  </div>
                ) : (
                  <div className="bg-red-600 font-white w-full rounded-full h-full text-center">
                    <X className="pt-1 pl-1" />
                  </div>
                )}
              </div>
              <p className="font-xs font-mono">Is Banker Player too</p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className=" cursor-pointer shadow-lg px-2 py-4 min-w-50 text-white font-retro rounded-lg bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-300"
            >
              {isLoading ? (
                <div className="flex  items-center justify-center gap-10">
                  <Loader className="animate-spin size-5 text-white" />
                  <p>Starting...</p>
                </div>
              ) : (
                "Start Game"
              )}{" "}
            </button>
          </form>
        </div>
      ) : (
        ""
      )}
    </div>
  );
};

export default RoomPage;
