import React from "react";
import { X } from "lucide-react";

const ProfilePicModal = ({ src, name, onClose }) => {
  if (!src) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col items-center gap-4 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 bg-[#1E293B] rounded-full p-1.5 border border-white/20 hover:bg-red-500/80 transition-colors duration-200 cursor-pointer z-10"
        >
          <X className="size-4 text-white" />
        </button>
        <img
          src={src}
          alt={name}
          className="w-64 h-64 md:w-80 md:h-80 rounded-2xl object-cover shadow-2xl border-2 border-white/10"
        />
        {name && (
          <p className="text-white font-heading text-lg">{name}</p>
        )}
      </div>
    </div>
  );
};

export default ProfilePicModal;
