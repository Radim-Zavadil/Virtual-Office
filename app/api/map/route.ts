import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const DATA_DIR = join(process.cwd(), "data", "maps");
const DEFAULT_MAP_PATH = join(process.cwd(), "data", "map.json");

if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

function getMapPath(corporateId: string | null) {
  if (!corporateId) return DEFAULT_MAP_PATH;
  return join(DATA_DIR, `${corporateId}.json`);
}

function readMap(path: string) {
  try {
    if (!existsSync(path)) {
      // Fallback to default map if corporate-specific map doesn't exist
      return JSON.parse(readFileSync(DEFAULT_MAP_PATH, "utf-8"));
    }
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return { floors: [] };
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const corporateId = searchParams.get("corporateId");
  const path = getMapPath(corporateId);
  const data = readMap(path);
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const corporateId = searchParams.get("corporateId");
  const body = await request.json();
  const path = getMapPath(corporateId);
  
  writeFileSync(path, JSON.stringify(body, null, 2), "utf-8");
  return NextResponse.json({ ok: true });
}
