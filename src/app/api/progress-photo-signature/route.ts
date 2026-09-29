import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
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
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return NextResponse.json({ error: "Photo uploads aren’t configured yet." }, { status: 503 });
  const user = await (await database()).collection("users").findOne({ _id: new ObjectId(id) });
  if (!user?.trackers?.progressPhoto) return NextResponse.json({ error: "Turn on progress photos in your settings first." }, { status: 403 });
  const body = await request.json();
  const date = body.date;
  const today = localDateKey(new Date(), user.timeZone || "UTC");
  if (!validDate(date) || date < user.startDate || date > user.endDate || date > today) return NextResponse.json({ error: "Choose a date from your Winter Arc that is today or earlier." }, { status: 400 });
  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = `winter-arc/${id}/progress/${date}`;
  const signature = createHash("sha1").update(`overwrite=true&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`).digest("hex");
  return NextResponse.json({ cloudName, apiKey, timestamp, publicId, overwrite: true, signature, date });
}
