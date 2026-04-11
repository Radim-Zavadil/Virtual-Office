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

async function writeUsers(users: User[]) {
  await redis.set("users", users);
}

async function readSessions(): Promise<Session[]> {
  const sessions = await redis.get<Session[]>("sessions");
  return sessions || [];
}

export async function PATCH(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const sessions = await readSessions();
  const session = sessions.find((s) => s.token === token);
  if (!session) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const { name, avatar } = await req.json();

  const users = await readUsers();
  const userIndex = users.findIndex((u) => u.id === session.userId);
  if (userIndex === -1) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (name !== undefined) users[userIndex].name = name;
  if (avatar !== undefined) users[userIndex].avatar = avatar;

  await writeUsers(users);

  const user = users[userIndex];
  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar },
  });
}
