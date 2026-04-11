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

async function writeUsers(users: User[]) {
  await redis.set("users", users);
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
    console.log(`[REGISTER] Attempt for email: ${email}`);

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const users = await readUsers();
    const existingUser = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

    if (existingUser) {
      console.log(`[REGISTER] User already exists: ${email}`);
      return NextResponse.json({ error: "User already exists" }, { status: 409 });
    }

    console.log(`[REGISTER] Hashing password...`);
    const passwordHash = await bcrypt.hash(password, 10);
    const newUser: User = {
      id: `user-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
      email: email.toLowerCase().trim(),
      passwordHash,
      name: email.split("@")[0],
      avatar: null,
    };

    users.push(newUser);
    await writeUsers(users);
    console.log(`[REGISTER] User created: ${newUser.id}`);

    // Create session
    const token = crypto.randomBytes(32).toString("hex");
    const sessions = await readSessions();
    sessions.push({ token, userId: newUser.id });
    await writeSessions(sessions);

    const res = NextResponse.json({
      user: { id: newUser.id, email: newUser.email, name: newUser.name, avatar: newUser.avatar },
    });
    res.cookies.set("session", token, {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      sameSite: "lax",
    });
    console.log(`[REGISTER] Success for user: ${email}`);
    return res;
  } catch (error: any) {
    console.error("[REGISTER] Unhandled error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
