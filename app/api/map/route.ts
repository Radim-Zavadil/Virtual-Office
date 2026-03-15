import { NextResponse } from "next/server";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const DATA_PATH = join(process.cwd(), "data", "map.json");

function readMap() {
  try {
    return JSON.parse(readFileSync(DATA_PATH, "utf-8"));
  } catch {
    return { floors: [] };
  }
}

export async function GET() {
  const data = readMap();
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  writeFileSync(DATA_PATH, JSON.stringify(body, null, 2), "utf-8");
  return NextResponse.json({ ok: true });
}
