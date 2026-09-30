import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { ObjectId } from "mongodb";
import { database } from "@/lib/db";
import { createSession } from "@/lib/session";
import { localDateKey } from "@/lib/date";

export async function POST(request: Request) {
  try {
    const mongoUri = process.env.MONGODB_URI?.trim();
    if (!mongoUri || /<[^>]+>/.test(mongoUri) || !process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
      return NextResponse.json({ error: "The app isn’t configured yet. Add a real MongoDB Atlas connection string to MONGODB_URI in .env.local (replace every placeholder), then restart the dev server." }, { status: 503 });
    }
    const body = await request.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const startDate = String(body.startDate || "");
    const endDate = String(body.endDate || "");
    const timeZone = String(body.timeZone || "UTC");
    const goals = Array.isArray(body.goals) ? body.goals.slice(0, 20).filter((goal: any) => typeof goal.name === "string" && goal.name.trim()).map((goal: any) => ({ id: String(goal.id), name: String(goal.name).trim().slice(0, 90), category: String(goal.category || "Personal").slice(0, 30), frequency: goal.frequency === "weekly" ? "weekly" : "daily" })) : [];
    if (name.length < 2 || name.length > 60 || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8) return NextResponse.json({ error: "Add your name, a valid email, and a password with at least 8 characters." }, { status: 400 });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate) || Number.isNaN(Date.parse(`${startDate}T00:00:00Z`)) || Number.isNaN(Date.parse(`${endDate}T00:00:00Z`)) || endDate < startDate || !goals.length) return NextResponse.json({ error: "Choose a valid Winter Arc date range and at least one goal." }, { status: 400 });
    try { new Intl.DateTimeFormat("en", { timeZone }).format(); } catch { return NextResponse.json({ error: "Choose a valid timezone." }, { status: 400 }); }
    if (startDate < localDateKey(new Date(), timeZone)) return NextResponse.json({ error: "Your Winter Arc can start today or in the future." }, { status: 400 });
    const db = await database();
    if (await db.collection("users").findOne({ email })) return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
    const userId = new ObjectId();
    await db.collection("users").insertOne({ _id: userId, name, email, passwordHash: await hash(password, 12), startDate, endDate, timeZone, theme: ["forest", "ocean", "sunset", "lavender"].includes(body.theme) ? body.theme : "forest", goals, trackers: { weight: !!body.trackers?.weight, mood: !!body.trackers?.mood, sleep: true, photo: !!body.trackers?.photo, progressPhoto: !!body.trackers?.progressPhoto }, createdAt: new Date() });
    await createSession(userId.toString());
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Signup failed:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Could not create your account. Check that MongoDB is reachable and its credentials and Atlas network access are correct." }, { status: 500 });
  }
}
