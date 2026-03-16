"use client";

import { useState } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, addDays } from "date-fns";
import { useTimeTracking } from "../context/TimeContext";

interface CalendarProps {
  storyImages: Record<string, string[]>;
  onDayClick?: (dateKey: string) => void;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function Calendar({ storyImages, onDayClick }: CalendarProps) {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const { dailyTime } = useTimeTracking();

  const totalSeconds = Object.values(dailyTime).reduce((a, b) => a + b, 0);

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days: Date[] = [];
  let day = startDate;
  while (day <= endDate) {
    days.push(day);
    day = addDays(day, 1);
  }

  return (
    <div className="w-[340px] rounded-[16px] bg-[#1c1c1e]/90 backdrop-blur-md p-5 text-[#e5e5ea] flex flex-col shadow-2xl shrink-0">
      {/* Total time header — always visible */}
      <div className="mb-4 pb-4 border-b border-white/10">
        <p className="text-[11px] uppercase tracking-widest text-[#555] mb-1 font-medium">Total time in office</p>
        <p className="text-[22px] font-semibold text-white">{totalSeconds > 0 ? formatDuration(totalSeconds) : "—"}</p>
      </div>

      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[15px] font-semibold text-white flex gap-2 items-baseline">
          {format(currentDate, "MMMM")} <span className="text-[#a1a1aa] font-normal text-[13px]">{format(currentDate, "yyyy")}</span>
        </h3>
        <div className="flex items-center gap-3 text-[#a1a1aa]">
          <button onClick={prevMonth} className="hover:text-white transition-colors cursor-pointer p-1">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <button onClick={nextMonth} className="hover:text-white transition-colors cursor-pointer p-1">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>
      </div>

      {/* Days of Week */}
      <div className="grid grid-cols-7 mb-2 text-center text-[11px] font-medium text-[#555]">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
          <div key={d} className="h-7 flex items-center justify-center">{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-y-1">
        {days.map((d, i) => {
          const isCurrentMonth = isSameMonth(d, monthStart);
          const dateKey = format(d, "yyyy-MM-dd");
          const hasImages = isCurrentMonth && (storyImages[dateKey]?.length ?? 0) > 0;
          const timeForDay = isCurrentMonth ? (dailyTime[dateKey] || 0) : 0;
          const hasData = hasImages || timeForDay > 0;
          const isToday = isCurrentMonth && format(d, "yyyy-MM-dd") === format(today, "yyyy-MM-dd");

          return (
            <div key={i} className="flex flex-col items-center py-0.5">
              <button
                disabled={!isCurrentMonth}
                onClick={() => isCurrentMonth && onDayClick?.(dateKey)}
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-[13px] transition-colors
                  ${!isCurrentMonth ? "opacity-0 pointer-events-none" : "cursor-pointer"}
                  ${hasData ? "bg-[#253960]/80 backdrop-blur-sm text-[#71a1f5] hover:bg-[#2d4677]/80" : ""}
                  ${!hasData && isCurrentMonth && isToday ? "bg-white/15 text-white" : ""}
                  ${!hasData && isCurrentMonth && !isToday ? "text-[#a1a1aa] hover:bg-white/10 hover:text-white" : ""}
                `}
              >
                {format(d, "d")}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
