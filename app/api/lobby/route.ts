import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const dataFile = path.join(process.cwd(), 'data', 'lobby.json');

export async function GET() {
  try {
    const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    
    // Filter stale guests (lastSeen > 20s ago)
    const now = Date.now();
    const staleThreshold = 20000; // 20 seconds
    
    if (data.guests) {
      data.guests = data.guests.filter((g: any) => g.lastSeen && (now - g.lastSeen) < staleThreshold);
    }
    if (data.approvedGuests) {
      data.approvedGuests = data.approvedGuests.filter((g: any) => g.lastSeen && (now - g.lastSeen) < staleThreshold);
    }
    
    // Clear hostRoom if stale
    if (data.hostLastSeen && (now - data.hostLastSeen) > staleThreshold) {
      data.hostRoom = null;
    }
    
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ active: false, linkId: null, guests: [], approvedGuests: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const currentData = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

    let newData = { ...currentData };
    if (!newData.approvedGuests) {
      newData.approvedGuests = [];
    }

    if (body.action === 'activate') {
      newData.active = true;
      newData.linkId = body.linkId;
      newData.guests = [];
      newData.approvedGuests = [];
    } else if (body.action === 'deactivate') {
      newData.active = false;
      newData.linkId = null;
      newData.guests = [];
    } else if (body.action === 'add_guest') {
      const guest = {
        id: body.guest.id,
        name: `Guest ${newData.guests.length + 1}`,
        lastSeen: Date.now(),
      };
      if (!newData.guests.find((g: any) => g.id === guest.id)) {
        newData.guests.push(guest);
      }
    } else if (body.action === 'remove_guest') {
      // Find guest in either waiting list OR approved list (to handle transfers)
      let guest = newData.guests?.find((g: any) => g.id === body.guestId);
      if (!guest) {
        guest = newData.approvedGuests?.find((g: any) => g.id === body.guestId);
      }
      
      // Remove from both to be safe (idempotency)
      newData.guests = newData.guests?.filter((g: any) => g.id !== body.guestId) || [];
      newData.approvedGuests = newData.approvedGuests?.filter((g: any) => g.id !== body.guestId) || [];
      
      if (body.roomId && guest) {
        guest.roomId = body.roomId;
        guest.lastSeen = Date.now();
        newData.approvedGuests.push(guest);
      }
    } else if (body.action === 'clear_guests') {
      newData.guests = [];
      newData.approvedGuests = [];
    } else if (body.action === 'heartbeat') {
      const gId = body.guestId;
      const now = Date.now();
      
      const guest = newData.guests?.find((g: any) => g.id === gId);
      if (guest) guest.lastSeen = now;
      
      const approved = newData.approvedGuests?.find((g: any) => g.id === gId);
      if (approved) approved.lastSeen = now;
    } else if (body.action === 'host_heartbeat') {
      const now = Date.now();
      newData.hostRoom = body.hostRoom;
      newData.hostLastSeen = now;
    } else if (body.action === 'kick_guest') {
      const gId = body.guestId;
      newData.guests = newData.guests?.filter((g: any) => g.id !== gId) || [];
      newData.approvedGuests = newData.approvedGuests?.filter((g: any) => g.id !== gId) || [];
    }

    fs.writeFileSync(dataFile, JSON.stringify(newData, null, 2));
    return NextResponse.json(newData);
  } catch (error) {
    console.error("POST /api/lobby error:", error);
    return NextResponse.json({ error: 'Failed to update lobby state' }, { status: 500 });
  }
}
