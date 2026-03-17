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

export async function PATCH(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const sessions = readSessions();
  const session = sessions.find((s) => s.token === token);
  if (!session) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const { name, avatar } = await req.json();

  const users = readUsers();
  const userIndex = users.findIndex((u) => u.id === session.userId);
  if (userIndex === -1) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (name !== undefined) users[userIndex].name = name;
  if (avatar !== undefined) users[userIndex].avatar = avatar;

  writeUsers(users);

  const user = users[userIndex];
  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar },
  });
}
