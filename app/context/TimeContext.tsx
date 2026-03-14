"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

type OfficeId = "personal" | "hangout" | "reception" | null;

interface TimeContextType {
  timeSpent: { personal: number; hangout: number; reception?: number };
  activeOffice: OfficeId;
  startTracking: (office: OfficeId) => void;
  stopTracking: () => void;
  totalTime: number;
}

const TimeContext = createContext<TimeContextType | undefined>(undefined);

export function TimeProvider({ children }: { children: ReactNode }) {
  const [activeOffice, setActiveOffice] = useState<OfficeId>(null);
  // Start with some default time so gauges look populated, 
  // but it will also increment when active.
  const [timeSpent, setTimeSpent] = useState({ 
    personal: 0, 
    hangout: 0 
  });

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (activeOffice && activeOffice !== "reception") {
      interval = setInterval(() => {
        setTimeSpent((prev) => ({
          ...prev,
          [activeOffice]: prev[activeOffice as keyof typeof prev] + 1,
        }));
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeOffice]);

  const startTracking = (office: OfficeId) => setActiveOffice(office);
  const stopTracking = () => setActiveOffice(null);
  
  const totalTime = timeSpent.personal + timeSpent.hangout;

  return (
    <TimeContext.Provider value={{ timeSpent, activeOffice, startTracking, stopTracking, totalTime }}>
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
