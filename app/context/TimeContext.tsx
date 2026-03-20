"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from "react";

type OfficeId = string | null;

interface TimeContextType {
  timeSpent: Record<string, number>;
  activeOffice: OfficeId;
  startTracking: (office: OfficeId) => void;
  stopTracking: () => void;
  totalTime: number;
  dailyTime: Record<string, number>; // "YYYY-MM-DD" -> seconds
}

const TimeContext = createContext<TimeContextType | undefined>(undefined);

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function TimeProvider({ children }: { children: ReactNode }) {
  const [activeOffice, setActiveOffice] = useState<OfficeId>(null);
  const [timeSpent, setTimeSpent] = useState<Record<string, number>>({});
  const [dailyTime, setDailyTime] = useState<Record<string, number>>({});
  const lastTickRef = useRef<number | null>(null);

  // Load persisted daily time from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("dailyOfficeTime");
      if (saved) setDailyTime(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (activeOffice && activeOffice !== "reception") {
      lastTickRef.current = Date.now();

      interval = setInterval(() => {
        const now = Date.now();
        if (lastTickRef.current) {
          const deltaMs = now - lastTickRef.current;
          const deltaSec = Math.floor(deltaMs / 1000);

          if (deltaSec > 0) {
            setTimeSpent((prev) => ({
              ...prev,
              [activeOffice]: (prev[activeOffice] || 0) + deltaSec,
            }));
            
            // Track daily time and persist it
            const key = todayKey();
            setDailyTime((prev) => {
              const updated = { ...prev, [key]: (prev[key] || 0) + deltaSec };
              try { localStorage.setItem("dailyOfficeTime", JSON.stringify(updated)); } catch { /* ignore */ }
              return updated;
            });

            lastTickRef.current += deltaSec * 1000;
          }
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
      lastTickRef.current = null;
    };
  }, [activeOffice]);

  const startTracking = useCallback((office: OfficeId) => setActiveOffice(office), []);
  const stopTracking = useCallback(() => setActiveOffice(null), []);

  const totalTime = Object.values(timeSpent).reduce((acc, curr) => acc + curr, 0);

  return (
    <TimeContext.Provider value={{ timeSpent, activeOffice, startTracking, stopTracking, totalTime, dailyTime }}>
      {children}
    </TimeContext.Provider>
  );
}

export function useTimeTracking() {
  const context = useContext(TimeContext);
  if (context === undefined) {
    throw new Error("useTimeTracking must be used within a TimeProvider");
  }
  return context;
}
