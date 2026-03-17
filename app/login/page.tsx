"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/hallway");
    }
  }, [user, loading, router]);

  if (loading) return null;

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
        .login-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0;
          animation: fadeSlideUp 0.35s ease;
        }
        .login-title {
          color: #e5e5ea;
          font-size: 18px;
          font-weight: 500;
          margin-bottom: 28px;
          letter-spacing: -0.01em;
        }
        .login-btn {
          width: 320px;
          height: 44px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.12);
          background: #1a191e;
          color: #e5e5ea;
          font-size: 14px;
          font-weight: 500;
          font-family: inherit;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          letter-spacing: 0.01em;
        }
        .login-btn:hover {
          background: #232129;
          border-color: rgba(255,255,255,0.18);
        }
        .login-btn.primary {
          background: #5e6ad2;
          border-color: transparent;
          color: #fff;
        }
        .login-btn.primary:hover {
          background: #6b76e0;
        }
      `}</style>

      <div className="login-container">
        {/* Logo */}
        <img
          src="/icons/logo.png"
          alt="Virtual Office"
          style={{ width: 44, height: 44, objectFit: "contain", marginBottom: 20 }}
        />

        {/* Title */}
        <p className="login-title">Log in to Virtual Office</p>

        {/* Single option: Continue with email */}
        <button
          id="btn-continue-email"
          className="login-btn primary"
          onClick={() => router.push("/login/email")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="M2 8l10 6 10-6" />
          </svg>
          Continue with email
        </button>
      </div>
    </div>
  );
}
