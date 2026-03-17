import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import crypto from "crypto";

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

function writeSessions(sessions: Session[]) {
  if (!fs.existsSync(path.dirname(SESSIONS_FILE))) {
    fs.mkdirSync(path.dirname(SESSIONS_FILE), { recursive: true });
  }
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
}

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const users = readUsers();
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  // Create session
  const token = crypto.randomBytes(32).toString("hex");
  const sessions = readSessions();
  sessions.push({ token, userId: user.id });
  writeSessions(sessions);

  const res = NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar },
  });
  res.cookies.set("session", token, {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
  });
  return res;
}
