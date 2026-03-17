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

function writeUsers(users: User[]) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
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
  const existingUser = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

  if (existingUser) {
    return NextResponse.json({ error: "User already exists" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const newUser: User = {
    id: `user-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
    email: email.toLowerCase().trim(),
    passwordHash,
    name: email.split("@")[0],
    avatar: null,
  };

  users.push(newUser);
  writeUsers(users);

  // Create session
  const token = crypto.randomBytes(32).toString("hex");
  const sessions = readSessions();
  sessions.push({ token, userId: newUser.id });
  writeSessions(sessions);

  const res = NextResponse.json({
    user: { id: newUser.id, email: newUser.email, name: newUser.name, avatar: newUser.avatar },
  });
  res.cookies.set("session", token, {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    sameSite: "lax",
  });
  return res;
}
