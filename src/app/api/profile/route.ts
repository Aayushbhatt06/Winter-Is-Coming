import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { database } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";
import { localDateKey } from "@/lib/date";

export async function PATCH(request: Request) {
  const id = await getSessionUserId();
  if (!id || !ObjectId.isValid(id)) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  try {
    const body = await request.json();
    const goals = Array.isArray(body.goals) ? body.goals.slice(0, 20).filter((goal: any) => typeof goal.name === "string" && goal.name.trim()).map((goal: any) => ({ id: String(goal.id), name: String(goal.name).trim().slice(0, 90), category: String(goal.category || "Personal").slice(0, 30), frequency: goal.frequency === "weekly" ? "weekly" : "daily" })) : [];
    if (!goals.length) return NextResponse.json({ error: "Keep at least one goal in your Winter Arc." }, { status: 400 });
    const startDate = String(body.startDate || "");
    const endDate = String(body.endDate || "");
    if (!startDate || !endDate || endDate < startDate) return NextResponse.json({ error: "Choose a valid date range." }, { status: 400 });
    const user = await (await database()).collection("users").findOne({ _id: new ObjectId(id) });
    if (!user) return NextResponse.json({ error: "Account not found." }, { status: 404 });
    const today = localDateKey(new Date(), user.timeZone || "UTC");
    if (startDate !== user.startDate && startDate < today) return NextResponse.json({ error: "A Winter Arc can’t be moved back to include past days." }, { status: 400 });
    if (endDate < today) return NextResponse.json({ error: "Your Winter Arc can’t end before today." }, { status: 400 });
    await (await database()).collection("users").updateOne({ _id: new ObjectId(id) }, { $set: { goals, startDate, endDate, theme: ["forest", "ocean", "sunset", "lavender"].includes(body.theme) ? body.theme : "forest", trackers: { weight: !!body.trackers?.weight, mood: !!body.trackers?.mood, sleep: true, photo: !!body.trackers?.photo, progressPhoto: !!body.trackers?.progressPhoto } } });
    return NextResponse.json({ ok: true });
  } catch (error) { console.error("Profile update failed", error); return NextResponse.json({ error: "Could not update your settings." }, { status: 500 }); }
}
