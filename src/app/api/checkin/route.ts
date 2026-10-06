import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { database } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";
import { localDateKey } from "@/lib/date";

export async function POST(request: Request) {
  const id = await getSessionUserId();
  if (!id || !ObjectId.isValid(id)) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  try {
    const body = await request.json();
    const date = String(body.date || "");
    const db = await database();
    const users = db.collection("users");
    const user = await users.findOne({ _id: new ObjectId(id) });
    if (!user) return NextResponse.json({ error: "Account not found." }, { status: 404 });
    const today = localDateKey(new Date(), user.timeZone || "UTC");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < user.startDate || date > user.endDate || date > today) return NextResponse.json({ error: "Choose today or a past date within your Winter Arc." }, { status: 403 });
    const validIds = new Set(user.goals.map((goal: { id: string }) => goal.id));
    const goalIds = Array.isArray(body.goalIds) ? [...new Set(body.goalIds.filter((goalId: unknown) => typeof goalId === "string" && validIds.has(goalId)))] : [];
    const entry: Record<string, unknown> = { userId: id, date, goalIds, updatedAt: new Date() };
    if (typeof body.note === "string") entry.note = body.note.trim().slice(0, 300);
    const checkins = db.collection("checkins");
    await checkins.createIndex({ userId: 1, date: 1 }, { unique: true });
    await checkins.updateOne({ userId: id, date }, { $set: entry }, { upsert: true });
    return NextResponse.json({ ok: true, checkin: { date, goalIds, weight: entry.weight, mood: entry.mood, sleep: entry.sleep, note: entry.note } });
  } catch (error) { console.error("Check-in save failed", error); return NextResponse.json({ error: "Could not save today’s progress." }, { status: 500 }); }
}
