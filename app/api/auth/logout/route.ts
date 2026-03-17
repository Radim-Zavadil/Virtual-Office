import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const SESSIONS_FILE = path.join(process.cwd(), "data", "sessions.json");

interface Session {
  token: string;
  userId: string;
}

function readSessions(): Session[] {
  try {
    return JSON.parse(fs.readFileSync(SESSIONS_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function writeSessions(sessions: Session[]) {
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("session")?.value;

  if (token) {
    const sessions = readSessions();
    const filtered = sessions.filter((s) => s.token !== token);
    writeSessions(filtered);
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set("session", "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
    sameSite: "lax",
  });
  return res;
}
