"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTimeTracking } from "../context/TimeContext";
import { useEffect, useState, useMemo, Suspense } from "react";
import AuthGuard from "../components/AuthGuard";

interface Office {
  id: string;
  name: string;
}

interface Floor {
  offices: Office[];
}

interface MapData {
  floors: Floor[];
}

function StatsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const corporateId = searchParams.get("corporateId");
  const { timeSpent } = useTimeTracking();
  const [mapData, setMapData] = useState<MapData | null>(null);

  useEffect(() => {
    const url = corporateId ? `/api/map?corporateId=${corporateId}` : "/api/map";
    fetch(url)
      .then((res) => res.json())
      .then((data) => setMapData(data))
      .catch((err) => console.error("Failed to fetch map data:", err));
  }, [corporateId]);

  // Get all existing offices from map data
  const existingOffices = useMemo(() => {
    if (!mapData) return [];
    return mapData.floors.flatMap((f) => f.offices);
  }, [mapData]);

  // Filter timeSpent to only include existing offices and only those with time > 0
  const activeStats = useMemo(() => {
    return existingOffices
      .map((office) => ({
        ...office,
        seconds: timeSpent[office.id] || 0,
      }))
      .filter((stat) => stat.seconds > 0);
  }, [existingOffices, timeSpent]);

  // United (total) time across all EXISTING offices
  const unitedTime = useMemo(() => {
    return activeStats.reduce((acc, curr) => acc + curr.seconds, 0);
  }, [activeStats]);

  function formatTime(seconds: number) {
    if (seconds === 0) return "0 min";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    
    if (h === 0 && m === 0) return `${s} sec`;
    if (h === 0) return `${m} min ${s > 0 ? s + ' s' : ''}`;
    return `${h} hr ${m} min`;
  }

  function formatTotal(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h} hr ${m} min`;
  }

  const getPercent = (val: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((val / total) * 100);
  };

  // Color palette for dynamic gauges
  const colors = ["#32d7dc", "#ab68ff", "#ff6b6b", "#ffd93d", "#6bff6b"];

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
      <div className="flex-1 flex flex-col items-center w-full px-6 pt-20 pb-20 overflow-y-auto">
        
        {/* Total Time Header */}
        <div className="flex flex-col items-center mb-16">
          <span className="text-[13px] font-medium text-[#8e8e93] mb-1">Total time worked</span>
          <span className="text-[32px] font-medium text-white tracking-tight">{formatTotal(unitedTime)}</span>
        </div>

        {activeStats.length > 0 ? (
          <div className="flex flex-wrap justify-center gap-x-12 gap-y-16 max-w-4xl px-4">
            {activeStats.map((stat, idx) => {
              const pct = getPercent(stat.seconds, unitedTime);
              const color = colors[idx % colors.length];
              return (
                <div key={stat.id} className="flex items-center gap-4 min-w-[200px]">
                  {/* SVG Donut */}
                  <div className="relative w-20 h-20 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="34" fill="none" stroke="#252528" strokeWidth="8" />
                      <circle 
                        cx="40" cy="40" r="34" fill="none" stroke={color} strokeWidth="8" 
                        strokeDasharray={`${2 * Math.PI * 34}`} 
                        strokeDashoffset={`${2 * Math.PI * 34 * (1 - pct / 100)}`}
                        className="transition-all duration-1000 ease-in-out"
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute text-[14px] font-medium text-[#e5e5ea]">{pct}%</span>
                  </div>
                  {/* Labels */}
                  <div className="flex flex-col">
                    <span className="text-[16px] font-medium text-white mb-0.5">{stat.name || "Untitled Office"}</span>
                    <span className="text-[13px] font-medium text-[#8e8e93]">{formatTime(stat.seconds)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-[#555] text-[15px] font-medium">No time tracked in offices yet.</div>
        )}
      </div>
    </div>
  );
}

export default function Stats() {
  return (
    <AuthGuard>
      <Suspense fallback={null}>
        <StatsContent />
      </Suspense>
    </AuthGuard>
  );
}

