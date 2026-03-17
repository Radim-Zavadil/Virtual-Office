"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTimeTracking } from "./context/TimeContext";

type RoomId = string | null;

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
}: {
  office: Office;
  isEditMode: boolean;
  activeRoom: RoomId;
  onEnter: (id: string) => void;
  onChange: (updated: Office) => void;
  onDelete: () => void;
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
          overflow: "hidden",
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
                 {isActive && (
                  <div
                    className="w-11 h-11 rounded-full bg-white flex items-center justify-center text-[18px] font-semibold text-[#1c1c1e] animate-[popIn_0.18s_ease]"
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)"
                    }}
                  >
                    R
                  </div>
                )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gridTemplateRows: "repeat(3, 1fr)", gap: 6, height: 50 }}>
                 {Array.from({ length: 15 }).map((_, i) => (
                    <div key={i} style={{ background: "#242425", borderRadius: 6 }} />
                 ))}
            </div>
          </div>
        ) : (
          isActive && (
            <div
              className="w-11 h-11 rounded-full bg-white flex items-center justify-center text-[18px] font-semibold text-[#1c1c1e] animate-[popIn_0.18s_ease]"
              style={{
                position: "absolute",
                left: 14,
                top: 42, // positioned like existing cards
              }}
            >
              R
            </div>
          )
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

/* ── Main page ── */
export default function Home() {
  const { activeOffice: activeRoom, startTracking, stopTracking } = useTimeTracking();
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [shelfImages, setShelfImages] = useState<string[]>([]);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [showAddRoomDropdown, setShowAddRoomDropdown] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [mapData, setMapData] = useState<MapData>({ floors: [] });
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Track which floor is selected
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const addRoomRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

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
    fetch("/api/map")
      .then((r) => r.json())
      .then((data: MapData) => {
        setMapData(data);
        if (data.floors.length > 0 && !selectedFloorId) {
          setSelectedFloorId(data.floors[0].id);
        }
      })
      .catch(console.error);
  }, []);

  // Default to reception if no active room
  useEffect(() => {
    if (activeRoom === null) startTracking("reception");
  }, []);

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

  function handleEnter(roomId: string) {
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
                  onEnter={handleEnter}
                  onChange={handleUpdateOffice}
                  onDelete={() => handleDeleteOffice(office.id)}
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
        <div className="w-[1px] bg-white/[0.12] self-stretch relative">
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
                    border: "1px solid rgba(255,255,255,0.1)",
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
                                  width: 8,
                                  height: 8,
                                  borderRadius: "50%",
                                  background: "white",
                                  color: "#1c1c1e",
                                  fontSize: "5px",
                                  fontWeight: "bold",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center"
                                }}>R</div>
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

        <button className="nav-btn" aria-label="Enter room" onClick={() => setShowLeaveModal(true)}>
          <img src="/icons/open_door.png" width={22} height={22} alt="Door" className="brightness-0 invert" />
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
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-[2px] font-sans font-normal">
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
