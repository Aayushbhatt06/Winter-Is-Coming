import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { database } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";
import type { Profile } from "@/lib/types";

export async function GET() {
  const id = await getSessionUserId();
  if (!id || !ObjectId.isValid(id)) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  try {
    const db = await database();
    const user = await db.collection("users").findOne({ _id: new ObjectId(id) });
    if (!user) return NextResponse.json({ error: "Account not found." }, { status: 404 });
    const { passwordHash: _passwordHash, ...profile } = user;
    const checkins = await db.collection("checkins").find({ userId: id }).sort({ date: 1 }).toArray();
    const trackerEntries = await db.collection("trackerEntries").find({ userId: id }).sort({ date: 1 }).toArray();
    const progressPhotos = await db.collection("progressPhotos").find({ userId: id }).sort({ date: 1 }).toArray();
    return NextResponse.json({ profile: { ...profile, _id: id } as Profile, checkins: checkins.map(({ _id, userId: _uid, ...checkin }) => checkin), trackerEntries: trackerEntries.map(({ _id, userId: _uid, ...entry }) => entry), progressPhotos: progressPhotos.map(({ _id, userId: _uid, ...photo }) => ({ ...photo, id: _id.toString() })) });
  } catch (error) { console.error("Profile read failed", error); return NextResponse.json({ error: "Could not load your Winter Arc." }, { status: 500 }); }
}
