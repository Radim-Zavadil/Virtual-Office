"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTimeTracking } from "./context/TimeContext";

type RoomId = "personal" | "hangout" | "reception" | null;

interface Office {
  id: string;
  name: string;
}

interface Floor {
  id: string;
  name: string;
  offices: Office[];
}

interface MapData {
  floors: Floor[];
}

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

export default function Home() {
  const { activeOffice: activeRoom, startTracking, stopTracking } = useTimeTracking();
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [shelfImages, setShelfImages] = useState<string[]>([]);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [mapData, setMapData] = useState<MapData>({ floors: [] });
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Load shelf images from local storage on mount
  useEffect(() => {
    const savedImages = localStorage.getItem("shelfImages");
    const oldImage = localStorage.getItem("shelfImage");
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

  // Load map data from API
  useEffect(() => {
    fetch("/api/map")
      .then((r) => r.json())
      .then((data: MapData) => setMapData(data))
      .catch(console.error);
  }, []);

  // If there's no active room on mount, default to reception
  useEffect(() => {
    if (activeRoom === null) {
      startTracking("reception");
    }
  }, []);

  // Close settings dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettingsDropdown(false);
      }
    }
    if (showSettingsDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showSettingsDropdown]);

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

  async function handleDeleteFloor(floorId: string) {
    const newData: MapData = {
      ...mapData,
      floors: mapData.floors.filter((f) => f.id !== floorId),
    };
    await saveMapData(newData);
  }

  async function handleAddFloor() {
    const newFloor: Floor = {
      id: `floor-${Date.now()}`,
      name: "New Floor",
      offices: [],
    };
    const newData: MapData = {
      ...mapData,
      floors: [...mapData.floors, newFloor],
    };
    await saveMapData(newData);
  }

  // Drag-and-drop state
  const dragIndexRef = useRef<number | null>(null);

  function handleDragStart(index: number) {
    dragIndexRef.current = index;
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    setDragOverIndex(index);
  }

  function handleDragLeave() {
    setDragOverIndex(null);
  }

  async function handleDrop(index: number) {
    const from = dragIndexRef.current;
    if (from === null || from === index) {
      dragIndexRef.current = null;
      setDragOverIndex(null);
      return;
    }
    const newFloors = [...mapData.floors];
    const [moved] = newFloors.splice(from, 1);
    newFloors.splice(index, 0, moved);
    dragIndexRef.current = null;
    setDragOverIndex(null);
    await saveMapData({ ...mapData, floors: newFloors });
  }

  function handleDragEnd() {
    dragIndexRef.current = null;
    setDragOverIndex(null);
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0b0d] relative">
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
        .nav-btn:hover {
          color: #e5e5ea;
          background: rgba(255,255,255,0.06);
        }
        .floor-row {
          background: #1a191c;
          border-radius: 10px;
          padding: 10px 12px;
          display: flex;
          align-items: flex-start;
          gap: 10px;
          user-select: none;
          transition: background 0.15s;
        }
        .floor-row:hover {
          background: #201e23;
        }
        .floor-row.drag-over {
          background: #2a2830;
          border: 1px dashed #555;
        }
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
        .trash-btn:hover {
          background: rgba(235, 85, 85, 0.15);
        }
        .trash-btn:hover svg {
          stroke: #eb5555;
        }
        .drag-handle {
          cursor: grab;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          opacity: 0.7;
          padding: 2px;
        }
        .drag-handle:active {
          cursor: grabbing;
        }
        .settings-dropdown {
          position: absolute;
          bottom: calc(100% + 8px);
          right: 0;
          background: #252225;
          border: 1px solid rgba(255,255,255,0.1);
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
        .dropdown-item:hover {
          background: #302e31;
        }
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
        .done-btn:hover {
          opacity: 0.85;
        }
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
          margin-top: 4px;
        }
        .add-floor-btn:hover {
          background: #222025;
          color: #e5e5ea;
        }
      `}</style>

      {/* Header */}
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

          {/* Floors Section */}
          <div className="w-full flex flex-col gap-2">
            {mapData.floors.map((floor, index) => (
              <div
                key={floor.id}
                draggable={isEditMode}
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={() => handleDrop(index)}
                onDragEnd={handleDragEnd}
                className={`floor-row ${dragOverIndex === index ? "drag-over" : ""}`}
              >
                {/* Drag handle — only in edit mode */}
                {isEditMode && (
                  <div className="drag-handle">
                    <IconDragHandle />
                  </div>
                )}

                {/* Floor content */}
                <div className="flex-1 flex flex-col gap-2">
                  <span className="text-[14px] font-medium text-[#e5e5ea]">{floor.name}</span>
                  {floor.offices.length > 0 && (
                    <div className="flex items-end gap-2">
                      {floor.offices.map((office, oIdx) => (
                        <div
                          key={office.id}
                          className="rounded-[8px] bg-[#28272c]"
                          style={{
                            width: "38%",
                            height: oIdx === 0 ? "34px" : "54px",
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Delete — only in edit mode */}
                {isEditMode && (
                  <button
                    className="trash-btn"
                    onClick={() => handleDeleteFloor(floor.id)}
                    aria-label="Delete floor"
                  >
                    <IconTrash />
                  </button>
                )}
              </div>
            ))}

            {/* Add Floor button — only in edit mode */}
            {isEditMode && (
              <button className="add-floor-btn" onClick={handleAddFloor}>
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

        {/* Right side — Folder + Settings (normal) OR Done Editing Map (edit mode) */}
        <div className="flex items-center gap-1">
          {isEditMode ? (
            <button
              className="done-btn"
              onClick={() => setIsEditMode(false)}
            >
              Done Editing Map
            </button>
          ) : (
            <>
              {/* Folder */}
              <button className="nav-btn" aria-label="Files" onClick={() => router.push("/stats")}>
                <img src="/icons/folder.png" width={22} height={22} alt="Folder" className="brightness-0 invert" />
              </button>

              {/* Settings */}
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
                    <div
                      className="dropdown-item"
                      onClick={() => {
                        setShowSettingsDropdown(false);
                        setIsEditMode(true);
                      }}
                    >
                      Edit Map
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
