import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const USERS_FILE = path.join(process.cwd(), "data", "users.json");
const SESSIONS_FILE = path.join(process.cwd(), "data", "sessions.json");

interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  avatar: string | null;
}

interface Session {
  token: string;
  userId: string;
}

function readUsers(): User[] {
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function readSessions(): Session[] {
  try {
    return JSON.parse(fs.readFileSync(SESSIONS_FILE, "utf-8"));
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const sessions = readSessions();
  const session = sessions.find((s) => s.token === token);
  if (!session) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const users = readUsers();
  const user = users.find((u) => u.id === session.userId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar },
  });
}

// Also handle checking if email exists (used during login flow)
export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ exists: false });

  const users = readUsers();
  const exists = users.some((u) => u.email.toLowerCase() === email.toLowerCase());
  return NextResponse.json({ exists });
}
