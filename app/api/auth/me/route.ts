import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";

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

async function readUsers(): Promise<User[]> {
  const users = await redis.get<User[]>("users");
  return users || [];
}

async function readSessions(): Promise<Session[]> {
  const sessions = await redis.get<Session[]>("sessions");
  return sessions || [];
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const sessions = await readSessions();
  const session = sessions.find((s) => s.token === token);
  if (!session) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const users = await readUsers();
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

  const users = await readUsers();
  const exists = users.some((u) => u.email.toLowerCase() === email.toLowerCase());
  return NextResponse.json({ exists });
}
