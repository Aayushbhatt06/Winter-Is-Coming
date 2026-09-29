import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { database } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";
export async function PATCH(request: Request) {
  const id = await getSessionUserId();
  if (!id || !ObjectId.isValid(id)) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  const { photoUrl } = await request.json();
  if (typeof photoUrl !== "string" || !photoUrl.startsWith("https://res.cloudinary.com/") || photoUrl.length > 1000) return NextResponse.json({ error: "That photo URL doesn’t look right." }, { status: 400 });
  await (await database()).collection("users").updateOne({ _id: new ObjectId(id), "trackers.photo": true }, { $set: { photoUrl } });
  return NextResponse.json({ ok: true, photoUrl });
}
