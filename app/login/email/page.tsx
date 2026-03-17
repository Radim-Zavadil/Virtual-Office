"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function EmailPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  async function handleContinue() {
    if (!isValidEmail(email)) {
      setError(email.trim() ? email.trim() : "");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      const mode = data.exists ? "login" : "register";
      router.push(`/login/password?email=${encodeURIComponent(email.trim())}&mode=${mode}`);
    } catch {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleContinue();
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
        .email-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0;
          animation: fadeSlideUp 0.35s ease;
          width: 320px;
        }
        .email-title {
          color: #e5e5ea;
          font-size: 18px;
          font-weight: 500;
          margin-bottom: 20px;
          letter-spacing: -0.01em;
          text-align: center;
        }
        .email-input {
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
          margin-bottom: 4px;
        }
        .email-input::placeholder { color: #555; }
        .email-input:focus { border-color: rgba(255,255,255,0.28); }
        .email-error {
          color: #f87171;
          font-size: 12.5px;
          margin-bottom: 12px;
          align-self: flex-start;
          min-height: 18px;
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

      <div className="email-container">
        {/* Logo */}
        <img
          src="/icons/logo.png"
          alt="Virtual Office"
          style={{ width: 44, height: 44, objectFit: "contain", marginBottom: 20 }}
        />

        {/* Title */}
        <p className="email-title">What's your email address?</p>

        {/* Email input */}
        <input
          id="email-input"
          className="email-input"
          type="email"
          placeholder="Enter your email address..."
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(null); }}
          onKeyDown={handleKeyDown}
          autoFocus
          autoComplete="email"
        />

        {/* Validation error message */}
        <p className="email-error">
          {error !== null
            ? `Please enter an email address${error ? ` for ${error}` : ""}`
            : ""}
        </p>

        {/* Buttons — appear with smooth animation */}
        {mounted && (
          <>
            <button
              id="btn-continue-email"
              className="btn-primary"
              onClick={handleContinue}
              disabled={loading}
            >
              {loading ? "Checking..." : "Continue with email"}
            </button>

            <button
              id="btn-back-login"
              className="btn-back"
              onClick={() => router.push("/login")}
            >
              Back to login
            </button>
          </>
        )}
      </div>
    </div>
  );
}
