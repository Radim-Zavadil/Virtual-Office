"use client";

import { useState } from "react";

type RoomId = "personal" | "hangout" | null;

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
      <span className="absolute top-[14px] left-[14px] text-[13px] font-medium text-[#e5e5ea] tracking-[0.01em]">
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

export default function Home() {
  const [activeRoom, setActiveRoom] = useState<RoomId>(null);

  function handleEnter(roomId: RoomId) {
    if (activeRoom === roomId) return;
    setActiveRoom(roomId);
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0c0b0e]">
      <style>{`
        @keyframes popIn {
          from { transform: scale(0.6); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
      `}</style>

      {/* Header */}
      <header className="w-full h-12 flex items-center justify-center shrink-0" style={{backgroundColor: '#141318'}}>
        <span className="text-[13px] font-medium tracking-[0.08em] uppercase text-[#e5e5ea]">
          Virtual Office
        </span>
      </header>

      {/* Cards */}
      <div className="flex flex-col items-center gap-3 pt-10">
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
    </div>
  );
}
