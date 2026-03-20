"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface Guest {
  id: string;
  name: string;
}

interface Room {
  id: string;
  name: string;
}

export default function HostLobby() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [rooms, setRooms] = useState<Room[]>([{ id: 'reception', name: 'Reception' }]);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Fetch map data for rooms dropdown
    fetch("/api/map")
      .then(r => r.json())
      .then(data => {
        const availableRooms: Room[] = [{ id: 'reception', name: 'Reception' }];
        data.floors?.forEach((f: any) => {
          f.offices?.forEach((o: any) => {
            availableRooms.push({ id: o.id, name: o.name || 'Unnamed Room' });
          });
        });
        setRooms(availableRooms);
      })
      .catch(console.error);

    // Poll lobby state
    const fetchLobby = () => {
      fetch("/api/lobby")
        .then(r => r.json())
        .then(data => {
          if (!data.active && typeof window !== "undefined") {
            router.push("/");
          } else {
            setGuests(data.guests || []);
          }
        })
        .catch(console.error);
    };

    fetchLobby();
    const interval = setInterval(fetchLobby, 2000); // Poll every 2s
    return () => clearInterval(interval);
  }, [router]);

  // Click outside dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    }
    if (activeDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [activeDropdown]);

  async function handleCloseLobby() {
    try {
      await fetch("/api/lobby", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deactivate" })
      });
      router.push("/");
    } catch(e) { console.error(e); }
  }

  async function handleTransfer(guestId: string, roomId: string) {
    try {
      await fetch("/api/lobby", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove_guest", guestId, roomId })
      });
      // Removing guest from local state instantly for snappy UI
      setGuests(prev => prev.filter(g => g.id !== guestId));
      setActiveDropdown(null);
    } catch(e) { console.error(e); }
  }

  return (
    <div 
      className="min-h-screen relative flex flex-col font-sans bg-black"
      style={{
        backgroundImage: "url(/backgrounds/invite.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat"
      }}
    >
      <style>{`
        @keyframes popIn {
          from { transform: scale(0.8); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
      `}</style>
      
      {/* Dark overlay to make text readable */}
      <div className="absolute inset-0 bg-black/50 pointer-events-none z-0" />

      {/* Top left exit button */}
      <div className="absolute top-6 left-6 z-20">
        <button
          onClick={() => router.push("/")}
          style={{
            background: "rgba(0,0,0,0.6)",
            border: "1px solid rgba(255,255,255,0.1)",
            backdropFilter: "blur(4px)",
            borderRadius: "8px",
            color: "#e5e5ea",
            padding: "8px 16px",
            fontFamily: "var(--font-inter, Inter, sans-serif)",
            fontSize: "14px",
            fontWeight: 500,
            cursor: "pointer",
            transition: "all 0.15s",
            boxShadow: "0 4px 12px rgba(0,0,0,0.5)"
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,0,0,0.8)" }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(0,0,0,0.6)" }}
        >
          Exit
        </button>
      </div>

      {/* Top right close button */}
      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={handleCloseLobby}
          style={{
            background: "rgba(0,0,0,0.6)",
            border: "1px solid rgba(255,255,255,0.1)",
            backdropFilter: "blur(4px)",
            borderRadius: "8px",
            color: "#e5e5ea",
            padding: "8px 16px",
            fontFamily: "var(--font-inter, Inter, sans-serif)",
            fontSize: "14px",
            fontWeight: 500,
            cursor: "pointer",
            transition: "all 0.15s",
            boxShadow: "0 4px 12px rgba(0,0,0,0.5)"
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,0,0,0.8)" }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(0,0,0,0.6)" }}
        >
          Close Lobby
        </button>
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center pt-10">
        <h1 className="text-white text-[32px] md:text-[40px] font-medium tracking-tight mb-2 leading-tight text-center drop-shadow-md">
          Waiting Guests
        </h1>
        <p className="text-[#a0a0a5] text-[16px] md:text-[18px] mb-16 text-center max-w-md drop-shadow-md">
          Click on a guest to transfer them to a room in your virtual office.
        </p>

        {guests.length === 0 ? (
          <div className="text-[#a0a0a5] flex flex-col items-center mt-10">
             <div className="w-[80px] h-[80px] rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-xl">
               <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-50"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
             </div>
             <p className="text-lg">No guests currently waiting</p>
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-12 max-w-4xl px-8">
            {guests.map(guest => (
              <div key={guest.id} className="relative flex flex-col items-center animate-[popIn_0.3s_ease]">
                <button 
                  onClick={() => setActiveDropdown(activeDropdown === guest.id ? null : guest.id)}
                  className="relative flex flex-col items-center group transition-transform hover:scale-105"
                >
                  <div className={`w-[96px] h-[96px] rounded-full overflow-hidden mb-3 shadow-[0_4px_20px_rgba(0,0,0,0.5)] transition-colors ${activeDropdown === guest.id ? 'ring-2 ring-[#3a82f7]' : ''}`}>
                    <img src="/icons/guest.png" alt="Guest Avatar" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-white font-medium text-[15px] drop-shadow-md block text-center truncate w-32">
                    {guest.name}
                  </span>
                </button>

                {/* Dropdown Menu for Transfer */}
                {activeDropdown === guest.id && (
                  <div 
                    ref={dropdownRef}
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-40 bg-[#252225] rounded-[10px] shadow-[0_8px_24px_rgba(0,0,0,0.5)] z-50 animate-[popIn_0.15s_ease] p-1 border border-white/5"
                  >
                    <div className="px-2.5 py-1.5 mb-1 border-b border-white/5">
                      <span className="text-[11px] font-semibold text-[#a0a0a5] uppercase tracking-wider">Transfer to...</span>
                    </div>
                    <div className="max-h-[240px] overflow-y-auto w-full flex flex-col">
                      {rooms.map(room => (
                        <button
                          key={room.id}
                          onClick={() => handleTransfer(guest.id, room.id)}
                          className="w-full text-left px-2.5 py-2 rounded-[6px] text-[13px] text-[#e5e5ea] hover:bg-[#302e31] transition-colors whitespace-nowrap"
                        >
                          {room.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stage graphic at the bottom similar to the original image */}
      <div className="absolute inset-x-0 bottom-0 h-[100px] bg-linear-to-t from-black to-transparent pointer-events-none z-0" />
    </div>
  );
}
