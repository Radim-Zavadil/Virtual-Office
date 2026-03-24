import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const dataFile = path.join(process.cwd(), "data", "event.json");

export async function GET() {
  try {
    if (!fs.existsSync(dataFile)) {
      return NextResponse.json({ title: "On-Air: Designing the Future", date: "" });
    }
    const data = JSON.parse(fs.readFileSync(dataFile, "utf-8"));
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: "Failed to read event data" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { title, date } = await req.json();
    const data = { title, date };
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ error: "Failed to update event data" }, { status: 500 });
  }
}
