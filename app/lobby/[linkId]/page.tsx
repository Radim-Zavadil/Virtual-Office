"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

type Status = "pending" | "going" | "cant_go" | "invalid";

export default function GuestInvitePage() {
  const { linkId } = useParams();
  const router = useRouter();
  const [status, setStatus] = useState<Status>("pending");
  const [corporateName, setCorporateName] = useState("the Office");
  
  // Persist guest info across refreshes
  const [guestName, setGuestName] = useState("");
  const [guestId, setGuestId] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedId = localStorage.getItem("lobby_guestId");
      const savedName = localStorage.getItem("lobby_guestName");
      const savedStatus = localStorage.getItem("lobby_status") as Status;
      
      const id = savedId || `g-${Date.now()}`;
      const name = savedName || `Guest ${Math.floor(Math.random() * 1000)}`;
      
      setGuestId(id);
      setGuestName(name);
      if (savedStatus === "going") setStatus("going");
      
      localStorage.setItem("lobby_guestId", id);
      localStorage.setItem("lobby_guestName", name);
    }
  }, []);

  useEffect(() => {
    if (!guestId) return;

    const checkLobby = () => {
      fetch("/api/lobby")
        .then(r => r.json())
        .then(data => {
          if (!data.active || data.linkId !== linkId) {
            setStatus("invalid");
          } else if (data.approvedGuests?.find((g: any) => g.id === guestId)) {
            const approved = data.approvedGuests.find((g: any) => g.id === guestId);
            localStorage.setItem("virtualOffice_isGuest", "true");
            localStorage.setItem("virtualOffice_guestRoom", approved.roomId || "reception");
            localStorage.setItem("virtualOffice_guestId", guestId);
            
            // Clean up lobby-specific storage
            localStorage.removeItem("lobby_status");
            
            router.push("/");
          }
        })
        .catch(console.error);
    };
    checkLobby();
    const interval = setInterval(checkLobby, 2000);
    return () => clearInterval(interval);
  }, [linkId, guestId, router]);

  // Guest Heartbeat
  useEffect(() => {
    if (!guestId) return;

    const interval = setInterval(() => {
      fetch("/api/lobby", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "heartbeat", guestId })
      }).catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, [guestId]);

  useEffect(() => {
    fetch("/api/corporates")
      .then(r => r.json())
      .then(data => {
        if (data.corporates && data.corporates.length > 0) {
          setCorporateName(data.corporates[0].name);
        }
      })
      .catch(() => {});
  }, []);

  const handleGoing = async () => {
    setStatus("going");
    localStorage.setItem("lobby_status", "going");
    try {
      await fetch("/api/lobby", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_guest",
          guest: { id: guestId, name: guestName }
        })
      });
    } catch(e) {
      console.error(e);
    }
  };

  const handleCantGo = () => {
    setStatus("cant_go");
    localStorage.setItem("lobby_status", "cant_go");
  };

  if (status === "invalid") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Invalid Link</h1>
          <p className="text-gray-400">This lobby link is invalid or has been closed by the host.</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen relative flex items-center justify-center font-sans bg-black overflow-hidden"
      style={{
        backgroundImage: "url(/backgrounds/invite.png)",
        backgroundSize: "100% 100%",
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
      <div className="absolute inset-0 bg-black/60 pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center max-w-lg px-6 text-center animate-[popIn_0.3s_ease] mt-16">
        
        {status === "pending" && (
          <>
            <h1 className="text-white text-[28px] md:text-[34px] font-medium tracking-tight mb-4 leading-tight">
              Welcome to the Lobby
            </h1>
            <p className="text-[#a0a0a5] text-[15px] md:text-[17px] mb-12 max-w-md">
              Please wait while the host prepares to let you in. You can confirm your attendance below.
            </p>
          </>
        )}

        {status === "going" && (
          <>
            <h1 className="text-white text-[28px] md:text-[34px] font-medium tracking-tight mb-8 leading-tight">
              Wait for Approval
            </h1>
            <div className="mb-8 w-[80px] h-[80px] rounded-full overflow-hidden border-2 border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
              <img src="/icons/guest.png" alt="Guest Avatar" className="w-full h-full object-cover" />
            </div>
          </>
        )}

        {status === "cant_go" && (
          <h1 className="text-white text-[24px] md:text-[28px] font-medium tracking-tight mb-8 leading-tight">
            You can close this website.
          </h1>
        )}

        {(status === "pending" || status === "going") && (
          <div className="flex items-center gap-4 mt-4">
            <button
              onClick={handleGoing}
              disabled={status === "going"}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
                status === "going" 
                  ? "bg-black/20 text-[#34c759] cursor-default opacity-50" 
                  : "bg-black/20 hover:bg-black/30 text-[#34c759]"
              }`}
            >
              <div className="w-5 h-5 rounded-full flex items-center justify-center bg-[#34c759] text-white overflow-hidden shadow-sm">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              Going
            </button>

            <button
              onClick={handleCantGo}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium bg-black/20 hover:bg-black/30 text-[#ff3b30] transition-all"
            >
              <div className="w-5 h-5 rounded-full bg-[#ff3b30] flex items-center justify-center text-white overflow-hidden shadow-sm">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </div>
              Can't Go
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
