"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTimeTracking } from "./context/TimeContext";

type RoomId = "personal" | "hangout" | "reception" | null;

function RoomCard({
  title,
  roomId,
  activeRoom,
  height,
  avatarBottom,
  onEnter,
}: {
  title: string;
  roomId: RoomId;
  activeRoom: RoomId;
  height: string;
  avatarBottom?: boolean;
  onEnter: (id: RoomId) => void;
}) {
  const isActive = activeRoom === roomId;

  return (
    <div
      onClick={() => onEnter(roomId)}
      className={`
        relative w-[453px] rounded-[14px] bg-[#1d1d1f] cursor-pointer select-none
        border-2 transition-colors duration-200
        ${isActive ? "border-[#3a82f7]" : "border-transparent"}
        ${height}
      `}
    >
      <span className="absolute top-[14px] left-[14px] text-[15px] font-medium text-[#e5e5ea] tracking-[0.01em]">
        {title}
      </span>

      {isActive && (
        <div
          className={`
            absolute left-[14px]
            ${avatarBottom ? "bottom-[14px]" : "top-[38px]"}
          `}
        >
          <div
            className="
              w-11 h-11 rounded-full bg-white flex items-center justify-center
              text-[18px] font-semibold text-[#1c1c1e]
              animate-[popIn_0.18s_ease]
            "
          >
            R
          </div>
        </div>
      )}
    </div>
  );
}

/* ── SVG icons ── */
function IconPlus() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconDoor() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 4H6a2 2 0 0 0-2 2v14" />
      <path d="M2 20h20" />
      <rect x="10" y="4" width="10" height="16" rx="1" />
      <circle cx="16" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconFolder() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconHistory() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  );
}

export default function Home() {
  const { activeOffice: activeRoom, startTracking, stopTracking } = useTimeTracking();
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [shelfImages, setShelfImages] = useState<string[]>([]);
  const router = useRouter();

  // Load shelf images from local storage on mount
  useEffect(() => {
    const savedImages = localStorage.getItem("shelfImages");
    const oldImage = localStorage.getItem("shelfImage"); // Fallback for previous single image
    if (savedImages) {
      try {
        setShelfImages(JSON.parse(savedImages));
      } catch (e) {
        console.error("Failed to parse shelf images");
      }
    } else if (oldImage) {
      setShelfImages([oldImage]);
      localStorage.setItem("shelfImages", JSON.stringify([oldImage]));
      localStorage.removeItem("shelfImage");
    }
  }, []);

  // If there's no active room on mount, default to reception
  useEffect(() => {
    if (activeRoom === null) {
      startTracking("reception");
    }
  }, []);

  function handleEnter(roomId: RoomId) {
    if (activeRoom === roomId) return;
    startTracking(roomId);
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
    const newImages = shelfImages.filter((_, index) => index !== indexToRemove);
    setShelfImages(newImages);
    localStorage.setItem("shelfImages", JSON.stringify(newImages));
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0b0d] relative">
      <style>{`
        @keyframes popIn {
          from { transform: scale(0.6); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
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
        .nav-btn:hover {
          color: #e5e5ea;
          background: rgba(255,255,255,0.06);
        }
      `}</style>

      {/* Header — transparent bg + grey bottom border */}
      <header
        className="w-full h-12 flex items-center justify-center shrink-0"
        style={{
          backgroundColor: "transparent",
          borderBottom: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        <span className="text-[13px] font-medium tracking-[0.08em] uppercase text-[#e5e5ea]">
          Virtual Office
        </span>
      </header>

      {/* Main Content Area: Two Columns */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Column — Offices */}
        <div className="flex-1 overflow-y-auto flex flex-col items-center pt-10 pb-32">
          <div className="flex flex-col items-center gap-3 w-full">
            <RoomCard
              title="Radim Zavadil"
              roomId="personal"
              activeRoom={activeRoom}
              height="h-[100px]"
              avatarBottom
              onEnter={handleEnter}
            />
            <RoomCard
              title="Hangout / Team Room"
              roomId="hangout"
              activeRoom={activeRoom}
              height="h-[160px]"
              onEnter={handleEnter}
            />
          </div>

          {/* Shelf Section Pushed to Bottom */}
          <div className="mt-auto pt-8 flex flex-col items-center w-[453px] relative shrink-0">
            {/* Added items flex container */}
            <div className={`flex ${shelfImages.length > 0 ? 'justify-start' : 'justify-center'} gap-4 -mb-1 relative z-10 w-full px-8`}>
              {shelfImages.map((imgSrc, index) => (
                <div key={index} className="w-[60px] h-[60px] rounded-[16px] bg-[#1e1d20] relative group shrink-0">
                  <img src={imgSrc} alt={`Shelf item ${index + 1}`} className="w-full h-full object-cover rounded-[16px]" />
                  {/* Delete button (small white cross in grey circle in top right corner) */}
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
              
              {/* Adding item square */}
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

            {/* Shelf Image */}
            <img src="/icons/shelf.png" alt="Shelf" className="w-full object-contain pointer-events-none" />
          </div>
        </div>

        {/* Vertical Divider */}
        <div className="w-[1px] bg-white/[0.12] self-stretch" />

        {/* Right Column — Reception & Floor Plan */}
        <div className="w-[380px] shrink-0 overflow-y-auto flex flex-col items-center gap-6 pt-10 px-6 pb-32">
          {/* Reception Card */}
          <div
            onClick={() => handleEnter("reception")}
            className={`w-full rounded-[16px] p-4 flex items-center justify-between group cursor-pointer border-2 transition-colors duration-200
              ${activeRoom === "reception" ? "bg-[#1d1d1f] border-[#3a82f7]" : "bg-[#1d1d1f] border-transparent hover:bg-[#252528]"}
            `}
          >
            <div className="flex items-center gap-3">
              <span className="text-[15px] font-medium text-[#e5e5ea]">Reception</span>
              {activeRoom === "reception" && (
                <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-[12px] font-semibold text-[#1c1c1e] animate-[popIn_0.18s_ease]">
                  R
                </div>
              )}
            </div>
          </div>

          {/* Floor Plan Overview (Real layout projection) */}
          <div className="w-full">
            <div className="w-full rounded-[18px] bg-[#1d1d1f] p-4 flex flex-col items-center gap-2">
              <div className="text-[15px] font-medium text-[#e5e5ea] mb-2 w-full ml-1">Core Team</div>

              {/* Personal Office Mini */}
              <div className={`w-[43%] h-[40px] rounded-md bg-[#28272c] relative border-2 transition-colors
                ${activeRoom === "personal" ? "border-[#3a82f7]" : "border-transparent"}`}
              >
                {activeRoom === "personal" && (
                  <div className="absolute bottom-1.5 left-1.5 w-[18px] h-[18px] rounded-full bg-white flex items-center justify-center text-[10px] font-bold text-[#1c1c1e]">R</div>
                )}
              </div>

              {/* Hangout Room Mini */}
              <div className={`w-[43%] h-[64px] rounded-md bg-[#28272c] relative border-2 transition-colors
                ${activeRoom === "hangout" ? "border-[#3a82f7]" : "border-transparent"}`}
              >
                {activeRoom === "hangout" && (
                  <div className="absolute top-1.5 left-1.5 w-[18px] h-[18px] rounded-full bg-white flex items-center justify-center text-[10px] font-bold text-[#1c1c1e]">R</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

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
        }}
      >
        {/* Left — Plus */}
        <button className="nav-btn" aria-label="Add">
          <img src="/icons/plus.png" width={22} height={22} alt="Plus" className="brightness-0 invert" />
        </button>

        {/* Centre — Open Door */}
        <button className="nav-btn" aria-label="Enter room" onClick={() => setShowLeaveModal(true)}>
          <img src="/icons/open_door.png" width={22} height={22} alt="Door" className="brightness-0 invert" />
        </button>

        {/* Right — Folder */}
        <button className="nav-btn" aria-label="Files" onClick={() => router.push("/stats")}>
          <img src="/icons/folder.png" width={22} height={22} alt="Folder" className="brightness-0 invert" />
        </button>
      </div>

      {/* Leave Office Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] font-sans font-normal">
          <div className="w-[420px] bg-[#1d1d1f] rounded-[24px] p-6 flex flex-col items-center shadow-2xl animate-[popIn_0.15s_ease]">
            <div className="w-[42px] h-[42px] rounded-full bg-white/10 flex items-center justify-center mb-4 text-white">
              <img src="/icons/open_door.png" width={24} height={24} alt="Door" className="brightness-0 invert" />
            </div>
            <h3 className="text-[18px] text-[#e5e5ea] mb-6 text-center tracking-wide">Are you leaving office?</h3>

            <div className="w-full flex flex-col gap-3">
              <button
                onClick={() => setShowLeaveModal(false)}
                className="w-full min-h-[52px] bg-white text-[#1c1c1e] text-[16px] rounded-[12px] flex items-center justify-center transition-opacity hover:opacity-90"
              >
                No, missclick!
              </button>
              <button
                onClick={() => {
                  stopTracking();
                  router.push('/hallway');
                }}
                className="w-full min-h-[52px] bg-[#eb5555] text-white text-[16px] rounded-[12px] flex items-center justify-center transition-colors hover:bg-[#d94f4f] relative"
              >
                Yes, I need to go.
                <svg className="absolute right-4" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
