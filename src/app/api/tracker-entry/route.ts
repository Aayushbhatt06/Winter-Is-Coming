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
    const body = await request.json();
    const db = await database();
    const user = await db.collection("users").findOne({ _id: new ObjectId(id) });
    if (!user) return NextResponse.json({ error: "Account not found." }, { status: 404 });
    const date = body.date;
    const today = localDateKey(new Date(), user.timeZone || "UTC");
    if (!validDate(date) || date < user.startDate || date > user.endDate || date > today) return NextResponse.json({ error: "Choose a date from your Winter Arc that is today or earlier." }, { status: 400 });
    const values: Record<string, number> = {};
    const trackers = user.trackers || {};
    for (const key of ["weight", "mood", "sleep"] as const) {
      if (body[key] === undefined || body[key] === null || body[key] === "") continue;
      if (key !== "sleep" && !trackers[key]) return NextResponse.json({ error: `Turn on ${key} tracking in your settings first.` }, { status: 403 });
      const value = Number(body[key]);
      const valid = key === "weight" ? Number.isFinite(value) && value > 0 && value <= 700 : key === "mood" ? Number.isInteger(value) && value >= 1 && value <= 5 : Number.isFinite(value) && value >= 0 && value <= 24;
      if (!valid) return NextResponse.json({ error: `Enter a valid ${key} value.` }, { status: 400 });
      values[key] = value;
    }
    if (!Object.keys(values).length) return NextResponse.json({ error: "Add at least one tracker value." }, { status: 400 });
    const collection = db.collection("trackerEntries");
    await collection.createIndex({ userId: 1, date: 1 }, { unique: true });
    await collection.updateOne({ userId: id, date }, { $set: { userId: id, date, ...values, updatedAt: new Date() } }, { upsert: true });
    const entry = await collection.findOne({ userId: id, date }, { projection: { _id: 0, userId: 0, updatedAt: 0 } });
    return NextResponse.json({ ok: true, entry });
  } catch (error) {
    console.error("Tracker entry save failed:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Could not save this tracker entry. Please try again." }, { status: 500 });
  }
}
