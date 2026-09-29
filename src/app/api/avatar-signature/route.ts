import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { ObjectId } from "mongodb";
import { database } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";

export async function POST() {
  const id = await getSessionUserId();
  if (!id || !ObjectId.isValid(id)) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return NextResponse.json({ error: "Photo uploads aren’t configured yet." }, { status: 503 });
  const user = await (await database()).collection("users").findOne({ _id: new ObjectId(id) });
  if (!user?.trackers?.photo) return NextResponse.json({ error: "Turn on profile photos in your settings first." }, { status: 403 });
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = `winter-arc/${id}`;
  const signature = createHash("sha1").update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`).digest("hex");
  return NextResponse.json({ cloudName, apiKey, timestamp, folder, signature });
}
