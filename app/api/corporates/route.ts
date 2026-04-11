import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import crypto from "crypto";

interface Corporate {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
}

interface Session {
  token: string;
  userId: string;
}

async function readCorporates(): Promise<Corporate[]> {
  const corporates = await redis.get<Corporate[]>("corporates");
  return corporates || [];
}

async function writeCorporates(corporates: Corporate[]) {
  await redis.set("corporates", corporates);
}

async function readSessions(): Promise<Session[]> {
  const sessions = await redis.get<Session[]>("sessions");
  return sessions || [];
}

async function getUserIdFromRequest(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get("session")?.value;
  if (!token) return null;
  const sessions = await readSessions();
  const session = sessions.find((s) => s.token === token);
  return session?.userId ?? null;
}

export async function GET(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const corporates = await readCorporates();
  const userCorporates = corporates.filter((c) => c.ownerId === userId);
  return NextResponse.json({ corporates: userCorporates });
}

export async function POST(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const corporateId = `corp-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  const corporate: Corporate = {
    id: corporateId,
    name: name.trim(),
    ownerId: userId,
    createdAt: new Date().toISOString(),
  };

  const corporates = await readCorporates();
  corporates.push(corporate);
  await writeCorporates(corporates);

  // Initialize corporate map with default map template
  try {
    const defaultMap = await redis.get("map:default");
    await redis.set(`map:${corporateId}`, defaultMap);
  } catch (err) {
    console.error("Failed to initialize corporate map in Redis:", err);
  }

  return NextResponse.json({ corporate });
}

export async function DELETE(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await req.json();
  const corporates = await readCorporates();
  const filtered = corporates.filter((c) => !(c.id === id && c.ownerId === userId));
  await writeCorporates(filtered);

  // Optionally delete map key as well
  await redis.del(`map:${id}`);

  return NextResponse.json({ success: true });
}
