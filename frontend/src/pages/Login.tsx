import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { EyeIcon, EyeOffIcon } from "lucide-react";

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
    <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden" }}>
      {/* Full screen background image */}
      <img
        src="/showtime-login-bg.jpg"
        alt=""
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />

      {/* Top Left — DrivePass logo + URL */}
      <div style={{ position: "absolute", top: 48, left: 60, zIndex: 10 }}>
        <img src="/DP_logo_White.png" alt="drivepass" style={{ width: '180px', display: "block" }} />
      </div>

      {/* Bottom Left — Showtime icon */}
      <div style={{ position: "absolute", bottom: 32, left: 40, zIndex: 10 }}>
        <img src="/showtime.png" alt="Showtime" style={{ width: '130px', display: "block" }} />
      </div>

      {/* Bottom Right — Automotive Absolute */}
      <div style={{ position: "absolute", bottom: 32, right: 40, zIndex: 10 }}>
        <img src="/automotive_absolute.png" alt="Automotive Absolute" style={{ width: 280, display: "block" }} />
      </div>

      {/* Right Side Login Card */}
      <div
        style={{
          position: "absolute",
          right: 100,
          top: "50%",
          transform: "translateY(-50%)",
          width: 380,
          maxWidth: 420,
          background: "rgba(0, 0, 0, 0.72)",
          borderRadius: 12,
          padding: 40,
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          zIndex: 10,
        }}
      >
        <h2 style={{ color: "#fff", fontWeight: "bold", fontSize: 24, margin: 0 }}>
          Welcome Back
        </h2>
        <p style={{ color: "#9CA3AF", fontSize: 13, marginTop: 6, marginBottom: 24 }}>
          Please verify your credentials to continue.
        </p>

        <form onSubmit={handleSubmit}>
          {error && (
            <div
              style={{
                background: "rgba(127,29,29,0.3)",
                border: "1px solid #991b1b",
                color: "#f87171",
                padding: "10px 14px",
                borderRadius: 8,
                fontSize: 13,
                marginBottom: 16,
              }}
            >
              {error}
            </div>
          )}

          {/* Username */}
          <label
            style={{
              display: "block",
              color: "#fff",
              textTransform: "uppercase",
              fontSize: 11,
              letterSpacing: 1,
              marginBottom: 6,
              fontWeight: 600,
            }}
          >
            USERNAME
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoFocus
            style={{
              width: "100%",
              background: "#1a1a1a",
              border: "1px solid #333",
              borderRadius: 6,
              padding: "10px 12px",
              color: "#fff",
              fontSize: 14,
              outline: "none",
              boxSizing: "border-box",
              marginBottom: 16,
            }}
          />

          {/* Password */}
          <label
            style={{
              display: "block",
              color: "#fff",
              textTransform: "uppercase",
              fontSize: 11,
              letterSpacing: 1,
              marginBottom: 6,
              fontWeight: 600,
            }}
          >
            PASSWORD
          </label>
          <div style={{ position: "relative", marginBottom: 16 }}>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: "100%",
                background: "#1a1a1a",
                border: "1px solid #333",
                borderRadius: 6,
                padding: "10px 12px",
                paddingRight: 40,
                color: "#fff",
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#9CA3AF",
                padding: 0,
                display: "flex",
                alignItems: "center",
              }}
            >
              {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
            </button>
          </div>

          {/* Remember me + Forgot password */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ accentColor: "#1A91E2" }}
              />
              <span
                style={{
                  color: "#fff",
                  textTransform: "uppercase",
                  fontSize: 11,
                  letterSpacing: 1,
                  fontWeight: 600,
                }}
              >
                REMEMBER ME
              </span>
            </label>
            <button
              type="button"
              style={{
                background: "none",
                border: "none",
                color: "#9CA3AF",
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 1,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              FORGOT PASSWORD?
            </button>
          </div>

          {/* Sign In button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              background: "#1A91E2",
              color: "#fff",
              fontWeight: "bold",
              textTransform: "uppercase",
              letterSpacing: 1,
              fontSize: 14,
              padding: 12,
              borderRadius: 6,
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
              marginTop: 8,
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => {
              if (!loading) (e.currentTarget.style.background = "#1578c2");
            }}
            onMouseLeave={(e) => {
              if (!loading) (e.currentTarget.style.background = "#1A91E2");
            }}
          >
            {loading ? "Signing in..." : "SIGN IN"}
          </button>
        </form>
      </div>
    </div>
  );
}
