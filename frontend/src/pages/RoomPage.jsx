import React, { useState, useCallback, useRef } from "react";
import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useRoomStore } from "../stores/useRoomStore";
import { useAuthStore } from "../stores/useAuthStore";
import { socket } from "../lib/socket";
import { Check, Loader, X } from "lucide-react";
import toast from "react-hot-toast";
import ProfilePicModal from "../components/ProfilePicModal";

const RoomPage = () => {
  const { id } = useParams();
  const [initialAmount, setInitialAmount] = useState("");
  const [bankBalance, setBankBalance] = useState("");
  const [isPlayer, setIsPlayer] = useState(true);
  const [viewPic, setViewPic] = useState(null); // { src, name }
  const navigate = useNavigate();

  const {
    room,
    getRoom,
    startGame,
    listenToRoom,
    stopListening,
    leaveRoom,
    isLoading,
  } = useRoomStore();
  const { authUser } = useAuthStore();

  // ─── Reconnection helper ───
  const handleReconnect = useCallback(async () => {
    if (!authUser || !id) return;

    // Re-join the socket room
    socket.emit("join_room", {
      roomId: id,
      userId: authUser._id,
    });

    // Re-fetch fresh room state from DB
    const roomData = await getRoom(id);

    // If room no longer exists, redirect home
    if (!roomData) {
      toast.error("Room no longer exists");
      navigate("/");
      return;
    }

    // If the game has already started, redirect to game page
    if (roomData.gameStarted) {
      navigate(`/room/${id}/start`);
    }
  }, [id, authUser, getRoom, navigate]);

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
    const init = async () => {
      const roomData = await getRoom(id);

      // If the game already started (user refreshed during game), redirect
      if (roomData?.gameStarted) {
        navigate(`/room/${id}/start`);
      }
    };

    init();
    listenToRoom();

    return () => stopListening();
  }, [id]);

  // ─── Handle socket reconnection (after drop/refresh) ───
  const hasConnectedOnce = useRef(false);

  useEffect(() => {
    const onReconnect = () => {
      // Skip the initial connect — only handle actual reconnections
      if (!hasConnectedOnce.current) {
        hasConnectedOnce.current = true;
        return;
      }
      console.log("Socket reconnected — re-joining room");
      handleReconnect();
    };

    socket.on("connect", onReconnect);

    return () => socket.off("connect", onReconnect);
  }, [handleReconnect]);

  const handleLeaveRoom = async () => {
    const success = await leaveRoom(id);
    if (success) {
      stopListening();
      navigate("/");
    }
  };

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

  const handlePicClick = (player) => {
    // Only open lightbox for OTHER players' pics
    if (player.userId?._id?.toString() === authUser._id?.toString()) return;
    setViewPic({
      src: player.userId?.profilePic,
      name: player.userId?.fullname,
    });
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
      <div className="w-full h-auto flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-3">
        <div>
          <h1 className="font-retro font-bold text-white mt-5 mb-2">
            Room: {room.roomId}
          </h1>
          <p className="text-gray-400">Players: {room.players.length}</p>
        </div>
        <button
          onClick={handleLeaveRoom}
          className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold"
        >
          Leave Room
        </button>
      </div>
      <div className=" w-full h-[90vw] md:h-[60vw] lg:h-[20vw] overflow-y-scroll scrollbar-hide  grid grid-cols-3  gap-3">
        {room.players.map((p) => (
          <div key={p.userId?._id} className="flex flex-col items-center">
            <img
              src={p.userId?.profilePic}
              onClick={() => handlePicClick(p)}
              className={`size-23 rounded-full object-cover ${
                p.userId?._id?.toString() !== authUser._id?.toString()
                  ? "cursor-pointer hover:ring-2 hover:ring-indigo-400 transition-all duration-200"
                  : ""
              }`}
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

      {/* Profile pic lightbox */}
      {viewPic && (
        <ProfilePicModal
          src={viewPic.src}
          name={viewPic.name}
          onClose={() => setViewPic(null)}
        />
      )}
    </div>
  );
};

export default RoomPage;
