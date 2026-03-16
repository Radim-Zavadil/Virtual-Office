"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { format } from "date-fns";
import Link from "next/link";
import Calendar from "./Calendar";
import { useTimeTracking } from "../context/TimeContext";

interface StoryImage {
  src: string;
  dateKey: string;
  id: string;
}

function groupByDate(images: StoryImage[]): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const img of images) {
    if (!result[img.dateKey]) result[img.dateKey] = [];
    result[img.dateKey].push(img.src);
  }
  return result;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDateLabel(dateKey: string): string {
  const d = new Date(dateKey + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

const SLIDE_DURATION = 5000;

export default function StoryPage() {
  const [images, setImages] = useState<StoryImage[]>([]);
  const [viewingDate, setViewingDate] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressStartRef = useRef<number>(0);
  const { dailyTime } = useTimeTracking();

  useEffect(() => {
    try {
      const saved = localStorage.getItem("storyImages");
      if (saved) setImages(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  const storyByDate = groupByDate(images);
  const viewingImages = viewingDate ? (storyByDate[viewingDate] ?? []) : [];
  const viewingDayTime = viewingDate ? (dailyTime[viewingDate] || 0) : 0;

  const handleDayClick = (dateKey: string) => {
    setViewingDate(dateKey);
    setCurrentSlide(0);
    setProgress(0);
  };

  const startProgress = useCallback(() => {
    if (progressRef.current) clearInterval(progressRef.current);
    progressStartRef.current = Date.now();
    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - progressStartRef.current;
      const pct = Math.min((elapsed / SLIDE_DURATION) * 100, 100);
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(progressRef.current!);
        setCurrentSlide((prev) => {
          if (prev < viewingImages.length - 1) {
            progressStartRef.current = Date.now();
            setProgress(0);
            return prev + 1;
          } else {
            setProgress(0);
            return prev; // stay on last, stop auto-close
          }
        });
      }
    }, 50);
  }, [viewingImages.length]);

  useEffect(() => {
    if (viewingDate && viewingImages.length > 0) {
      startProgress();
    } else {
      if (progressRef.current) clearInterval(progressRef.current);
    }
    return () => { if (progressRef.current) clearInterval(progressRef.current); };
  }, [viewingDate, currentSlide, startProgress, viewingImages.length]);

  function handleAddImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      const dateKey = format(new Date(), "yyyy-MM-dd");
      const newImg: StoryImage = { src, dateKey, id: `img-${Date.now()}` };
      const updated = [...images, newImg];
      setImages(updated);
      try { localStorage.setItem("storyImages", JSON.stringify(updated)); } catch { /* ignore */ }
      setViewingDate(dateKey);
      setCurrentSlide(groupByDate(updated)[dateKey].length - 1);
      setProgress(0);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function goNext() {
    if (currentSlide < viewingImages.length - 1) {
      setCurrentSlide(s => s + 1);
      setProgress(0);
    }
  }
  function goPrev() {
    if (currentSlide > 0) {
      setCurrentSlide(s => s - 1);
      setProgress(0);
    }
  }

  return (
    <div className="flex flex-col h-screen w-full bg-[#0b0b0d] overflow-hidden">
      {/* Header */}
      <div className="h-[64px] bg-[#111] border-b border-white/[0.07] flex items-center justify-between px-6 shrink-0 z-10">
        <Link href="/" className="flex items-center gap-3 text-[#e5e5ea] hover:opacity-75 transition-opacity">
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          <span className="text-[15px] font-medium">Go Back</span>
        </Link>
        <label className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center cursor-pointer hover:bg-white/20 transition-colors">
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAddImage} />
          <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </label>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT PANEL — same color as header */}
        <div className="w-1/4 shrink-0 flex flex-col bg-[#111] border-r border-white/[0.07] overflow-hidden">
          {viewingDate && viewingImages.length > 0 ? (
            <div className="flex-1 relative flex items-center justify-center overflow-hidden">
              {/* Progress bars */}
              <div className="absolute top-4 left-4 right-4 flex gap-1 z-20">
                {viewingImages.map((_, i) => (
                  <div key={i} className="h-[2px] flex-1 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white/80 rounded-full"
                      style={{ width: i < currentSlide ? "100%" : i === currentSlide ? `${progress}%` : "0%" }}
                    />
                  </div>
                ))}
              </div>

              <img
                src={viewingImages[currentSlide]}
                alt="Story"
                className="max-h-full max-w-full object-contain select-none"
                draggable={false}
              />

              <button className="absolute left-0 top-0 w-1/3 h-full z-10 cursor-pointer" onClick={goPrev} />
              <button className="absolute right-0 top-0 w-2/3 h-full z-10 cursor-pointer" onClick={goNext} />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-[#444] select-none px-6 text-center">
              <svg className="w-10 h-10 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
              <p className="text-[13px] leading-relaxed">
                {viewingDate ? "No photos for this day" : "Click a day to view photos"}
              </p>
            </div>
          )}
        </div>

        {/* RIGHT PANEL — background + calendar */}
        <div
          className="flex-1 relative flex items-center justify-end pr-8"
          style={{
            backgroundImage: 'url("/backgrounds/story_background.png")',
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <Calendar storyImages={storyByDate} onDayClick={handleDayClick} />
        </div>
      </div>
    </div>
  );
}
