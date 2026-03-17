import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const CORPORATES_FILE = path.join(process.cwd(), "data", "corporates.json");
const SESSIONS_FILE = path.join(process.cwd(), "data", "sessions.json");
const MAPS_DIR = path.join(process.cwd(), "data", "maps");
const DEFAULT_MAP_PATH = path.join(process.cwd(), "data", "map.json");

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

function readCorporates(): Corporate[] {
  try {
    return JSON.parse(fs.readFileSync(CORPORATES_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function writeCorporates(corporates: Corporate[]) {
  fs.writeFileSync(CORPORATES_FILE, JSON.stringify(corporates, null, 2));
}

function readSessions(): Session[] {
  try {
    return JSON.parse(fs.readFileSync(SESSIONS_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function getUserIdFromRequest(req: NextRequest): string | null {
  const token = req.cookies.get("session")?.value;
  if (!token) return null;
  const sessions = readSessions();
  const session = sessions.find((s) => s.token === token);
  return session?.userId ?? null;
}

export async function GET(req: NextRequest) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const corporates = readCorporates();
  const userCorporates = corporates.filter((c) => c.ownerId === userId);
  return NextResponse.json({ corporates: userCorporates });
}

export async function POST(req: NextRequest) {
  const userId = getUserIdFromRequest(req);
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

  const corporates = readCorporates();
  corporates.push(corporate);
  writeCorporates(corporates);

  // Initialize corporate map with default map template
  if (!fs.existsSync(MAPS_DIR)) fs.mkdirSync(MAPS_DIR, { recursive: true });
  try {
    const defaultMap = fs.readFileSync(DEFAULT_MAP_PATH, "utf-8");
    fs.writeFileSync(path.join(MAPS_DIR, `${corporateId}.json`), defaultMap);
  } catch (err) {
    console.error("Failed to initialize corporate map:", err);
  }

  return NextResponse.json({ corporate });
}

export async function DELETE(req: NextRequest) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await req.json();
  const corporates = readCorporates();
  const filtered = corporates.filter((c) => !(c.id === id && c.ownerId === userId));
  writeCorporates(filtered);

  // Optionally delete map file as well
  const mapPath = path.join(MAPS_DIR, `${id}.json`);
  if (fs.existsSync(mapPath)) {
    fs.unlinkSync(mapPath);
  }

  return NextResponse.json({ success: true });
}
