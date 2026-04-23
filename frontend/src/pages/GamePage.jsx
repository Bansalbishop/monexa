import React, { useState } from "react";
import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useRoomStore } from "../stores/useRoomStore";
import { useAuthStore } from "../stores/useAuthStore";
import { Bell, Loader, Send, X } from "lucide-react";
import { useMemo } from "react";
import { socket } from "../lib/socket.js";
import toast from "react-hot-toast";

const GamePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const {
    room,
    getRoom,
    transfer,
    transferAll,
    bankTransfer,
    useCredit,
    payCredit,
    listenToRoom,
    stopListening,
  } = useRoomStore();
  const players = room?.players || [];
  const getName = (playerId) => {
    if (!playerId) return "Bank";
    const player = room?.players?.find(
      (p) => p.userId?._id?.toString() === playerId?.toString(),
    );
    return player?.userId?.fullname || "Unknown";
  };
  const [amount, setAmount] = useState("");
  const [playerMode, setPlayerMode] = useState(true);

  const generateCardNumber = () => {
    return ` ${Math.floor(1000 + Math.random() * 9000)}  ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(
      1000 + Math.random() * 9000,
    )} ${Math.floor(1000 + Math.random() * 9000)}`;
  };

  const cardNumber = useMemo(() => generateCardNumber(), []);
  const { authUser } = useAuthStore();
  const isHost = room?.hostId?.toString() === authUser._id?.toString();
  const [select, setSelect] = useState(null);
  const isBankerAlsoPlayer = room?.isBankerAlsoPlayer;
  const thisPlayer = room?.players?.find(
    (p) => p.userId?._id?.toString() === authUser._id?.toString(),
  );

  // Join socket room and listen for updates
  useEffect(() => {
    if (!authUser || !id) return;

    socket.emit("join_room", {
      roomId: id,
      userId: authUser._id,
    });
  }, [id, authUser]);

  useEffect(() => {
    getRoom(id);
    listenToRoom();

    return () => stopListening();
  }, [id]);

  // If room gets deleted or player is kicked
  useEffect(() => {
    const handleDisconnectFromRoom = () => {
      toast.error("You've been disconnected from the room");
      navigate("/");
    };

    socket.on("room_deleted", handleDisconnectFromRoom);

    return () => socket.off("room_deleted", handleDisconnectFromRoom);
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!amount || Number(amount) <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    if (!select) {
      toast.error("Select a recipient first");
      return;
    }

    try {
      if (select === "all") {
        await transferAll(id, {
          fromId: authUser._id,
          amount: Number(amount),
        });
      } else if (select === "tobank") {
        await bankTransfer(id, {
          from: authUser._id,
          to: "bank",
          amount: Number(amount),
        });
      } else if (!playerMode) {
        await bankTransfer(id, {
          from: "bank",
          to: select,
          amount: Number(amount),
        });
      } else if (select === "givetocard") {
        await payCredit(id, {
          fromId: authUser._id,
          amount: Number(amount),
        });
      } else if (select === "takefromcard") {
        await useCredit(id, {
          toId: authUser._id,
          amount: Number(amount),
        });
      } else {
        // player to player
        await transfer(id, {
          fromId: authUser._id,
          toId: select,
          amount: Number(amount),
        });
      }

      setAmount("");
      setSelect(null);
    } catch (err) {
      console.error(err);
    }
  };

  if (!room) {
    return (
      <div className="w-full min-h-[calc(100vh-64px)] bg-[#0F172A] flex items-center justify-center px-4 text-white">
        <Loader className="size-10 animate-spin"></Loader>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-[#0F172A] text-white flex flex-col px-4 items-center">
      <div className="flex flex-col items-center gap-5">
        <div className="flex gap-5">
          {isHost && (
            <button
              onClick={() => setPlayerMode(false)}
              className={`px-5 py-1 border-2 rounded-2xl ${!playerMode ? "bg-white text-black" : ""} `}
            >
              Banker
            </button>
          )}

          {(isHost && isBankerAlsoPlayer) || !isHost ? (
            <button
              onClick={() => setPlayerMode(true)}
              className={`px-5 py-1 border-2 rounded-2xl ${playerMode ? "bg-white text-black" : ""} `}
            >
              Player
            </button>
          ) : (
            ""
          )}
          <button
            onClick={() => setOpen(true)}
            className={`px-5 py-1 border-2 rounded-2xl  text-white `}
          >
            <Bell />
          </button>
        </div>
        <div className="flex flex-col gap-2">
          <div className="bg-[#1E293B] p-6 rounded-xl w-[400px] flex justify-between px-10 ">
            <h2 className="font-heading ">Total Amount:</h2>
            <p className="font-retro text-green-400">
              $ {playerMode ? thisPlayer?.balance : room.bankBalance}
            </p>
          </div>

          {playerMode && (
            <div
              onClick={() => setSelect("takefromcard")}
              className={`w-[400px] h-44 rounded-2xl p-5 cursor-pointer transition-all duration-300 
        bg-gradient-to-br from-indigo-500 via-blue-500 to-cyan-400
        shadow-lg ${select === "takefromcard" ? "scale-105 shadow-2xl" : ""}
      `}
            >
              {/* Top Row */}
              <div className="flex justify-between items-center text-white text-sm">
                <span className="opacity-80">Credit Card</span>
                <span className="font-semibold tracking-widest">VISA</span>
              </div>

              {/* Card Number */}
              <div className="mt-6 text-white text-lg tracking-widest">
                {cardNumber}
              </div>

              {/* Bottom Row */}
              <div className="mt-6 flex justify-between items-center text-white">
                <div>
                  <p className="text-xs opacity-70">Room ID</p>
                  <p className="font-semibold">
                    {room.roomId}
                  </p>
                </div>

                <div>
                  <p className="text-xs opacity-70">Balance</p>
                  <p className="font-semibold text-red-600">
                    ${thisPlayer?.creditUsed}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-5 gap-10 max-h-[65vw] scrollbar-hide overflow-y-scroll mt-10">
        {playerMode && (
          <>
            <div
              onClick={() => setSelect("tobank")}
              className={`flex ${select === "tobank" ? "bg-blue-500/80" : ""}  rounded-2xl p-2 flex-col items-center`}
            >
              <img
                className="rounded-full size-20"
                src="https://imgs.search.brave.com/VmzZRq09grUtUtHTXb_o5bNU8GZdLcivmP-q8c4RQWM/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9zdGF0/aWMudmVjdGVlenku/Y29tL3N5c3RlbS9y/ZXNvdXJjZXMvdGh1/bWJuYWlscy8wMTEv/MjA1LzkwMC9zbWFs/bC95ZWxsb3ctYmFu/ay13aXRoLXJlZC1y/b29mLWJ1aWxkaW5n/LXdpdGgtY29sdW1u/cy1vbi15ZWxsb3ct/YmFja2dyb3VuZC1p/c29tZXRyaWMtdmll/dy0zZC1yZW5kZXJp/bmctcGhvdG8uanBn"
              ></img>
              <p className="font-heading">Bank</p>
            </div>
            <div
              onClick={() => setSelect("givetocard")}
              className={`flex ${select === "givetocard" ? "bg-blue-500/80" : ""}  rounded-2xl p-2 flex-col items-center`}
            >
              <img
                className="rounded-full size-20"
                src="https://imgs.search.brave.com/MgIg8j43d9BiHGE-Ycyc6MemZlseaqAMt_RD2a1FCYA/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9pbWcu/ZnJlZXBpay5jb20v/ZnJlZS1wc2QvM2Qt/Y2FydG9vbi1jcmVk/aXQtY2FyZC1yZWNl/aXB0Xzg0NDQzLTU2/ODE1LmpwZz9zZW10/PWFpc19oeWJyaWQm/dz03NDAmcT04MA"
              ></img>
              <p className="font-heading">Card</p>
            </div>
            <div
              onClick={() => setSelect("all")}
              className={`flex ${select === "all" ? "bg-blue-500/80" : ""}  rounded-2xl p-2 flex-col items-center`}
            >
              <img
                className="rounded-full size-20"
                src="https://imgs.search.brave.com/nRfNicAdT2sNjRhgB06cyr_64uL-u6YA8g9SHQle7FU/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9jZG4u/cGl4YWJheS5jb20v/cGhvdG8vMjAxNy8x/MS8xMC8wNS80Ni9n/cm91cC0yOTM1NTIx/XzY0MC5wbmc"
              ></img>
              <p className="font-heading">All</p>
            </div>
          </>
        )}

        {playerMode
          ? players.map((p) => {
              if (p.userId?._id?.toString() === authUser._id?.toString())
                return null;

              return (
                <div
                  onClick={() => setSelect(p.userId._id)}
                  key={p.userId._id}
                  className={`flex ${select === p.userId._id ? "bg-blue-500/80" : ""}  rounded-2xl p-2 flex-col items-center`}
                >
                  <img
                    className="rounded-full size-20"
                    src={p.userId?.profilePic || "/avatar.png"}
                  />
                  <p>{p.userId?.fullname}</p>
                </div>
              );
            })
          : players.map((p) => (
              <div
                onClick={() => setSelect(p.userId._id)}
                key={p.userId?._id}
                className={`flex ${select === p.userId._id ? "bg-blue-500/80" : ""}  rounded-2xl p-2 flex-col items-center`}
              >
                <img
                  className="rounded-full size-20"
                  src={p.userId?.profilePic || "/avatar.png"}
                ></img>
                <p className="font-heading">{p.userId?.fullname}</p>
              </div>
            ))}
      </div>

      <div className="absolute bottom-0 bg-[#1E293B] p-6 rounded-xl w-[400px] ">
        <form onSubmit={handleSubmit} className="flex items-center gap-6">
          <input
            type="number"
            placeholder="Enter Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="px-2 rounded-xl w-[280px] h-[40px] border-2 text-white font-retro"
          />
          <button type="submit" className="p-3 rounded-full bg-indigo-600">
            <Send className="" />
          </button>
        </form>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center">
          <div className="bg-[#1E293B] p-6 rounded-xl w-[400px]">
            <div className="flex justify-between">
              <h2 className="font-retro">Transactions</h2>
              <X onClick={() => setOpen(false)} className="text-red-500 cursor-pointer" />
            </div>
            {room.transactions.length === 0 ? (
              <p className="text-gray-400 text-center py-6">No transactions yet</p>
            ) : (
              [...room.transactions].reverse().map((t) => {
                const isSender =
                  t.senderId?.toString() === authUser._id?.toString();

                const isReceiver =
                  t.receiverId?.toString() === authUser._id?.toString();

                let bgClass = "bg-gray-700/40"; // default

                if (isSender) bgClass = "bg-red-500/20";
                else if (isReceiver) bgClass = "bg-green-500/20";

                return (
                  <div
                    key={t._id}
                    className={`px-4 py-2 rounded-lg ${bgClass} flex justify-between items-center my-3`}
                  >
                    <span className="text-sm text-white">
                      {getName(t.senderId)} → {getName(t.receiverId)}
                    </span>

                    <span
                      className={`font-semibold ${
                        isSender
                          ? "text-red-400"
                          : isReceiver
                            ? "text-green-400"
                            : "text-gray-300"
                      }`}
                    >
                      ₹{t.amount}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GamePage;
