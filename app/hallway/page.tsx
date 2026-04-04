"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTimeTracking } from "../context/TimeContext";
import { useAuth } from "../context/AuthContext";
import AuthGuard from "../components/AuthGuard";

interface Corporate {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
}

/* ── User Avatar Component ── */
function UserAvatar({ name, avatar, size = 36, fontSize = 14 }: { name: string; avatar: string | null; size?: number; fontSize?: number; }) {
  if (avatar) {
    return (
      <img
        src={avatar}
        alt={name}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
      />
    );
  }
  const initials = name
    ? name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%", background: "white",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize, fontWeight: 700, color: "#1c1c1e", flexShrink: 0, letterSpacing: "-0.02em"
      }}
    >
      {initials}
    </div>
  );
}

/* ── Profile Modal ── */
function ProfileModal({ onClose }: { onClose: () => void }) {
  const { user, updateProfile, logout } = useAuth();
  const router = useRouter();
  const [name, setName] = useState(user?.name || "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar || null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await updateProfile({ name: name.trim() || user?.name, avatar: avatarPreview ?? undefined });
      onClose();
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 3000,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.6)", backdropFilter: "blur(3px)"
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#0d0d0f", border: "1px solid #373738", borderRadius: 20, padding: "40px 32px 32px",
          width: 480, display: "flex", flexDirection: "column", alignItems: "center",
          boxShadow: "0 20px 60px rgba(0,0,0,0.7)", animation: "popIn 0.18s ease"
        }}
      >
        <h3 style={{ color: "#e5e5ea", fontSize: 17, fontWeight: 600, marginBottom: 24, letterSpacing: "-0.01em" }}>Profile</h3>
        <div style={{ position: "relative", cursor: "pointer", marginBottom: 20 }} onClick={() => fileRef.current?.click()}>
          <UserAvatar name={name || user?.name || ""} avatar={avatarPreview} size={80} fontSize={28} />
          <div style={{ position: "absolute", bottom: 0, right: 0, width: 26, height: 26, borderRadius: "50%", background: "#3a3a3c", border: "2px solid #1d1d1f", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#e5e5ea" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" />
            </svg>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarChange} />
        </div>
        <p style={{ color: "#6b6b6b", fontSize: 12.5, marginBottom: 16 }}>{user?.email}</p>
        <input
          value={name} onChange={(e) => setName(e.target.value)} placeholder="Display name"
          style={{ width: "100%", height: 44, borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "#28282c", color: "#e5e5ea", fontSize: 14, padding: "0 14px", outline: "none", marginBottom: 8, boxSizing: "border-box" }}
        />
        {error && <p style={{ color: "#f87171", fontSize: 12.5, marginBottom: 8, alignSelf: "flex-start" }}>{error}</p>}
        <button onClick={handleSave} disabled={saving} style={{ width: "100%", height: 44, borderRadius: 8, border: "none", background: "#5e6ad2", color: "#fff", fontSize: 14, fontWeight: 500, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1, marginTop: 8, marginBottom: 10 }}>
          {saving ? "Saving..." : "Save changes"}
        </button>
        <button onClick={handleLogout} style={{ width: "100%", height: 40, borderRadius: 8, border: "none", background: "transparent", color: "#eb5555", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
          Log out
        </button>
      </div>
    </div>
  );
}

/* ── Create Corporate Modal ── */
function CreateCorporateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (c: Corporate) => void }) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!name.trim()) { setError("Please enter a name"); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/corporates", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() })
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      onCreated(data.corporate);
      onClose();
    } catch {
      setError("Failed to create. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(3px)" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#1d1d1f", borderRadius: 20, padding: "28px 24px 20px", width: 340, display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.7)", animation: "popIn 0.18s ease" }}>
        <h3 style={{ color: "#e5e5ea", fontSize: 17, fontWeight: 600, marginBottom: 16 }}>Create Corporate</h3>
        <input autoFocus value={name} onChange={(e) => { setName(e.target.value); setError(null); }} onKeyDown={(e) => e.key === "Enter" && handleCreate()} placeholder="Corporate name..." style={{ width: "100%", height: 44, borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "#28282c", color: "#e5e5ea", fontSize: 14, padding: "0 14px", outline: "none", marginBottom: 8, boxSizing: "border-box" }} />
        {error && <p style={{ color: "#f87171", fontSize: 12.5, marginBottom: 8 }}>{error}</p>}
        <button onClick={handleCreate} disabled={loading} style={{ width: "100%", height: 44, borderRadius: 8, border: "none", background: "#5e6ad2", color: "#fff", fontSize: 14, fontWeight: 500, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1, marginTop: 4, marginBottom: 10 }}>
          {loading ? "Creating..." : "Create"}
        </button>
        <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#8e8e93", fontSize: 13, cursor: "pointer", padding: "4px 0" }}>Cancel</button>
      </div>
    </div>
  );
}

function HallwayContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [corporates, setCorporates] = useState<Corporate[]>([]);
  const [showProfile, setShowProfile] = useState(false);
  const [showCreateCorp, setShowCreateCorp] = useState(false);

  useEffect(() => {
    fetch("/api/corporates")
      .then((r) => r.json())
      .then((data) => { if (data.corporates) setCorporates(data.corporates); })
      .catch(console.error);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0b0d] items-center">
      <style>{`
        @keyframes popIn { from { transform: scale(0.92); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .corp-card { position: relative; overflow: hidden; width: 100%; max-width: 453px; min-height: 100px; border-radius: 14px; background: #1d1d1f; cursor: pointer; border: 2px solid transparent; transition: all 0.2s; padding: 20px; box-sizing: border-box; }
        .corp-card:hover { border-color: rgba(255,255,255,0.08); background: #222225; }
        .add-btn { width: 36px; height: 36px; border-radius: 50%; border: 1.5px solid rgba(255,255,255,0.15); display: flex; alignItems: center; justifyContent: center; cursor: pointer; transition: all 0.15s; }
        .add-btn:hover { background: rgba(255,255,255,0.07); border-color: rgba(255,255,255,0.28); }
      `}</style>

      <header className="w-full h-[60px] flex items-center justify-center border-b border-white/[0.07] px-6 relative">
        <img src="/icons/logo.png" alt="Logo" className="h-10 object-contain" />
        <div className="absolute right-6 flex items-center gap-3">
          <button className="add-btn" title="Create corporate" onClick={() => setShowCreateCorp(true)}>
            <img src="/icons/plus.png" alt="+" style={{ width: 14, height: 14, opacity: 0.8 }} />
          </button>
          <button style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }} onClick={() => setShowProfile(true)}>
            <UserAvatar name={user?.name || ""} avatar={user?.avatar || null} size={36} />
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center pb-32 w-full gap-4 pt-10 px-4">
        {/* Personal Office */}
        <div onClick={() => router.push("/")} className="corp-card" style={{ height: "300px", display: "flex", flexDirection: "column" }}>
          <span style={{ display: "block", fontSize: 18, fontWeight: 500, color: "white", marginBottom: 6, zIndex: 10 }}>
            {user?.name ? `${user.name}'s Office` : "My Office"}
          </span>
          
          {/* Corporate Circle Logo Element inside Card */}
          <div 
            className="pointer-events-none absolute left-1/2 -translate-x-1/2 flex items-end justify-center z-0"
            style={{
              bottom: "-190px",
              width: "380px",
              height: "380px",
              borderRadius: "50%",
              background: "#121214",
              boxShadow: "0 0 15px 2px rgba(255,255,255,0.2)", // decreased shadow
              border: "5px solid rgba(255,255,255,0.8)",       // increased stroke
            }}
          >
            <div className="pb-[210px]">
              <img src="/icons/logo.png" alt="Corporate" className="w-[140px] h-auto object-contain" />
            </div>
          </div>
        </div>

        {/* Corporates */}
        {corporates.map((corp) => (
          <div key={corp.id} className="corp-card" style={{ height: "300px", display: "flex", flexDirection: "column" }} onClick={() => router.push(`/?corporateId=${corp.id}`)}>
            <div style={{ zIndex: 10, flex: 1 }}>
              <span style={{ display: "block", fontSize: 18, fontWeight: 500, color: "white", marginBottom: 6 }}>{corp.name}</span>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#6b6b6b" }}>Created {new Date(corp.createdAt).toLocaleDateString()}</span>
                <div style={{ display: "flex", gap: 12 }}>
                  <Link href={`/stats?corporateId=${corp.id}`} onClick={(e) => e.stopPropagation()}>
                    <img src="/icons/folder.png" alt="Stats" style={{ width: 16, height: 16, opacity: 0.5 }} />
                  </Link>
                </div>
              </div>
            </div>

            {/* Corporate Circle Logo Element inside Card */}
            <div 
              className="pointer-events-none absolute left-1/2 -translate-x-1/2 flex items-end justify-center z-0"
              style={{
                bottom: "-190px",
                width: "380px",
                height: "380px",
                borderRadius: "50%",
                background: "#121214",
                boxShadow: "0 0 15px 2px rgba(255,255,255,0.2)",
                border: "5px solid rgba(255,255,255,0.8)",
              }}
            >
              <div className="pb-[210px]">
                <img src="/icons/logo.png" alt="Corporate" className="w-[140px] h-auto object-contain" />
              </div>
            </div>

          </div>
        ))}

        {corporates.length === 0 && (
          <p style={{ color: "#3a3a3c", fontSize: 13, marginTop: 8 }}>Click + to create your first corporate</p>
        )}
      </div>

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
      {showCreateCorp && <CreateCorporateModal onClose={() => setShowCreateCorp(false)} onCreated={(c) => setCorporates([...corporates, c])} />}
    </div>
  );
}

export default function Hallway() {
  return (
    <AuthGuard>
      <HallwayContent />
    </AuthGuard>
  );
}
