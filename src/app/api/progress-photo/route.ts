import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { database } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";
import { localDateKey } from "@/lib/date";

function validDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}

export async function POST(request: Request) {
  const id = await getSessionUserId();
  if (!id || !ObjectId.isValid(id)) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  try {
    const { date, photoUrl } = await request.json();
    if (typeof photoUrl !== "string" || !/^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//.test(photoUrl) || photoUrl.length > 1500) return NextResponse.json({ error: "That photo URL doesn’t look right." }, { status: 400 });
    const db = await database();
    const user = await db.collection("users").findOne({ _id: new ObjectId(id) });
    if (!user?.trackers?.progressPhoto) return NextResponse.json({ error: "Turn on progress photos in your settings first." }, { status: 403 });
    const today = localDateKey(new Date(), user.timeZone || "UTC");
    if (!validDate(date) || date < user.startDate || date > user.endDate || date > today) return NextResponse.json({ error: "Choose a date from your Winter Arc that is today or earlier." }, { status: 400 });
    const collection = db.collection("progressPhotos");
    await collection.createIndex({ userId: 1, date: 1 }, { unique: true });
    await collection.updateOne({ userId: id, date }, { $set: { userId: id, date, photoUrl, updatedAt: new Date() } }, { upsert: true });
    return NextResponse.json({ ok: true, photo: { date, photoUrl } });
  } catch (error) { console.error("Progress photo save failed", error); return NextResponse.json({ error: "Could not save your progress photo." }, { status: 500 }); }
}
