import React, { useRef } from "react";
import { useAuthStore } from "../stores/useAuthStore";
import { useNavigate } from "react-router-dom";
import { Loader, LogOut } from "lucide-react";

const Navbar = () => {
  const { authUser, logout, updateProfilePic, isUpdatingProfile } =
    useAuthStore();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const handleProfilePicClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = async () => {
      await updateProfilePic(reader.result);
    };
    reader.readAsDataURL(file);

    // Reset input so the same file can be selected again
    e.target.value = "";
  };

  return (
    <div className="w-full bg-[#0F172A] backdrop-blur-3xl px-6 md:px-30 lg:px-40 py-3 flex justify-between items-center ">
      <div>
        <h2
          onClick={() => navigate("/")}
          className="text-white font-retro cursor-pointer"
        >
          Monexa
        </h2>
      </div>
      {authUser ? (
        <div className="flex gap-3 items-center">
          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />

          {/* Profile pic with upload overlay */}
          <div
            onClick={handleProfilePicClick}
            className="relative cursor-pointer group"
          >
            <img
              src={authUser.profilePic}
              className={`size-10 rounded-full object-cover transition-all duration-200 ${
                isUpdatingProfile ? "opacity-40" : "group-hover:opacity-70"
              }`}
            />
            {isUpdatingProfile ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader className="size-5 text-white animate-spin" />
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <svg
                  className="size-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
              </div>
            )}
          </div>

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
