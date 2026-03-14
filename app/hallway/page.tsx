"use client";

import { useRouter } from "next/navigation";
import { useTimeTracking } from "../context/TimeContext";

export default function Hallway() {
  const router = useRouter();
  const { activeOffice, startTracking } = useTimeTracking();

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0b0d] relative items-center font-sans">
      {/* Header — transparent bg without border */}
      <header className="w-full h-[60px] flex items-center justify-center shrink-0 bg-transparent relative px-6">
        <img src="/icons/logo.png" alt="Logo" className="h-12 object-contain" />
        
        {/* Top Right: R icon */}
        <div className="absolute right-6 w-9 h-9 rounded-full bg-white flex items-center justify-center text-[14px] font-bold text-[#1c1c1e]">
          R
        </div>
      </header>

      {/* Card Container */}
      <div className="flex-1 flex flex-col items-center justify-center pb-32 w-full">
        <div 
          onClick={() => {
            startTracking("reception");
            router.push("/");
          }}
          className="w-[453px] h-[160px] rounded-[14px] bg-[#1d1d1f] cursor-pointer select-none border-2 border-transparent hover:border-white/10 transition-colors duration-200 relative"
        >
          {/* Top Left: Name */}
          <span className="absolute top-[20px] left-[20px] text-[18px] font-medium text-white tracking-[0.01em]">
            Radim Zavadil Office
          </span>
          {/* Below Name: Grey text */}
          <span className="absolute top-[52px] left-[20px] text-[14px] font-normal text-[#a1a1a6]">
            {activeOffice === "personal" ? "1 Person Here Now." : "0 People Here Now."}
          </span>
        </div>
      </div>
    </div>
  );
}
