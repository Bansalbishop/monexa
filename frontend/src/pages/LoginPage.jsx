import React, { useState } from "react";
import { useAuthStore } from "../stores/useAuthStore";
import { useNavigate } from "react-router-dom";
import { Loader } from "lucide-react";

const LoginPage = () => {
  const navigate = useNavigate();
  const { isLoggingIn, login } = useAuthStore();
  const [form, setForm] = useState({
    username: "",
    password: "",
  });
  const handleSubmit = async (e) => {
    e.preventDefault();
    await login(form);
    navigate("/");
  };

  return (
    <div className="w-full min-h-[calc(100vh-64px)] bg-[#0F172A] flex items-center justify-center px-4">
      <div className="bg-white/2 w-full max-w-md  backdrop-blur-md p-6 rounded-2xl shadow-xl border flex flex-col items-center justify-center gap-5 border-white/10">
        <h2 className="font-retro text-white flex text-center my-3 ">Login</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <input
            type="text"
            placeholder="Username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            className="bg-[#1E293B] text-white px-6  w-70 md:w-100 py-3 rounded-lg outline-none focus:ring-2 focus:none "
          />
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="bg-[#1E293B] text-white px-6  w-70 md:w-100 py-3 rounded-lg outline-none focus:ring-2 focus:none "
          />
          <button
            type="submit"
            disabled={isLoggingIn}
            className="px-5 rounded-lg py-3 bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 text-white font-heading cursor-pointer"
          >
            {isLoggingIn ? (
              <div className="flex gap-2 px-4">
                <Loader className="size-5 animate-spin text-white" />{" "}
                <span className="text-white font-heading">Logging in</span>
              </div>
            ) : (
              <div>Submit</div>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
