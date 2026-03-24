"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTimeTracking } from "./context/TimeContext";
import { useAuth } from "./context/AuthContext";
import AuthGuard from "./components/AuthGuard";

type RoomId = string | null;

type UserStatus = 
  | { type: "online" }
  | { type: "return_today"; reason: string; time: string }
  | { type: "out_of_office"; reason: string; date: string };

interface Office {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  type?: "office" | "theater";
}

interface Floor {
  id: string;
  name: string;
  offices: Office[];
}

interface MapData {
  floors: Floor[];
}

/* ── SVG icons ── */
function IconDragHandle() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="5" cy="4" r="1.5" fill="#6b6b6b" />
      <circle cx="11" cy="4" r="1.5" fill="#6b6b6b" />
      <circle cx="5" cy="8" r="1.5" fill="#6b6b6b" />
      <circle cx="11" cy="8" r="1.5" fill="#6b6b6b" />
      <circle cx="5" cy="12" r="1.5" fill="#6b6b6b" />
      <circle cx="11" cy="12" r="1.5" fill="#6b6b6b" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b6b6b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function IconResize() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <line x1="21" y1="3" x2="14" y2="10" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  );
}

/* ── Guest Avatar ── */
function GuestAvatar({ 
  guest, 
  isHost, 
  onKick, 
  showDropdown, 
  onToggleDropdown,
  style,
}: { 
  guest: any;
  isHost: boolean;
  onKick: (id: string) => void;
  showDropdown: boolean;
  onToggleDropdown: (id: string | null) => void;
  style?: React.CSSProperties; 
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="relative">
      <div 
        className="animate-[popIn_0.18s_ease] cursor-pointer transition-all"
        onClick={(e) => {
          e.stopPropagation();
          if (isHost) onToggleDropdown(showDropdown ? null : guest.id);
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          border: `2px solid ${showDropdown ? "#3a82f7" : "#303236"}`,
          overflow: "hidden",
          background: "#1a191e",
          position: "relative",
          ...style,
        }}
      >
        <img src="/icons/guest.png" alt="Guest" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        {isHovered && isHost && (
          <div style={{ position: "absolute", inset: 0, background: "gray", opacity: 0.5 }} />
        )}
      </div>

      {showDropdown && (
        <div 
          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-[#252225] rounded-[10px] shadow-[0_8px_24px_rgba(0,0,0,0.5)] z-100 p-1 border border-white/5 animate-[popIn_0.12s_ease]"
          style={{ minWidth: 100 }}
        >
          <div 
            className="px-3 py-2 text-[13px] text-white hover:bg-white/5 rounded-[6px] transition-colors cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onKick(guest.id);
            }}
          >
            Kick
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Office card within canvas ── */
const MIN_SIZE = 60;
const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 450;

function OfficeCardCanvas({
  office,
  isEditMode,
  activeRoom,
  onEnter,
  onChange,
  onDelete,
  userStatus,
  officeGuests = [],
  isHost = false,
  onKickGuest,
  activeGuestDropdownId,
  onToggleGuestDropdown,
  isGuest,
  hostRoom,
}: {
  office: Office;
  isEditMode: boolean;
  activeRoom: RoomId;
  onEnter: (id: string) => void;
  onChange: (updated: Office) => void;
  onDelete: () => void;
  userStatus?: UserStatus;
  officeGuests?: any[];
  isHost?: boolean;
  onKickGuest: (id: string) => void;
  activeGuestDropdownId: string | null;
  onToggleGuestDropdown: (id: string | null) => void;
  isGuest?: boolean;
  hostRoom?: string | null;
}) {
  const [hovered, setHovered] = useState(false);
  const [nameValue, setNameValue] = useState(office.name);
  const nameRef = useRef<HTMLInputElement>(null);
  const isActive = activeRoom === office.id;

  // Sync internal name state when external changes
  useEffect(() => { setNameValue(office.name); }, [office.name]);

  /* ── Drag logic ── */
  const dragStart = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null);

  function onDragHandleMouseDown(e: React.MouseEvent) {
    if (!isEditMode) return;
    e.preventDefault();
    e.stopPropagation();
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: office.x, oy: office.y };

    function onMove(ev: MouseEvent) {
      if (!dragStart.current) return;
      const dx = ev.clientX - dragStart.current.mx;
      const dy = ev.clientY - dragStart.current.my;
      const newX = Math.max(0, Math.min(CANVAS_WIDTH - office.w, dragStart.current.ox + dx));
      const newY = Math.max(0, Math.min(CANVAS_HEIGHT - office.h, dragStart.current.oy + dy));
      onChange({ ...office, x: Math.round(newX), y: Math.round(newY) });
    }
    function onUp() {
      dragStart.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  /* ── Resize logic ── */
  const resizeStart = useRef<{ mx: number; my: number; ow: number; oh: number } | null>(null);

  function onResizeHandleMouseDown(e: React.MouseEvent) {
    if (!isEditMode) return;
    e.preventDefault();
    e.stopPropagation();
    resizeStart.current = { mx: e.clientX, my: e.clientY, ow: office.w, oh: office.h };

    function onMove(ev: MouseEvent) {
      if (!resizeStart.current) return;
      const dx = ev.clientX - resizeStart.current.mx;
      const dy = ev.clientY - resizeStart.current.my;
      const minW = office.type === "theater" ? 220 : MIN_SIZE;
      const minH = office.type === "theater" ? 220 : MIN_SIZE;
      const newW = Math.max(minW, Math.min(CANVAS_WIDTH - office.x, resizeStart.current.ow + dx));
      const newH = Math.max(minH, Math.min(CANVAS_HEIGHT - office.y, resizeStart.current.oh + dy));
      onChange({ ...office, w: Math.round(newW), h: Math.round(newH) });
    }
    function onUp() {
      resizeStart.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function handleNameChange(val: string) {
    setNameValue(val);
    onChange({ ...office, name: val });
  }

  return (
    <div
      onClick={() => { if (!isEditMode) onEnter(office.id); }}
      style={{
        position: "absolute",
        left: office.x,
        top: office.y,
        width: office.w,
        height: office.h,
        cursor: isEditMode ? "default" : "pointer",
        zIndex: isActive ? 10 : 1,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Card Background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "#1d1d1f",
          borderRadius: 14,
          border: `2px solid ${isActive ? "#3a82f7" : (hovered && isEditMode ? "transparent" : "transparent")}`,
          transition: "border-color 0.15s, background-color 0.15s",
        }}
      >
        {/* Name input (visible on hover in edit mode) */}
        {isEditMode && hovered && (
          <input
            ref={nameRef}
            value={nameValue}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Add Name"
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              right: 10,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "#e5e5ea",
              fontSize: 14,
              fontWeight: 500,
              fontFamily: "inherit",
              cursor: "text",
              zIndex: 2,
            }}
          />
        )}

        {/* Name display when not hovered (or not edit mode) */}
        {(!hovered || !isEditMode) && office.name && (
          <span
            style={{
              position: "absolute",
              top: 14,
              left: 14,
              right: 14,
              color: "#e5e5ea",
              fontSize: 15,
              fontWeight: 500,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              letterSpacing: "0.01em",
            }}
          >
            {office.name}
          </span>
        )}

        {office.type === "theater" && (
            <img src="/icons/theater.png" alt="theater" style={{ position: "absolute", top: 14, right: 14, width: 18, height: 18, pointerEvents: "none", opacity: 0.6 }} />
        )}

        {office.type === "theater" ? (
          <div style={{ position: "absolute", top: 46, left: 14, right: 14, bottom: 20, display: "flex", flexDirection: "column", gap: 48 }}>
             <div style={{ flex: 1, background: "#242425", borderRadius: 10, position: "relative" }}>
                 <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", display: "flex", gap: "8px", alignItems: "center" }}>
                    {(isActive || (isGuest && hostRoom === office.id)) && (
                      <UserAvatarRoom userStatus={userStatus} />
                    )}
                    {officeGuests.map((g) => (
                      <GuestAvatar 
                        key={g.id} 
                        guest={g} 
                        isHost={isHost} 
                        onKick={onKickGuest}
                        showDropdown={activeGuestDropdownId === g.id}
                        onToggleDropdown={onToggleGuestDropdown}
                      />
                    ))}
                  </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gridTemplateRows: "repeat(3, 1fr)", gap: 6, height: 50 }}>
                 {Array.from({ length: 15 }).map((_, i) => (
                    <div key={i} style={{ background: "#242425", borderRadius: 6 }} />
                 ))}
            </div>
          </div>
        ) : (
          <div style={{ position: "absolute", left: 14, top: 42, display: "flex", gap: "8px", alignItems: "center" }}>
            {(isActive || (isGuest && hostRoom === office.id)) && (
              <UserAvatarRoom userStatus={userStatus} />
            )}
            {officeGuests.map((g) => (
              <GuestAvatar 
                key={g.id} 
                guest={g} 
                isHost={isHost} 
                onKick={onKickGuest}
                showDropdown={activeGuestDropdownId === g.id}
                onToggleDropdown={onToggleGuestDropdown}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete button (top-right, hover in edit mode) */}
      {isEditMode && hovered && (
        <button
          onMouseDown={(e) => { e.stopPropagation(); onDelete(); }}
          style={{
            position: "absolute",
            top: -6,
            right: -6,
            width: 24,
            height: 24,
            borderRadius: "50%",
            background: "white",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
            boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
          }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#1c1c1e" strokeWidth="3" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}

      {/* Drag handle — 6 dots, bottom-center */}
      {isEditMode && (
        <div
          onMouseDown={onDragHandleMouseDown}
          style={{
            position: "absolute",
            bottom: 4,
            left: "50%",
            transform: "translateX(-50%)",
            cursor: "grab",
            zIndex: 5,
            padding: "4px 8px",
            borderRadius: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="20" height="12" viewBox="0 0 16 10" fill="none">
            <circle cx="4" cy="2" r="1.4" fill="#6b6b6b" />
            <circle cx="8" cy="2" r="1.4" fill="#6b6b6b" />
            <circle cx="12" cy="2" r="1.4" fill="#6b6b6b" />
            <circle cx="4" cy="8" r="1.4" fill="#6b6b6b" />
            <circle cx="8" cy="8" r="1.4" fill="#6b6b6b" />
            <circle cx="12" cy="8" r="1.4" fill="#6b6b6b" />
          </svg>
        </div>
      )}

      {/* Resize handle — bottom-right */}
      {isEditMode && (
        <div
          onMouseDown={onResizeHandleMouseDown}
          style={{
            position: "absolute",
            bottom: 2,
            right: 2,
            cursor: "se-resize",
            zIndex: 5,
            padding: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 4,
          }}
        >
          <IconResize />
        </div>
      )}
    </div>
  );
}

/* ── User avatar in room (reads from auth context) ── */
function UserAvatarRoom({ style, userStatus }: { style?: React.CSSProperties; userStatus?: UserStatus }) {
  const { user } = useAuth();
  if (!user) return null;
  const name = user?.name || "";
  const avatar = user?.avatar || null;

  if (userStatus?.type === "return_today") {
    let hourAngle = 0;
    let minAngle = 0;
    if (userStatus.time) {
       const match = userStatus.time.match(/(\d+):(\d+)\s*(AM|PM|am|pm)/);
       if (match) {
         let h = parseInt(match[1], 10);
         let m = parseInt(match[2], 10);
         if (h === 12) h = 0;
         hourAngle = (h * 30) + (m * 0.5);
         minAngle = m * 6;
       }
    }

    return (
      <div 
        className="animate-[popIn_0.18s_ease]"
        style={{ width: 44, height: 44, borderRadius: "50%", background: "#1a191e", border: "1.5px solid #303236", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", ...style }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="#e5e5ea" strokeWidth="2" />
          <line x1="12" y1="12" x2="12" y2="7.5" stroke="#e5e5ea" strokeWidth="2.5" strokeLinecap="round" transform={`rotate(${hourAngle} 12 12)`} />
          <line x1="12" y1="12" x2="12" y2="5" stroke="#e5e5ea" strokeWidth="2" strokeLinecap="round" transform={`rotate(${minAngle} 12 12)`} />
        </svg>
      </div>
    );
  }

  if (userStatus?.type === "out_of_office") {
    let dayText = "?";
    if (userStatus.date) {
      const parts = userStatus.date.split("-");
      if (parts.length === 3) {
        dayText = parseInt(parts[2], 10).toString();
      } else {
        const match = userStatus.date.match(/\d+/);
        if (match) dayText = match[0];
      }
    }
    return (
      <div 
        className="animate-[popIn_0.18s_ease]"
        style={{ width: 44, height: 44, borderRadius: "50%", background: "#1a191e", border: "1.5px solid #303236", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", ...style }}
      >
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e5e5ea" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          <span style={{ position: "absolute", top: 8, fontSize: 11, color: "#e5e5ea", fontWeight: "bold" }}>{dayText}</span>
        </div>
      </div>
    );
  }

  if (avatar) {
    return (
      <img
        src={avatar}
        alt={name}
        className="animate-[popIn_0.18s_ease]"
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          objectFit: "cover",
          ...style,
        }}
      />
    );
  }

  const initials = name
    ? name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  return (
    <div
      className="animate-[popIn_0.18s_ease]"
      style={{
        width: 44,
        height: 44,
        borderRadius: "50%",
        background: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 18,
        fontWeight: 700,
        color: "#1c1c1e",
        letterSpacing: "-0.02em",
        ...style,
      }}
    >
      {initials}
    </div>
  );
}

/* ── Profile Modal (inline in main page) ── */
function ProfileModal({
  user,
  onClose,
  isGuest,
  onGuestCreated,
}: {
  user: any;
  onClose: () => void;
  isGuest: boolean;
  onGuestCreated?: () => void;
}) {
  const router = useRouter();
  const { user: authUser, updateProfile, logout, register } = useAuth(); // Renamed to avoid shadowing
  const currentUser = user || authUser; // Use prop user if provided, else authUser
  const [name, setName] = useState(currentUser?.name || "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(currentUser?.avatar || null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPassword, setGuestPassword] = useState("");
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
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
      await updateProfile({ name: name.trim() || currentUser?.name, avatar: avatarPreview ?? undefined });
      onClose();
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleGuestRegister() {
    setRegisterError(null);
    const email = guestEmail.trim();
    if (!email) {
      setRegisterError("Email is required.");
      return;
    }
    if (!guestPassword || guestPassword.length < 6) {
      setRegisterError("Password must be at least 6 characters.");
      return;
    }

    setRegistering(true);
    try {
      await register(email, guestPassword);
      // Convert guest -> full user experience.
      if (typeof window !== "undefined") {
        localStorage.removeItem("virtualOffice_isGuest");
        localStorage.removeItem("virtualOffice_guestRoom");
      }
      onGuestCreated?.();
      onClose();
    } catch (err: unknown) {
      setRegisterError(err instanceof Error ? err.message : "Failed to create account.");
    } finally {
      setRegistering(false);
    }
  }

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  const displayName = name || currentUser?.name || "";
  const initials = displayName
    ? displayName.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 3000,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.6)", backdropFilter: "blur(3px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#0d0d0f", border: "1px solid #373738", borderRadius: 20, padding: "40px 32px 32px",
          width: 480, display: "flex", flexDirection: "column", alignItems: "center",
          boxShadow: "0 20px 60px rgba(0,0,0,0.7)", animation: "popIn 0.18s ease",
        }}
      >
        {isGuest ? (
          <>
            <h3 style={{ color: "#e5e5ea", fontSize: 17, fontWeight: 600, marginBottom: 24, letterSpacing: "-0.01em" }}>Create Account</h3>
            <p style={{ color: "#a0a0a5", fontSize: 13, marginBottom: 20, textAlign: "center" }}>Create an account to gain full access to the office, manage your profile, and post stories.</p>
            <input
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              placeholder="Email"
              style={{ width: "100%", height: 44, borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "#28282c", color: "#e5e5ea", fontSize: 14, fontFamily: "inherit", padding: "0 14px", outline: "none", marginBottom: 8, boxSizing: "border-box" }}
            />
            <input
              value={guestPassword}
              onChange={(e) => setGuestPassword(e.target.value)}
              type="password"
              placeholder="Password"
              style={{ width: "100%", height: 44, borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "#28282c", color: "#e5e5ea", fontSize: 14, fontFamily: "inherit", padding: "0 14px", outline: "none", marginBottom: 16, boxSizing: "border-box" }}
            />

            {registerError && <p style={{ color: "#f87171", fontSize: 12.5, marginBottom: 10, alignSelf: "flex-start" }}>{registerError}</p>}

            <button
              onClick={handleGuestRegister}
              disabled={registering || !guestEmail.trim() || guestPassword.length < 6}
              style={{
                width: "100%",
                height: 44,
                borderRadius: 8,
                border: "none",
                background: "#5e6ad2",
                color: "#fff",
                fontSize: 14,
                fontWeight: 500,
                fontFamily: "inherit",
                cursor: registering ? "not-allowed" : "pointer",
                transition: "opacity 0.15s",
                opacity: registering ? 0.6 : 1,
              }}
            >
              {registering ? "Creating..." : "Create Account"}
            </button>
          </>
        ) : (
          <>
            <h3 style={{ color: "#e5e5ea", fontSize: 17, fontWeight: 600, marginBottom: 24, letterSpacing: "-0.01em" }}>Profile</h3>

            {/* Avatar */}
            <div style={{ position: "relative", cursor: "pointer", marginBottom: 20 }} onClick={() => fileRef.current?.click()} title="Change photo">
              {avatarPreview ? (
                <img src={avatarPreview} alt={displayName} style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: 80, height: 80, borderRadius: "50%", background: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 700, color: "#1c1c1e" }}>
                  {initials}
                </div>
              )}
              <div style={{ position: "absolute", bottom: 0, right: 0, width: 26, height: 26, borderRadius: "50%", background: "#3a3a3c", border: "2px solid #1d1d1f", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#e5e5ea" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarChange} />
            </div>

            <p style={{ color: "#6b6b6b", fontSize: 12.5, marginBottom: 16 }}>{currentUser?.email}</p>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Display name"
              style={{ width: "100%", height: 44, borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "#28282c", color: "#e5e5ea", fontSize: 14, fontFamily: "inherit", padding: "0 14px", outline: "none", marginBottom: 8, boxSizing: "border-box" }}
            />

            {error && <p style={{ color: "#f87171", fontSize: 12.5, marginBottom: 8, alignSelf: "flex-start" }}>{error}</p>}

            <button
              onClick={handleSave}
              disabled={saving}
              style={{ width: "100%", height: 44, borderRadius: 8, border: "none", background: "#5e6ad2", color: "#fff", fontSize: 14, fontWeight: 500, fontFamily: "inherit", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1, marginTop: 8, marginBottom: 10, transition: "opacity 0.15s" }}
            >
              {saving ? "Saving..." : "Save changes"}
            </button>

            <button
              onClick={handleLogout}
              style={{ width: "100%", height: 40, borderRadius: 8, border: "none", background: "transparent", color: "#eb5555", fontSize: 13, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" }}
            >
              Log out
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Lobby Setup Modal ── */
function LobbySetupModal({ onClose, onContinue, corporateName }: { onClose: () => void, onContinue: (linkId: string) => void, corporateName: string }) {
  const [linkId, setLinkId] = useState<string | null>(null);

  function handleGenerate() {
    setLinkId(Math.random().toString(36).substring(2, 10));
  }
  
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 3000,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.6)", backdropFilter: "blur(3px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#1c1c1e", border: "1px solid #373738", borderRadius: 20, 
          width: 480, display: "flex", flexDirection: "column", overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.7)", animation: "popIn 0.18s ease",
        }}
      >
        <img src="/backgrounds/invite.png" alt="Invite Background" style={{ width: "100%", height: "auto", objectFit: "contain", display: "block" }} />
        <div style={{ padding: "32px", fontFamily: "var(--font-inter, Inter, sans-serif)", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <h3 style={{ color: "#e5e5ea", fontSize: 16, fontWeight: 600, marginBottom: 16, textAlign: "center" }}>Lobby</h3>
          <p style={{ color: "#a0a0a5", fontSize: 13, textAlign: "center", marginBottom: 12, lineHeight: 1.5 }}>
            Let your guests book time with you or instantly<br />drop in to visit, if you're available.
          </p>
          <p style={{ color: "#a0a0a5", fontSize: 13, textAlign: "center", marginBottom: 32, lineHeight: 1.5 }}>
            Pick your default Lobby Link on the office domain.<br />Then you can create additional sublinks and<br />configure them as you like.
          </p>
          
          <div style={{ width: "100%", marginBottom: 16 }}>
            <label style={{ display: "block", color: "#e5e5ea", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Choose Your Lobby Link</label>
            <div style={{ display: "flex", gap: "8px" }}>
              <div style={{ flex: 1, height: 44, borderRadius: 8, backgroundColor: "#28282c", border: "1px solid rgba(255,255,255,0.06)", color: linkId ? "#e5e5ea" : "#6b6b6b", fontSize: 12, display: "flex", alignItems: "center", padding: "0 14px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {linkId ? `${window.location.origin}/lobby/${linkId}` : "Click Generate"}
              </div>
              <button
                onClick={handleGenerate}
                style={{ height: 44, padding: "0 16px", borderRadius: 8, border: "1px solid #3a3a3c", background: "#28282c", color: "#e5e5ea", fontSize: 14, fontWeight: 500, cursor: "pointer", transition: "all 0.15s" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#3a3a3c"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#28282c"; }}
              >
                Generate
              </button>
            </div>
          </div>
          
          <button
            onClick={() => { if (linkId) onContinue(linkId); }}
            disabled={!linkId}
            style={{ width: "100%", height: 44, borderRadius: 8, border: "none", background: linkId ? "#ffffff" : "#3a3a3c", color: linkId ? "#000000" : "#a0a0a5", fontSize: 14, fontWeight: 500, cursor: linkId ? "pointer" : "not-allowed", transition: "all 0.15s" }}
            onMouseEnter={(e) => { if (linkId) e.currentTarget.style.opacity = "0.9"; }}
            onMouseLeave={(e) => { if (linkId) e.currentTarget.style.opacity = "1"; }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Event Setup Modal ── */
function EventSetupModal({ 
  onClose, 
  title, 
  setTitle, 
  eventDate, 
  setEventDate 
}: { 
  onClose: () => void; 
  title: string; 
  setTitle: (val: string) => void; 
  eventDate: string; 
  setEventDate: (val: string) => void; 
}) {
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch("/api/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, date: eventDate })
      });
      onClose();
    } catch (e) {
      console.error(e);
      setSaving(false);
    }
  }
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 3000,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.6)", backdropFilter: "blur(3px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#1c1c1e", border: "1px solid #373738", borderRadius: 20, 
          width: 480, display: "flex", flexDirection: "column", overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.7)", animation: "popIn 0.18s ease",
        }}
      >
        <img src="/backgrounds/event.png" alt="Event Background" style={{ width: "100%", height: "140px", objectFit: "cover", display: "block" }} />
        <div style={{ padding: "32px", fontFamily: "var(--font-inter, Inter, sans-serif)", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <h3 style={{ color: "#e5e5ea", fontSize: 16, fontWeight: 600, marginBottom: 24, textAlign: "center" }}>Event Settings</h3>
          
          <div style={{ width: "100%", marginBottom: 16 }}>
            <label style={{ display: "block", color: "#e5e5ea", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Event Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. On-Air: Designing the Future"
              style={{ width: "100%", height: 44, borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "#28282c", color: "#e5e5ea", fontSize: 14, padding: "0 14px", outline: "none", boxSizing: "border-box" }}
            />
          </div>
          
          <div style={{ width: "100%", marginBottom: 32 }}>
            <label style={{ display: "block", color: "#e5e5ea", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Event Date</label>
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="date-input-centered"
              style={{ width: "100%", height: 44, borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "#28282c", color: "#e5e5ea", fontSize: 14, padding: "0 14px", outline: "none", boxSizing: "border-box", fontFamily: "inherit", colorScheme: "dark" }}
            />
          </div>
          
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ width: "100%", height: 44, borderRadius: 8, border: "none", background: "#ffffff", color: "#000000", fontSize: 14, fontWeight: 500, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, transition: "all 0.15s" }}
            onMouseEnter={(e) => { if (!saving) e.currentTarget.style.opacity = "0.9"; }}
            onMouseLeave={(e) => { if (!saving) e.currentTarget.style.opacity = "1"; }}
          >
            {saving ? "Saving..." : "Save & Close"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main page ── */
function HomeContent() {
  const { activeOffice: activeRoom, startTracking, stopTracking } = useTimeTracking();
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveFlow, setLeaveFlow] = useState<"options" | "return_today" | "out_of_office">("options");
  const [userStatus, setUserStatus] = useState<UserStatus>({ type: "online" });
  
  // Return Today state
  const [returnTodayReason, setReturnTodayReason] = useState("Out to Lunch");
  const [returnTime, setReturnTime] = useState("");
  
  // Out of Office state
  const [outOfOfficeReason, setOutOfOfficeReason] = useState("On Vacation");
  const [returnDate, setReturnDate] = useState("");

  const [shelfImages, setShelfImages] = useState<string[]>([]);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [showAddRoomDropdown, setShowAddRoomDropdown] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showLobbyModal, setShowLobbyModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventTitle, setEventTitle] = useState("On-Air: Designing the Future");
  const [eventDate, setEventDate] = useState("");
  const [lobbyActive, setLobbyActive] = useState(false);

  useEffect(() => {
    fetch("/api/event")
      .then(res => res.json())
      .then(data => {
        if (data?.title) setEventTitle(data.title);
        if (data?.date !== undefined) setEventDate(data.date);
      })
      .catch(console.error);
  }, []);
  const [isEditMode, setIsEditMode] = useState(false);
  const [mapData, setMapData] = useState<MapData>({ floors: [] });
  const [isGuest, setIsGuest] = useState(false);
  const [lobbyLinkId, setLobbyLinkId] = useState<string | null>(null);
  const [lobbyGuestsCount, setLobbyGuestsCount] = useState(0);
  const [approvedGuests, setApprovedGuests] = useState<any[]>([]);
  const [activeGuestDropdownId, setActiveGuestDropdownId] = useState<string | null>(null);
  const [showCopiedBadge, setShowCopiedBadge] = useState(false);
  const [hostRoom, setHostRoom] = useState<string | null>(null);

  // Guest Heartbeat
  useEffect(() => {
    if (!isGuest) return;
    const guestId = localStorage.getItem("virtualOffice_guestId");
    if (!guestId) return;

    const interval = setInterval(() => {
      fetch("/api/lobby", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "heartbeat", guestId })
      }).catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, [isGuest]);

  useEffect(() => {
    // Check for guest state - ONLY once on mount
    if (typeof window === "undefined") return;
    const guestFlag = localStorage.getItem("virtualOffice_isGuest");
    if (guestFlag === "true") {
      const guestRoom = localStorage.getItem("virtualOffice_guestRoom");
      if (guestRoom && activeRoom === null) startTracking(guestRoom);
    }
  }, [startTracking, activeRoom]);

  useEffect(() => {
    fetch("/api/map")
      .then((res) => res.json())
      .then((data) => {
        if (data.floors) setMapData(data);
      })
      .catch((err) => console.error(err));
      
    // Poll lobby state
    const fetchLobby = () => {
      fetch("/api/lobby")
        .then((res) => res.json())
        .then((data) => {
          setLobbyActive(data.active);
          setLobbyLinkId(data.linkId);
          setLobbyGuestsCount(data.guests?.length || 0);
          setHostRoom(data.hostRoom);
          
          // Ensure unique guest IDs
          const unique: any[] = [];
          const seen = new Set();
          (data.approvedGuests || []).forEach((g: any) => {
            if (!seen.has(g.id)) {
              unique.push(g);
              seen.add(g.id);
            }
          });
          setApprovedGuests(unique);

          // Handle Guest Sync and Kick Exit
          if (isGuest) {
            const guestId = localStorage.getItem("virtualOffice_guestId");
            const gInApproved = unique.find(g => g.id === guestId);
            const gInWaiting = (data.guests || []).find((g: any) => g.id === guestId);

            if (!gInApproved && !gInWaiting && data.active) {
              // Guest was kicked or lobby closed
              localStorage.removeItem("virtualOffice_isGuest");
              localStorage.removeItem("virtualOffice_guestRoom");
              localStorage.removeItem("virtualOffice_guestId");
              window.location.href = "/404-kicked"; // Redirect out to a 404-like error
              return;
            }

            if (gInApproved && gInApproved.roomId !== activeRoom) {
              // Teleport guest to new room assigned by host
              localStorage.setItem("virtualOffice_guestRoom", gInApproved.roomId);
              startTracking(gInApproved.roomId);
            }
          }
        })
        .catch((err) => console.error(err));
    };
    fetchLobby();
    const intervalId = setInterval(fetchLobby, 2000);
    return () => clearInterval(intervalId);
  }, [isGuest, activeRoom, startTracking]);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Track which floor is selected
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const addRoomRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const corporateId = searchParams.get("corporateId");
  const { user } = useAuth();
  const [corporateName, setCorporateName] = useState(user?.name || "Your");

  useEffect(() => {
    // If a real user is logged in, they are NOT a guest.
    if (user) {
      setIsGuest(false);
      localStorage.removeItem("virtualOffice_isGuest");
      localStorage.removeItem("virtualOffice_guestRoom");
      localStorage.removeItem("virtualOffice_guestId");
      return;
    }
    setIsGuest(localStorage.getItem("virtualOffice_isGuest") === "true");
  }, [user, setIsGuest]);

  // Host Heartbeat (Broadcast real position to guests)
  useEffect(() => {
    if (isGuest || !user) return;
    
    const interval = setInterval(() => {
      fetch("/api/lobby", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "host_heartbeat", hostRoom: activeRoom })
      }).catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, [isGuest, user, activeRoom]);

  useEffect(() => {
    if (corporateId) {
      fetch("/api/corporates").then((r) => r.json()).then(data => {
        const corp = data.corporates?.find((c: any) => c.id === corporateId);
        if (corp) setCorporateName(corp.name);
      }).catch(() => {});
    }
  }, [corporateId]);

  // Pick the floor object based on ID, fallback to first floor
  const activeFloor = mapData.floors.find((f) => f.id === selectedFloorId) || mapData.floors[0] || null;

  // Load shelf images
  useEffect(() => {
    const savedImages = localStorage.getItem("shelfImages");
    const oldImage = localStorage.getItem("shelfImage");
    if (savedImages) {
      try { setShelfImages(JSON.parse(savedImages)); } catch { /* ignore */ }
    } else if (oldImage) {
      setShelfImages([oldImage]);
      localStorage.setItem("shelfImages", JSON.stringify([oldImage]));
      localStorage.removeItem("shelfImage");
    }
  }, []);

  // Load map data from API
  useEffect(() => {
    const url = corporateId ? `/api/map?corporateId=${corporateId}` : "/api/map";
    fetch(url)
      .then((r) => r.json())
      .then((data: MapData) => {
        setMapData(data);
        if (data.floors.length > 0) {
          // If the current selected floor name doesn't exist in new map, switch to first floor
          if (!selectedFloorId || !data.floors.find(f => f.id === selectedFloorId)) {
            setSelectedFloorId(data.floors[0].id);
          }
        }
      })
      .catch(console.error);
  }, [corporateId]);

  // Load Lobby state
  useEffect(() => {
    fetch("/api/lobby")
      .then((r) => r.json())
      .then((data) => setLobbyActive(data.active))
      .catch(console.error);
  }, []);

  // Default to reception if no active room
  useEffect(() => {
    if (typeof window !== "undefined") {
      const guestFlag = localStorage.getItem("virtualOffice_isGuest");
      if (guestFlag === "true") return;
    }
    if (activeRoom === null) startTracking("reception");
  }, [activeRoom, startTracking]);

  // Close settings dropdown when clicked outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettingsDropdown(false);
      }
    }
    if (showSettingsDropdown) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showSettingsDropdown]);

  // Close add room dropdown when clicked outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (addRoomRef.current && !addRoomRef.current.contains(e.target as Node)) {
        setShowAddRoomDropdown(false);
      }
    }
    if (showAddRoomDropdown) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showAddRoomDropdown]);

  // Close guest dropdown when clicked outside
  useEffect(() => {
    function handleClickOutside() {
      setActiveGuestDropdownId(null);
    }
    if (activeGuestDropdownId) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeGuestDropdownId]);

  function handleEnter(roomId: string) {
    if (activeRoom === roomId) return;
    if (roomId === "reception") {
      setUserStatus({ type: "online" });
    }
    startTracking(roomId);
  }

  function handleLobbyClick() {
    if (lobbyActive) {
      router.push("/lobby");
    } else {
      setShowLobbyModal(true);
    }
  }

  async function handleLobbyContinue(linkId: string) {
    try {
      await fetch("/api/lobby", {
        method: "POST",
        body: JSON.stringify({ action: "activate", linkId })
      });
      const fullUrl = `${window.location.origin}/lobby/${linkId}`;
      try {
        await navigator.clipboard.writeText(fullUrl);
      } catch (clipErr) {
        console.warn("Clipboard copy failed:", clipErr);
      }
      setShowLobbyModal(false);
      setLobbyActive(true);
    } catch (e) {
      console.error(e);
    }
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Str = event.target?.result as string;
        const newImages = [...shelfImages, base64Str];
        setShelfImages(newImages);
        localStorage.setItem("shelfImages", JSON.stringify(newImages));
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  }

  function handleRemoveImage(indexToRemove: number) {
    const newImages = shelfImages.filter((_, i) => i !== indexToRemove);
    setShelfImages(newImages);
    localStorage.setItem("shelfImages", JSON.stringify(newImages));
  }

  // ── Save Map Data ──
  async function saveMapData(newData: MapData) {
    setMapData(newData);
    try {
      await fetch("/api/map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newData),
      });
    } catch (e) {
      console.error("Failed to save map data", e);
    }
  }

  async function handleDoneEditing() {
    // Save map data explicitly using the current state
    await saveMapData(mapData);
    setIsEditMode(false);
  }

  async function handleKickGuest(guestId: string) {
    try {
      await fetch("/api/lobby", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "kick_guest", guestId })
      });
      setApprovedGuests(prev => prev.filter(g => g.id !== guestId));
      setActiveGuestDropdownId(null);
    } catch (e) { console.error(e); }
  }

  // ── Floor CRUD ──
  async function handleDeleteFloor(floorId: string) {
    const newData: MapData = {
      ...mapData,
      floors: mapData.floors.filter((f) => f.id !== floorId),
    };
    if (selectedFloorId === floorId) {
      setSelectedFloorId(newData.floors[0]?.id || null);
    }
    setMapData(newData);
  }

  async function handleAddFloor() {
    const newFloorId = `floor-${Date.now()}`;
    const newFloor: Floor = {
      id: newFloorId,
      name: "New Floor",
      offices: [],
    };
    const newData: MapData = { ...mapData, floors: [...mapData.floors, newFloor] };
    setMapData(newData);
    setSelectedFloorId(newFloorId);
  }

  function handleFloorNameChange(floorId: string, name: string) {
    setMapData((prev) => ({
      ...prev,
      floors: prev.floors.map((f) => (f.id === floorId ? { ...f, name } : f)),
    }));
  }

  // ── Office Add / Update ──
  function handleAddOffice(type: "office" | "theater") {
    setMapData((prev) => {
      if (!selectedFloorId) return prev;
      const isTheater = type === "theater";
      const newOffice: Office = {
        id: `office-${Date.now()}`,
        name: isTheater ? "Theater" : "",
        x: 0,
        y: 0,
        w: isTheater ? 240 : 120,
        h: isTheater ? 240 : 80,
        type,
      };
      return {
        ...prev,
        floors: prev.floors.map((f) =>
          f.id === selectedFloorId ? { ...f, offices: [...f.offices, newOffice] } : f
        ),
      };
    });
  }

  function handleUpdateOffice(updated: Office) {
    setMapData((prev) => {
      return {
        ...prev,
        floors: prev.floors.map((f) => ({
          ...f,
          offices: f.offices.map((o) => (o.id === updated.id ? updated : o)),
        })),
      };
    });
  }

  function handleDeleteOffice(officeId: string) {
    setMapData((prev) => ({
      ...prev,
      floors: prev.floors.map((f) => ({
        ...f,
        offices: f.offices.filter((o) => o.id !== officeId),
      })),
    }));
  }

  // ── Floor drag-to-reorder ──
  const dragIndexRef = useRef<number | null>(null);

  function handleDragStart(index: number) { dragIndexRef.current = index; }
  function handleDragOver(e: React.DragEvent, index: number) { e.preventDefault(); setDragOverIndex(index); }
  function handleDragLeave() { setDragOverIndex(null); }
  function handleDragEnd() { dragIndexRef.current = null; setDragOverIndex(null); }

  function handleDrop(index: number) {
    const from = dragIndexRef.current;
    if (from === null || from === index) { dragIndexRef.current = null; setDragOverIndex(null); return; }
    const newFloors = [...mapData.floors];
    const [moved] = newFloors.splice(from, 1);
    newFloors.splice(index, 0, moved);
    dragIndexRef.current = null;
    setDragOverIndex(null);
    setMapData({ ...mapData, floors: newFloors });
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0c0c0e] relative">
      <style>{`
        @keyframes popIn {
          from { transform: scale(0.6); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .nav-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 10px;
          color: #8e8e93;
          transition: color 0.15s, background 0.15s;
          cursor: pointer;
        }
        .nav-btn:hover { color: #e5e5ea; background: rgba(255,255,255,0.06); }
        .floor-row {
          background: #1d1d1f;
          border-radius: 10px;
          padding: 10px 12px;
          display: flex;
          align-items: flex-start;
          gap: 10px;
          user-select: none;
          transition: background 0.15s, border 0.15s;
          border: 1px solid transparent;
          cursor: pointer;
        }
        .floor-row.selected {
          background: #1e1f24;
        }
        .floor-row:hover:not(.selected) { background: #201e23; }
        .floor-row.drag-over { background: #2a2830; border: 1px dashed #555; }
        .trash-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 6px;
          transition: background 0.15s;
          cursor: pointer;
          flex-shrink: 0;
        }
        .trash-btn:hover { background: rgba(235, 85, 85, 0.15); }
        .trash-btn:hover svg { stroke: #eb5555; }
        .drag-handle {
          cursor: grab;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          opacity: 0.7;
          padding: 2px;
        }
        .drag-handle:active { cursor: grabbing; }
        .settings-dropdown {
          position: absolute;
          bottom: calc(100% + 8px);
          right: 0;
          background: #252225;
          border-radius: 10px;
          padding: 4px;
          min-width: 148px;
          animation: fadeIn 0.15s ease;
          z-index: 100;
          box-shadow: 0 8px 24px rgba(0,0,0,0.5);
        }
        .dropdown-item {
          padding: 8px 10px;
          border-radius: 6px;
          color: #e5e5ea;
          font-size: 13px;
          font-weight: 400;
          cursor: pointer;
          transition: background 0.12s;
          white-space: nowrap;
        }
        .dropdown-item:hover { background: #302e31; }
        .done-btn {
          background: #ffffff;
          color: #1c1c1e;
          border: none;
          border-radius: 10px;
          padding: 0 18px;
          height: 44px;
          font-family: var(--font-inter, Inter, sans-serif);
          font-weight: 500;
          font-size: 14px;
          cursor: pointer;
          transition: opacity 0.15s;
          white-space: nowrap;
        }
        .done-btn:hover { opacity: 0.85; }
        .add-floor-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 12px;
          border-radius: 10px;
          background: #1a191c;
          color: #9a9a9f;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          border: none;
          transition: background 0.15s, color 0.15s;
        }
        .add-floor-btn:hover { background: #222025; color: #e5e5ea; }
        .floor-name-input {
          background: transparent;
          border: none;
          outline: none;
          color: #e5e5ea;
          font-size: 14px;
          font-weight: 500;
          font-family: inherit;
          flex: 1;
          min-width: 0;
          cursor: text;
        }
        .floor-name-input::placeholder { color: #6b6b6b; }
      `}</style>

      {/* Header */}
      <header
        className="w-full h-12 flex items-center justify-center shrink-0"
        style={{ backgroundColor: "transparent", borderBottom: "1px solid rgba(255,255,255,0.12)" }}
      >
        <span className="text-[13px] font-medium tracking-[0.08em] uppercase text-[#e5e5ea]">
          Virtual Office
        </span>
      </header>

      {/* Main Content Area: Two Columns and Divider */}
      <main className="flex-1 flex overflow-hidden relative">

        {/* LEFT COLUMN — OFFICES CANVAS */}
        <div className="flex-1 overflow-y-auto flex flex-col items-center pt-8 pb-32">
          <div
            className="relative rounded-[16px] w-[1200px] border-none"
            style={{
              height: CANVAS_HEIGHT,
              background: "transparent",
              backgroundImage: isEditMode ? "radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)" : "none",
              backgroundSize: "20px 20px",
            }}
          >
            {activeFloor ? (
              activeFloor.offices.map((office) => (
                <OfficeCardCanvas
                  key={office.id}
                  office={office}
                  isEditMode={isEditMode}
                  activeRoom={activeRoom}
                  userStatus={userStatus}
                  officeGuests={approvedGuests.filter(g => g.roomId === office.id)}
                  isHost={!isGuest}
                  onKickGuest={handleKickGuest}
                  activeGuestDropdownId={activeGuestDropdownId}
                  onToggleGuestDropdown={setActiveGuestDropdownId}
                  onEnter={handleEnter}
                  onChange={handleUpdateOffice}
                  onDelete={() => handleDeleteOffice(office.id)}
                  isGuest={isGuest}
                  hostRoom={hostRoom}
                />
              ))
            ) : (
              isEditMode && (
                <div className="w-full h-full flex items-center justify-center text-[#555] text-sm">
                  Add a floor first
                </div>
              )
            )}
          </div>
        </div>

        {/* Vertical Divider with Add Room button */}
        <div className="w-px bg-white/12 self-stretch relative">
          {isEditMode && (
            <div
              ref={addRoomRef}
              style={{
                position: "absolute",
                top: 25,
                left: -80,
                transform: "translateX(-50%)",
                zIndex: 200,
              }}
            >
              <button
                onClick={() => activeFloor && setShowAddRoomDropdown((v) => !v)}
                disabled={!activeFloor}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "8px 16px",
                  borderRadius: 9999, // pill shape
                  background: showAddRoomDropdown ? "#28262c" : "#1e1d22",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: !activeFloor ? "#555" : "#e5e5ea",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: !activeFloor ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                  transition: "background 0.15s, box-shadow 0.15s",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => { if (activeFloor && !showAddRoomDropdown) (e.currentTarget as HTMLButtonElement).style.background = "#28262c"; }}
                onMouseLeave={(e) => { if (!showAddRoomDropdown) (e.currentTarget as HTMLButtonElement).style.background = "#1e1d22"; }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add Room
              </button>

              {showAddRoomDropdown && activeFloor && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: "50%",
                    transform: "translateX(-50%)",
                    marginTop: 8,
                    background: "#252225",
                    borderRadius: 10,
                    padding: 4,
                    minWidth: 120,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                    animation: "fadeIn 0.15s ease",
                  }}
                >
                  <div
                    className="dropdown-item"
                    onClick={() => { handleAddOffice("office"); setShowAddRoomDropdown(false); }}
                  >
                    Office
                  </div>
                  <div
                    className="dropdown-item"
                    onClick={() => { handleAddOffice("theater"); setShowAddRoomDropdown(false); }}
                  >
                    Theater
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN — FLOORS & RECEPTION */}
        <div className="w-[380px] shrink-0 overflow-y-auto flex flex-col items-center gap-6 pt-10 px-6 pb-32">
          
          {/* Event Card */}
          <div 
            onClick={() => setShowEventModal(true)}
            className="w-full rounded-[16px] overflow-hidden relative cursor-pointer border transition-colors"
            style={{ height: "140px", border: "1px solid rgba(255,255,255,0.06)", background: "#101012" }}
          >
            <div 
              className="absolute inset-0"
              style={{ backgroundImage: "url(/backgrounds/event.png)", backgroundSize: "100% 100%", backgroundPosition: "center", backgroundRepeat: "no-repeat" }}
            />
            
            <div className="absolute top-4 left-4 right-4 z-10 flex flex-col gap-1 pointer-events-none">
              <h3 className="text-white font-medium text-[14px] drop-shadow-md">{eventTitle}</h3>
              <div className="flex items-center gap-1.5 text-[#727171] mt-0.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                <span className="text-[11px] drop-shadow-sm">{eventDate ? new Date(eventDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : "Set event date..."}</span>
              </div>
              {eventDate && (
                <div className="flex items-center gap-1.5 text-[#727171] mt-0.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                  <span className="text-[11px] drop-shadow-sm font-medium">
                    {(() => {
                      const tgt = new Date(eventDate);
                      tgt.setHours(23, 59, 59, 999);
                      const diffDays = Math.ceil((tgt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                      if (diffDays < 0) return "Passed";
                      if (diffDays === 0) return "Today";
                      if (diffDays === 1) return "Tomorrow";
                      return `${diffDays} Days Left`;
                    })()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Lobby Card */}
          <div 
            onClick={handleLobbyClick}
            className="w-full rounded-[16px] overflow-hidden flex relative cursor-pointer transition-colors"
            style={{ height: "140px", border: "1px solid rgba(255,255,255,0.06)", background: "#1c1c1e" }}
          >
            <div 
              className="absolute inset-0"
              style={{ backgroundImage: "url(/backgrounds/lobby.png)", backgroundSize: "100% 100%", backgroundPosition: "center", backgroundRepeat: "no-repeat" }}
            />
            
            <div className="absolute inset-y-0 right-4 w-[60%] flex flex-col justify-center gap-1.5 bg-transparent z-10 pl-2">
               <div className="flex items-center gap-1.5 mb-0.5">
                 <span className="text-white font-medium text-[14px] drop-shadow-md">{corporateName}'s Lobby</span>
                 <svg width="12" height="12" viewBox="0 0 24 24" fill="#facc15" className="drop-shadow-sm"><path d="M12 2l3.09 3.09L19 5.91l-.82 4.18L21 13.18l-3.09 3.09L17 20.45l-4.18-.82L9.73 22l-3.09-3.09L5 18.09l.82-4.18L3 10.82l3.09-3.09L7 3.55l4.18.82L12 2z"></path><polyline points="9 12 11 14 15 10" stroke="#1d1d1f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"></polyline></svg>
               </div>
               
               <div 
                 className="flex items-center gap-2 text-[#727171] cursor-pointer hover:text-[#4a4a4a] transition-colors group relative"
                 onClick={(e) => {
                   e.stopPropagation();
                   if (lobbyActive && lobbyLinkId) {
                     const fullUrl = `${window.location.origin}/lobby/${lobbyLinkId}`;
                     const copyText = (text: string) => {
                       if (navigator.clipboard && window.isSecureContext) {
                         navigator.clipboard.writeText(text).then(() => {
                           setShowCopiedBadge(true);
                           setTimeout(() => setShowCopiedBadge(false), 2000);
                         }).catch(() => fallbackCopy(text));
                       } else {
                         fallbackCopy(text);
                       }
                     };
                     const fallbackCopy = (text: string) => {
                        const textArea = document.createElement("textarea");
                        textArea.value = text;
                        textArea.style.position = "fixed";
                        textArea.style.left = "-9999px";
                        textArea.style.top = "0";
                        document.body.appendChild(textArea);
                        textArea.focus();
                        textArea.select();
                        try {
                          document.execCommand('copy');
                          setShowCopiedBadge(true);
                          setTimeout(() => setShowCopiedBadge(false), 2000);
                        } catch (err) {
                          console.error('Fallback: Oops, unable to copy', err);
                        }
                        document.body.removeChild(textArea);
                     };
                     copyText(fullUrl);
                   }
                 }}
               >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                <span className="text-[11px] drop-shadow-sm">{lobbyActive && lobbyLinkId ? `office/lobby/${lobbyLinkId}` : "office/..."}</span>
                {showCopiedBadge && (
                  <span 
                    className="absolute -top-7 left-1/2 -translate-x-1/2 text-white text-[10px] px-2 py-0.5 rounded-[4px] animate-[popIn_0.15s_ease]"
                    style={{ backgroundColor: "rgba(128, 128, 128, 0.5)", backdropFilter: "blur(4px)" }}
                  >
                    Copied!
                  </span>
                )}
               </div>
               
               {lobbyActive && (
                 <div className="flex items-center gap-2 text-[#727171]">
                   <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                   <span className="text-[11px] drop-shadow-sm">{lobbyGuestsCount} Guest{lobbyGuestsCount !== 1 && 's'} Waiting</span>
                 </div>
               )}
               
               <div className="flex items-center gap-2 text-[#727171]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                <span className="text-[11px] drop-shadow-sm">Drop-ins</span>
                {lobbyActive ? (
                  <span className="ml-1 px-1.5 py-0.5 rounded-[4px] bg-[rgba(74,222,128,0.15)] text-[#4ade80] text-[9.5px] font-medium flex items-center gap-1 uppercase tracking-wider border border-[rgba(74,222,128,0.2)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80]"></span> OPEN
                  </span>
                ) : (
                  <span className="ml-1 px-1.5 py-0.5 rounded-[4px] bg-[rgba(235,85,85,0.15)] text-[#eb5555] text-[9.5px] font-medium flex items-center gap-1 uppercase tracking-wider border border-[rgba(235,85,85,0.2)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#eb5555]"></span> CLOSED
                  </span>
                )}
               </div>
            </div>
          </div>

          {/* Reception Card */}
          <div
            onClick={() => handleEnter("reception")}
            className={`w-full rounded-[16px] py-3 px-4 flex items-center justify-between group cursor-pointer border transition-colors duration-200 relative overflow-hidden
              ${activeRoom === "reception" ? "bg-[#18181a] border-[#3a82f7]" : "bg-[#18181a] border-[rgba(255,255,255,0.06)] hover:bg-[#202022] hover:border-white/20"}
            `}
          >
            {/* Dotted Background with Radial Fade */}
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: "radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px)",
                backgroundSize: "8px 8px",
                maskImage: "radial-gradient(ellipse at bottom, black 10%, transparent 80%)",
                WebkitMaskImage: "radial-gradient(ellipse at bottom, black 10%, transparent 80%)"
              }} 
            />
            
            <div className="flex items-center gap-3 relative z-10">
              <span className="text-[15px] font-medium text-[#e5e5ea]">Reception</span>
              <div className="flex items-center gap-2">
                {(activeRoom === "reception" || (isGuest && hostRoom === "reception")) && (
                  <UserAvatarRoom userStatus={userStatus} style={{ width: 28, height: 28, fontSize: 12 }} />
                )}
                {approvedGuests.filter(g => g.roomId === "reception").map(g => (
                  <GuestAvatar 
                    key={g.id} 
                    guest={g} 
                    isHost={!isGuest} 
                    onKick={handleKickGuest}
                    showDropdown={activeGuestDropdownId === g.id}
                    onToggleDropdown={setActiveGuestDropdownId}
                    style={{ width: 28, height: 28 }} 
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="w-full flex flex-col gap-2 relative mt-4">
            {mapData.floors.map((floor, index) => {
              const miniMapScale = 0.65;
              const containerWidth = 330;
              const miniOffices = floor.offices.length > 0 ? (
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    height: (CANVAS_HEIGHT / 1200) * containerWidth * miniMapScale,
                    background: "transparent",
                    overflow: "hidden",
                    marginTop: 6,
                  }}
                >
                  {floor.offices.map(o => {
                    const factor = (containerWidth * miniMapScale) / 1200;
                    const isOccupied = activeRoom === o.id;
                    return (
                      <div
                        key={o.id}
                        style={{
                          position: "absolute",
                          left: o.x * factor,
                          top: o.y * factor,
                          width: Math.max(o.w * factor, 8),
                          height: Math.max(o.h * factor, 8),
                          background: "#28272c",
                          borderRadius: 4,
                          border: isOccupied ? "1px solid #3a82f7" : "none",
                          display: "flex",
                          flexDirection: o.type === "theater" ? "column" : "row",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                          padding: o.type === "theater" ? 2 : 0,
                          gap: o.type === "theater" ? 6 : 0
                        }}
                      >
                       {o.type === "theater" ? (
                         <>
                           <div style={{ flex: 1, width: "100%", background: "#242425", borderRadius: 2, position: "relative" }}>
                             {isOccupied && (
                                 <div style={{
                                   position: "absolute",
                                   top: "50%",
                                   left: "50%",
                                   transform: "translate(-50%, -50%)",
                                   width: 6,
                                   height: 6,
                                   borderRadius: "50%",
                                   background: "white",
                                 }} />
                               )}
                           </div>
                           <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gridTemplateRows: "repeat(3, 1fr)", gap: 1, width: "100%", height: "30%" }}>
                              {Array.from({ length: 15 }).map((_, i) => (
                                <div key={i} style={{ background: "#242425", borderRadius: 1 }} />
                              ))}
                           </div>
                         </>
                       ) : (
                          isOccupied && (
                            <div style={{
                              width: 10,
                              height: 10,
                              borderRadius: "50%",
                              background: "white",
                              color: "#1c1c1e",
                              fontSize: "7px",
                              fontWeight: "bold",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center"
                            }}>R</div>
                          )
                       )}
                      </div>
                    );
                  })}
                </div>
              ) : null;


              return (
                <div
                  key={floor.id}
                  draggable={isEditMode}
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={() => handleDrop(index)}
                  onDragEnd={handleDragEnd}
                  onClick={() => setSelectedFloorId(floor.id)}
                  className={`floor-row ${dragOverIndex === index ? "drag-over" : ""} ${selectedFloorId === floor.id ? "selected" : ""}`}
                >
                  {isEditMode && (
                    <div className="drag-handle mt-[2px]"><IconDragHandle /></div>
                  )}

                  <div className="flex-1 flex flex-col pt-[2px]">
                    {isEditMode ? (
                      <input
                        className="floor-name-input"
                        value={floor.name}
                        onChange={(e) => handleFloorNameChange(floor.id, e.target.value)}
                        placeholder="Floor name"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span className="text-[14px] font-medium text-[#e5e5ea]">{floor.name}</span>
                    )}
                    {miniOffices}
                  </div>

                  {isEditMode && (
                    <button
                      className="trash-btn"
                      onClick={(e) => { e.stopPropagation(); handleDeleteFloor(floor.id); }}
                      aria-label="Delete floor"
                    >
                      <IconTrash />
                    </button>
                  )}
                </div>
              );
            })}

            {isEditMode && (
              <button className="add-floor-btn mt-2" onClick={handleAddFloor}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
                Add Floor
              </button>
            )}
          </div>
        </div>
      </main>

      {/* Shelf Section — centered based on whole webapp, pushed more down */}
      <div className="w-full flex flex-col items-center pb-28 absolute bottom-0 left-0 pointer-events-none">
        <div className="flex flex-col items-center w-[453px] relative pointer-events-auto">
          <div className={`flex ${shelfImages.length > 0 ? 'justify-start' : 'justify-center'} gap-4 -mb-1 relative z-10 w-full px-8`}>
            {shelfImages.map((imgSrc, index) => (
              <div key={index} className="w-[60px] h-[60px] rounded-[16px] bg-[#1e1d20] relative group shrink-0">
                <img src={imgSrc} alt={`Shelf item ${index + 1}`} className="w-full h-full object-cover rounded-[16px]" />
                <button
                  onClick={() => handleRemoveImage(index)}
                  className="absolute -top-2 -right-2 w-[22px] h-[22px] rounded-full bg-[#3a3a3c] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 hover:bg-[#4a4a4c] shadow-sm"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
            {shelfImages.length < 5 && (
              <label className="w-[60px] h-[60px] rounded-[16px] border-2 border-dashed border-[#8e8e8f60] bg-[#1e1d20] flex items-center justify-center cursor-pointer hover:bg-[#2a292d] transition-colors shrink-0">
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8e8e8f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </label>
            )}
          </div>
          <img src="/icons/shelf.png" alt="Shelf" className="w-full object-contain pointer-events-none" />
        </div>
      </div>

      {/* Floating bottom navigation */}
      <div
        style={{
          position: "fixed",
          bottom: "12px",
          left: "12px",
          right: "12px",
          height: "64px",
          backgroundColor: "#1d1d1f",
          border: "none",
          borderRadius: "14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          backdropFilter: "blur(12px)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          zIndex: 1000,
        }}
      >
        <button className="nav-btn" aria-label="Add" onClick={() => router.push("/story")}>
          <img src="/icons/plus.png" width={22} height={22} alt="Plus" className="brightness-0 invert" />
        </button>

        <button className="nav-btn" aria-label="Enter room" onClick={() => { setLeaveFlow("options"); setShowLeaveModal(true); }}>
          <img src="/icons/open_door.png" style={{ width: 28, height: 34, imageRendering: "pixelated" }} alt="Door" />
        </button>

        <div className="flex items-center gap-1">
          {isEditMode ? (
            <button className="done-btn" onClick={handleDoneEditing}>
              Done Editing Map
            </button>
          ) : (
            <>
              <button className="nav-btn" aria-label="Files" onClick={() => router.push("/stats")}>
                <img src="/icons/folder.png" width={22} height={22} alt="Folder" className="brightness-0 invert" />
              </button>
              <div ref={settingsRef} style={{ position: "relative" }}>
                <button
                  className="nav-btn"
                  aria-label="Settings"
                  onClick={() => setShowSettingsDropdown((v) => !v)}
                >
                  <img src="/icons/setting.png" width={22} height={22} alt="Settings" className="brightness-0 invert" />
                </button>
                {showSettingsDropdown && (
                  <div className="settings-dropdown">
                    {!isGuest && (
                      <div
                        className="dropdown-item"
                        onClick={() => {
                          setShowSettingsDropdown(false);
                          setIsEditMode(true);
                        }}
                      >
                        Edit Map
                      </div>
                    )}
                    <div
                      className="dropdown-item"
                      onClick={() => {
                        setShowSettingsDropdown(false);
                        setShowProfileModal(true);
                      }}
                    >
                      Profile
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Leave Office Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-[2px] font-sans font-normal">
          {leaveFlow === "options" && (
            <div className="w-[420px] bg-[#1d1d1f] rounded-[24px] p-6 flex flex-col items-center shadow-2xl animate-[popIn_0.15s_ease]">
              <div className="w-[42px] h-[42px] rounded-full bg-white/10 flex items-center justify-center mb-6 text-white">
                <img src="/icons/open_door.png" width={24} height={24} alt="Door" className="brightness-0 invert" />
              </div>
              <div className="w-full flex flex-col gap-3">
                <button
                  onClick={() => setShowLeaveModal(false)}
                  className="w-full min-h-[52px] bg-white text-[#1c1c1e] text-[16px] font-medium rounded-[12px] flex items-center justify-center transition-opacity hover:opacity-90"
                >
                  No, missclick!
                </button>
                <div className="flex flex-col gap-2 w-full mt-2">
                  <button
                    onClick={() => setLeaveFlow("return_today")}
                    className="w-full min-h-[52px] bg-[#26282c] border border-[rgba(255,255,255,0.05)] text-[#e5e5ea] text-[15px] rounded-[12px] flex items-center px-5 transition-colors hover:bg-[#303236]"
                  >
                    <span className="flex-1 text-left">Will Return Today</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-40"><polyline points="9 18 15 12 9 6"></polyline></svg>
                  </button>
                  <button
                    onClick={() => setLeaveFlow("out_of_office")}
                    className="w-full min-h-[52px] bg-[#26282c] border border-[rgba(255,255,255,0.05)] text-[#e5e5ea] text-[15px] rounded-[12px] flex items-center px-5 transition-colors hover:bg-[#303236]"
                  >
                    <span className="flex-1 text-left">Out of Office</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-40"><polyline points="9 18 15 12 9 6"></polyline></svg>
                  </button>
                </div>
                <button
                  onClick={() => {
                    stopTracking();
                    setUserStatus({ type: "online" });
                    router.push('/hallway');
                  }}
                  className="w-full min-h-[52px] bg-[#eb5555] text-white text-[16px] font-medium rounded-[12px] flex items-center justify-center mt-2 transition-colors hover:bg-[#d94f4f]"
                >
                  Yes, I need to go.
                </button>
              </div>
            </div>
          )}

          {leaveFlow === "return_today" && (
            <div className="w-[280px] bg-[#222224] border border-[#303236] rounded-[24px] p-4 flex flex-col shadow-2xl animate-[popIn_0.15s_ease]">
              <div className="flex items-center gap-3 mb-4 cursor-pointer" onClick={() => setLeaveFlow("options")}>
                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                 <span className="text-[14px] text-[#8e8e93] font-medium">Back</span>
              </div>
              <div className="flex flex-col gap-1 mb-4">
                {[
                  { label: "Out to Lunch", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7.5L21 3l-4.5 18-13.5-13.5z"/><circle cx="11.5" cy="11.5" r="1.5"/><circle cx="15.5" cy="8.5" r="1.5"/></svg> },
                  { label: "In-Person Meeting", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg> },
                  { label: "Other", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> }
                ].map(opt => (
                  <div key={opt.label} onClick={() => setReturnTodayReason(opt.label)} className="flex items-center gap-3 p-3 rounded-[10px] cursor-pointer hover:bg-white/5 transition-colors">
                    <div className="text-[#a0a0a5] shrink-0">{opt.icon}</div>
                    <span className="flex-1 text-[14px] text-[#e5e5ea]">{opt.label}</span>
                    <div className={`w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center shrink-0 ${returnTodayReason === opt.label ? "border-[#3a82f7] bg-[#3a82f7]" : "border-[#6b6b6b]"}`}>
                       {returnTodayReason === opt.label && <div className="w-2 h-2 rounded-full bg-white"></div>}
                    </div>
                  </div>
                ))}
              </div>
              <div className="w-full bg-[#303236] rounded-[10px] p-1 flex relative mb-3 overflow-hidden" style={{ minHeight: "44px" }}>
                 <select 
                   value={returnTime} 
                   onChange={(e) => setReturnTime(e.target.value)} 
                   className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                 >
                   <option value="" disabled>Choose Return Time</option>
                   <option value="12:00 PM">12:00 PM</option>
                   <option value="1:00 PM">1:00 PM</option>
                   <option value="2:00 PM">2:00 PM</option>
                   <option value="3:00 PM">3:00 PM</option>
                   <option value="4:00 PM">4:00 PM</option>
                   <option value="5:00 PM">5:00 PM</option>
                 </select>
                 <div className="flex-1 flex items-center justify-between pointer-events-none px-4 text-[#e5e5ea] text-[14px]">
                    {returnTime || <span className="text-[#a0a0a5]">Choose Return Time</span>}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a0a0a5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                 </div>
              </div>
              <button
                onClick={() => {
                  setUserStatus({ type: "return_today", reason: returnTodayReason, time: returnTime || "1:00 PM" });
                  setShowLeaveModal(false);
                }}
                className="w-full min-h-[44px] bg-white text-[#1c1c1e] text-[14px] font-medium rounded-[14px] transition-opacity hover:opacity-90 mt-1"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                Save
              </button>
            </div>
          )}

          {leaveFlow === "out_of_office" && (
            <div className="w-[280px] bg-[#222224] border border-[#303236] rounded-[24px] p-4 flex flex-col shadow-2xl animate-[popIn_0.15s_ease]">
              <div className="flex items-center gap-3 mb-4 cursor-pointer" onClick={() => setLeaveFlow("options")}>
                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                 <span className="text-[14px] text-[#8e8e93] font-medium">Back</span>
              </div>
              <div className="flex flex-col gap-1 mb-6">
                {[
                  { label: "On Vacation", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg> },
                  { label: "Set Your Message", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> }
                ].map(opt => (
                  <div key={opt.label} onClick={() => setOutOfOfficeReason(opt.label)} className="flex items-center gap-3 p-3 rounded-[10px] cursor-pointer hover:bg-white/5 transition-colors">
                     <div className="text-[#a0a0a5] shrink-0">{opt.icon}</div>
                     <span className="flex-1 text-[14px] text-[#e5e5ea]">{opt.label}</span>
                     <div className={`w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center shrink-0 ${outOfOfficeReason === opt.label ? "border-[#3a82f7] bg-[#3a82f7]" : "border-[#6b6b6b]"}`}>
                        {outOfOfficeReason === opt.label && <div className="w-2 h-2 rounded-full bg-white"></div>}
                     </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-1.5 mb-3">
                 <span className="text-[12px] text-[#8e8e93] px-1 font-medium">Return Date</span>
                 <input 
                   type="date" 
                   value={returnDate}
                   onChange={(e) => setReturnDate(e.target.value)}
                   className="w-full min-h-[44px] bg-[#303236] border-none text-[#e5e5ea] text-[14px] rounded-[10px] px-4 outline-none date-input-centered"
                   style={{ fontFamily: 'inherit' }}
                 />
              </div>
              <button
                onClick={() => {
                  setUserStatus({ type: "out_of_office", reason: outOfOfficeReason, date: returnDate || "01/01/2026" });
                  setShowLeaveModal(false);
                }}
                className="w-full min-h-[44px] bg-white text-[#1c1c1e] text-[14px] font-medium rounded-[14px] transition-opacity hover:opacity-90 mt-1"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                Save
              </button>
            </div>
          )}

        </div>
      )}

      {/* Profile modal */}
      {showProfileModal && (
        <ProfileModal
          user={user}
          isGuest={isGuest}
          onClose={() => setShowProfileModal(false)}
          onGuestCreated={() => setIsGuest(false)}
        />
      )}
      
      {/* Lobby modal */}
      {showLobbyModal && (
        <LobbySetupModal 
          onClose={() => setShowLobbyModal(false)} 
          onContinue={handleLobbyContinue} 
          corporateName={corporateName} 
        />
      )}

      {/* Event modal */}
      {showEventModal && (
        <EventSetupModal
          onClose={() => setShowEventModal(false)}
          title={eventTitle}
          setTitle={setEventTitle}
          eventDate={eventDate}
          setEventDate={setEventDate}
        />
      )}
    </div>
  );
}

export default function Home() {
  return (
    <AuthGuard>
      <Suspense fallback={null}>
        <HomeContent />
      </Suspense>
    </AuthGuard>
  );
}
