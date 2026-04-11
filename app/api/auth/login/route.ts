import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import bcrypt from "bcryptjs";
import crypto from "crypto";

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

async function writeSessions(sessions: Session[]) {
  await redis.set("sessions", sessions);
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    console.log(`[LOGIN] Attempt for email: ${email}`);

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const users = await readUsers();
    console.log(`[LOGIN] Found ${users.length} users in database`);

    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      console.log(`[LOGIN] User not found: ${email}`);
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    console.log(`[LOGIN] Characterizing password comparison for user: ${user.id}`);
    const valid = await bcrypt.compare(password, user.passwordHash);

    if (!valid) {
      console.log(`[LOGIN] Password mismatch for user: ${email}`);
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    // Create session
    console.log(`[LOGIN] Creating session for user: ${user.id}`);
    const token = crypto.randomBytes(32).toString("hex");
    const sessions = await readSessions();
    sessions.push({ token, userId: user.id });
    await writeSessions(sessions);

    const res = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar },
    });
    res.cookies.set("session", token, {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "lax",
    });
    console.log(`[LOGIN] Success for user: ${email}`);
    return res;
  } catch (error: any) {
    console.error("[LOGIN] Unhandled error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
