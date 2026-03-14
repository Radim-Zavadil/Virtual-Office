"use client";

import { useRouter } from "next/navigation";
import { useTimeTracking } from "../context/TimeContext";

export default function Stats() {
  const router = useRouter();
  const { timeSpent, totalTime } = useTimeTracking();

  function formatTime(seconds: number) {
    if (seconds === 0) return "0 min";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    
    // For demonstration, if under a minute, show seconds so users see it working
    if (h === 0 && m === 0) return `${s} sec`;
    if (h === 0) return `${m} min ${s > 0 ? s + ' s' : ''}`;
    return `${h} hr ${m} min`;
  }

  function formatTotal(seconds: number) {
    if (seconds === 0) return "0 hr 0 min";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h === 0 && m === 0) return `0 hr ${s} sec`;
    if (h === 0) return `0 hr ${m} min`;
    return `${h} hr ${m} min`;
  }

  const getPercent = (val: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((val / total) * 100);
  };

  const personalPct = getPercent(timeSpent.personal, totalTime);
  const hangoutPct = getPercent(timeSpent.hangout, totalTime);

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0b0d] relative items-center font-sans">
      {/* Header */}
      <header className="w-full h-[60px] flex items-center justify-center shrink-0 bg-transparent relative px-6 border-b border-white/12">
        <button 
          onClick={() => router.back()}
          className="absolute left-6 text-[#8e8e93] hover:text-[#e5e5ea] transition-colors"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <span className="text-[14px] font-medium tracking-[0.05em] uppercase text-[#e5e5ea]">
          Statistics
        </span>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center w-full px-6 -mt-16">
        
        {/* Total Time Header */}
        <div className="flex flex-col items-center mb-16">
          <span className="text-[13px] font-medium text-[#8e8e93] mb-1">Total time worked</span>
          <span className="text-[32px] font-medium text-white tracking-tight">{formatTotal(totalTime)}</span>
        </div>

        {/* Gauges Row */}
        <div className="flex items-center gap-12">
          
          {/* Radim Zavadil Gauge */}
          <div className="flex items-center gap-4">
            {/* SVG Donut */}
            <div className="relative w-20 h-20 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="34" fill="none" stroke="#252528" strokeWidth="8" />
                <circle 
                  cx="40" cy="40" r="34" fill="none" stroke="#32d7dc" strokeWidth="8" 
                  strokeDasharray={`${2 * Math.PI * 34}`} 
                  strokeDashoffset={`${2 * Math.PI * 34 * (1 - personalPct / 100)}`}
                  className="transition-all duration-1000 ease-in-out"
                />
              </svg>
              <span className="absolute text-[14px] font-medium text-[#e5e5ea]">{personalPct}%</span>
            </div>
            {/* Labels */}
            <div className="flex flex-col">
              <span className="text-[16px] font-medium text-white mb-0.5">Radim Zavadil</span>
              <span className="text-[13px] font-medium text-[#8e8e93]">{formatTime(timeSpent.personal)}</span>
            </div>
          </div>

          {/* Hangout Gauge */}
          <div className="flex items-center gap-4">
            {/* SVG Donut */}
            <div className="relative w-20 h-20 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="34" fill="none" stroke="#252528" strokeWidth="8" />
                <circle 
                  cx="40" cy="40" r="34" fill="none" stroke="#ab68ff" strokeWidth="8" 
                  strokeDasharray={`${2 * Math.PI * 34}`} 
                  strokeDashoffset={`${2 * Math.PI * 34 * (1 - hangoutPct / 100)}`}
                  className="transition-all duration-1000 ease-in-out"
                />
              </svg>
              <span className="absolute text-[14px] font-medium text-[#e5e5ea]">{hangoutPct}%</span>
            </div>
            {/* Labels */}
            <div className="flex flex-col">
              <span className="text-[16px] font-medium text-white mb-0.5">Hangout Room</span>
              <span className="text-[13px] font-medium text-[#8e8e93]">{formatTime(timeSpent.hangout)}</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
