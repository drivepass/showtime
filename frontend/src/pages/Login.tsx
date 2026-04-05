import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { EyeIcon, EyeOffIcon, UserIcon, ChevronDownIcon, CheckCircle2Icon } from "lucide-react";

export default function Login() {
  const { login, user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(username, password);
    } catch (err: any) {
      const message = err?.message || "Login failed";
      if (message.includes("401")) {
        setError("Invalid username or password");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden" style={{ backgroundColor: "#3d5a6e" }}>
      <div className="absolute inset-0 z-0">
        <img
          src="/signage-screens.png"
          alt=""
          className="absolute right-0 top-0 h-full object-cover opacity-40"
          style={{ width: "70%", objectPosition: "right center" }}
        />
        <img
          src="/car-hero.png"
          alt=""
          className="absolute bottom-0 right-[5%] z-10"
          style={{ width: "55%", maxWidth: "800px" }}
        />
      </div>

      <div className="relative z-20 flex flex-col justify-between min-h-screen px-12 py-8" style={{ width: "420px" }}>
        <div className="flex flex-col items-center pt-4">
          <div className="w-16 h-16 rounded-2xl bg-[#1a1a2e] flex items-center justify-center mb-3">
            <svg className="w-8 h-8 text-[#4ab8e8]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-wide">Showtime</h1>
          <p className="text-sm text-[#4ab8e8]">by drivepass<sup className="text-[8px]">&reg;</sup></p>
        </div>

        <div className="flex-1 flex items-center">
          <div className="w-full bg-[#1e2a35]/90 backdrop-blur-sm rounded-xl p-6 border border-[#2a3a4a]">
            <h2 className="text-xl font-semibold text-white mb-1">Welcome Back</h2>
            <p className="text-sm text-gray-400 mb-6">Please sign in to access your dashboard</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-900/30 border border-red-800 text-red-400 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username or Email"
                  required
                  autoFocus
                  className="w-full h-12 bg-[#1a2430] border border-[#2a3a4a] rounded-lg px-4 pr-10 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#4ab8e8] transition-colors"
                />
                <UserIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              </div>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  className="w-full h-12 bg-[#1a2430] border border-[#2a3a4a] rounded-lg px-4 pr-10 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#4ab8e8] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-400"
                >
                  {showPassword ? <EyeIcon className="w-4 h-4" /> : <EyeOffIcon className="w-4 h-4" />}
                </button>
              </div>

              <div className="relative">
                <select className="w-full h-12 bg-[#1a2430] border border-[#2a3a4a] rounded-lg px-4 pr-10 text-sm text-gray-400 appearance-none focus:outline-none focus:border-[#4ab8e8] transition-colors cursor-pointer">
                  <option>English (US)</option>
                  <option>French</option>
                  <option>Spanish</option>
                </select>
                <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-[#2a3a4a] bg-[#1a2430] accent-[#4ab8e8]"
                  />
                  <span className="text-xs text-gray-400">Remember me</span>
                </label>
                <button type="button" className="text-xs text-gray-300 underline hover:text-white transition-colors">
                  Forgot Password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-[#4ab8e8] hover:bg-[#3aa0d0] text-white font-medium text-sm rounded-lg transition-colors disabled:opacity-60"
              >
                {loading ? "Connecting..." : "Connection"}
              </button>
            </form>

            <div className="mt-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-[#2a3a4a]" />
                <span className="text-xs text-gray-500">Or continue with</span>
                <div className="flex-1 h-px bg-[#2a3a4a]" />
              </div>

              <button className="w-full h-11 bg-[#1a2430] border border-[#2a3a4a] rounded-lg flex items-center justify-center gap-2 text-sm text-gray-300 hover:bg-[#1e2e3c] transition-colors">
                <CheckCircle2Icon className="w-4 h-4 text-[#4ab8e8]" />
                SSO Authentication
              </button>
            </div>
          </div>
        </div>

        <div className="text-center pb-2">
          <p className="text-[11px] text-gray-400">
            Our SaaS environment has been upgraded to version <span className="font-semibold text-white">2.12.5</span>
          </p>
          <p className="text-[11px] text-gray-500">
            For more details, please see <span className="underline cursor-pointer hover:text-gray-400">Release Notes</span>.
          </p>
          <p className="text-[10px] text-gray-600 mt-1">
            Version 2.12.5. Published on December 12 2025, 1:12 AM
          </p>
        </div>
      </div>
    </div>
  );
}
