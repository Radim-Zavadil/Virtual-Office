"use client";

import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Guests are identified via localStorage (they may not have a logged-in session).
  // Computed during render to avoid setState-in-effect lint issues.
  const [isGuest, setIsGuest] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setIsGuest(localStorage.getItem("virtualOffice_isGuest") === "true");
  }, []);

  useEffect(() => {
    if (isMounted && !loading && !user && !isGuest) {
      router.replace("/login");
    }
  }, [user, loading, router, isGuest, isMounted]);

  if (!isMounted || (loading && !isGuest)) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0b0d",
        }}
      />
    );
  }

  // For guests we allow rendering even without a session.
  if (!user && !isGuest) return null;

  return <>{children}</>;
}
