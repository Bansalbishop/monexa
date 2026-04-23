import React from "react";
import { useAuthStore } from "../stores/useAuthStore";
import { useNavigate } from "react-router-dom";
import { LogOut, SquareArrowRight } from "lucide-react";
const Navbar = () => {
  const { authUser, logout } = useAuthStore();
  const navigate = useNavigate();
  return (
    <div className="w-full bg-[#0F172A] backdrop-blur-3xl px-6 md:px-30 lg:px-40 py-3 flex justify-between items-center ">
      <div>
        <h2 className="text-white font-retro">Monexa</h2>
      </div>
      {authUser ? (
        <div className="flex gap-3">
          <img
            src={authUser.profilePic}
            className="size-10 rounded-full object-contain cursor-pointer"
          />
          <button onClick={() => logout()}>
            <LogOut className="size-6 text-white" />
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={() => navigate("/login")}
            className="bg-[#1E293B] text-white px-2 py-2 rounded-lg cursor-pointer"
          >
            Login
          </button>
          <button
            onClick={() => navigate("/signup")}
            className="bg-[#1E293B] text-white px-2 py-2 rounded-lg cursor-pointer"
          >
            Create
          </button>
        </div>
      )}
    </div>
  );
};

export default Navbar;
