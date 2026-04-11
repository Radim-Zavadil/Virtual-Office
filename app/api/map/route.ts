import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";

async function readMap(corporateId: string | null) {
  try {
    const key = corporateId ? `map:${corporateId}` : "map:default";
    const data = await redis.get(key);
    
    if (!data && corporateId) {
      // Fallback to default map if corporate-specific map doesn't exist
      return await redis.get("map:default");
    }
    
    return data || { floors: [] };
  } catch {
    return { floors: [] };
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const corporateId = searchParams.get("corporateId");
  const data = await readMap(corporateId);
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const corporateId = searchParams.get("corporateId");
  const body = await request.json();
  
  const key = corporateId ? `map:${corporateId}` : "map:default";
  await redis.set(key, body);
  
  return NextResponse.json({ ok: true });
}
