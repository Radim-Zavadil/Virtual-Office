import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export async function GET() {
  try {
    const data = await redis.get("event") || { title: "On-Air: Designing the Future", date: "" };
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: "Failed to read event data from Redis" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { title, date } = await req.json();
    const data = { title, date };
    await redis.set("event", data);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ error: "Failed to update event data in Redis" }, { status: 500 });
  }
}
