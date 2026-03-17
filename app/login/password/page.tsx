"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../context/AuthContext";

function PasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, register } = useAuth();

  const email = searchParams.get("email") || "";
  const mode = searchParams.get("mode") || "login";
  const isRegister = mode === "register";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  async function handleSubmit() {
    if (!password) {
      setError("Please enter a password");
      return;
    }
    if (isRegister && password !== confirm) {
      setError("Passwords don't match");
      return;
    }
    if (isRegister && password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      if (isRegister) {
        await register(email, password);
      } else {
        await login(email, password);
      }
      router.replace("/hallway");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSubmit();
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(to bottom, #0b0b0d 0%, #121214 60%, #161618 100%)",
        fontFamily: "var(--font-inter, Inter, sans-serif)",
      }}
    >
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes btnAppear {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .pw-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          animation: fadeSlideUp 0.35s ease;
          width: 320px;
        }
        .pw-title {
          color: #e5e5ea;
          font-size: 18px;
          font-weight: 500;
          margin-bottom: 6px;
          letter-spacing: -0.01em;
          text-align: center;
        }
        .pw-subtitle {
          color: #6b6b6b;
          font-size: 13px;
          margin-bottom: 20px;
          text-align: center;
          max-width: 260px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .pw-input {
          width: 100%;
          height: 44px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.14);
          background: #18171c;
          color: #e5e5ea;
          font-size: 14px;
          font-family: inherit;
          padding: 0 14px;
          outline: none;
          transition: border-color 0.15s;
          box-sizing: border-box;
          margin-bottom: 10px;
        }
        .pw-input::placeholder { color: #555; }
        .pw-input:focus { border-color: rgba(255,255,255,0.28); }
        .pw-error {
          color: #f87171;
          font-size: 12.5px;
          margin-bottom: 12px;
          align-self: flex-start;
          min-height: 18px;
          width: 100%;
        }
        .btn-primary {
          width: 100%;
          height: 44px;
          border-radius: 8px;
          border: none;
          background: #5e6ad2;
          color: #fff;
          font-size: 14px;
          font-weight: 500;
          font-family: inherit;
          cursor: pointer;
          transition: background 0.15s, opacity 0.15s;
          margin-bottom: 10px;
          animation: btnAppear 0.3s ease 0.15s both;
        }
        .btn-primary:hover:not(:disabled) { background: #6b76e0; }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-back {
          background: transparent;
          border: none;
          color: #8e8e93;
          font-size: 13px;
          font-family: inherit;
          cursor: pointer;
          transition: color 0.15s;
          padding: 4px 0;
          animation: btnAppear 0.3s ease 0.22s both;
        }
        .btn-back:hover { color: #e5e5ea; }
      `}</style>

      <div className="pw-container">
        {/* Logo */}
        <img
          src="/icons/logo.png"
          alt="Virtual Office"
          style={{ width: 44, height: 44, objectFit: "contain", marginBottom: 20 }}
        />

        {/* Title */}
        <p className="pw-title">
          {isRegister ? "Create a password" : "Welcome back"}
        </p>
        <p className="pw-subtitle">{email}</p>

        {/* Password input */}
        <input
          id="password-input"
          className="pw-input"
          type="password"
          placeholder="Enter your password..."
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(null); }}
          onKeyDown={handleKeyDown}
          autoFocus
          autoComplete={isRegister ? "new-password" : "current-password"}
        />

        {/* Confirm password (register only) */}
        {isRegister && (
          <input
            id="confirm-password-input"
            className="pw-input"
            type="password"
            placeholder="Confirm your password..."
            value={confirm}
            onChange={(e) => { setConfirm(e.target.value); setError(null); }}
            onKeyDown={handleKeyDown}
            autoComplete="new-password"
          />
        )}

        {/* Error */}
        <p className="pw-error">{error || ""}</p>

        {/* Buttons */}
        {mounted && (
          <>
            <button
              id="btn-submit-password"
              className="btn-primary"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? "Signing in..." : isRegister ? "Create account" : "Sign in"}
            </button>

            <button
              id="btn-back-email"
              className="btn-back"
              onClick={() => router.push("/login/email")}
            >
              Back
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function PasswordPage() {
  return (
    <Suspense>
      <PasswordForm />
    </Suspense>
  );
}
