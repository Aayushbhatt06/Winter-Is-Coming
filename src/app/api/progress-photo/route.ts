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
  try {
    const { date, photoUrl, publicId } = await request.json();
    if (typeof photoUrl !== "string" || !/^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//.test(photoUrl) || photoUrl.length > 1500) return NextResponse.json({ error: "That photo URL doesn’t look right." }, { status: 400 });
    const db = await database();
    const user = await db.collection("users").findOne({ _id: new ObjectId(id) });
    if (!user?.trackers?.progressPhoto) return NextResponse.json({ error: "Turn on progress photos in your settings first." }, { status: 403 });
    const today = localDateKey(new Date(), user.timeZone || "UTC");
    if (!validDate(date) || date < user.startDate || date > user.endDate || date > today) return NextResponse.json({ error: "Choose a date from your Winter Arc that is today or earlier." }, { status: 400 });
    if (typeof publicId !== "string" || !publicId.startsWith(`winter-arc/${id}/progress/${date}/`)) return NextResponse.json({ error: "That photo doesn’t belong to this date in your progress folder." }, { status: 400 });
    const uploadedUrl = new URL(photoUrl);
    const uploadPrefix = `/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/`;
    const deliveredPublicId = uploadedUrl.pathname.startsWith(uploadPrefix) ? uploadedUrl.pathname.slice(uploadPrefix.length).replace(/^v\d+\//, "").replace(/\.[^/.]+$/, "") : "";
    if (uploadedUrl.hostname !== "res.cloudinary.com" || deliveredPublicId !== publicId) return NextResponse.json({ error: "That photo doesn’t belong to this date in your progress folder." }, { status: 400 });
    const collection = db.collection("progressPhotos");
    const indexes = await collection.listIndexes().toArray();
    const legacyUniqueDateIndex = indexes.find((index) => index.unique && index.key?.userId === 1 && index.key?.date === 1 && Object.keys(index.key).length === 2);
    if (legacyUniqueDateIndex?.name) await collection.dropIndex(legacyUniqueDateIndex.name);
    await collection.createIndex({ userId: 1, date: 1 });
    const result = await collection.insertOne({ userId: id, date, photoUrl, publicId, updatedAt: new Date() });
    return NextResponse.json({ ok: true, photo: { id: result.insertedId.toString(), date, photoUrl, publicId } });
  } catch (error) { console.error("Progress photo save failed", error); return NextResponse.json({ error: "Could not save your progress photo." }, { status: 500 }); }
}

export async function DELETE(request: Request) {
  const id = await getSessionUserId();
  if (!id || !ObjectId.isValid(id)) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  try {
    const { id: photoId } = await request.json();
    if (typeof photoId !== "string" || !ObjectId.isValid(photoId)) return NextResponse.json({ error: "Choose a valid progress photo." }, { status: 400 });
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) return NextResponse.json({ error: "Photo management isn’t configured yet." }, { status: 503 });
    const collection = (await database()).collection("progressPhotos");
    const photo = await collection.findOne({ _id: new ObjectId(photoId), userId: id });
    if (!photo) return NextResponse.json({ error: "That progress photo was already removed." }, { status: 404 });

    const ownedFolder = `winter-arc/${id}/progress/`;
    let publicId = typeof photo.publicId === "string" ? photo.publicId : "";
    if (!publicId) {
      const url = new URL(String(photo.photoUrl));
      const uploadPrefix = `/${cloudName}/image/upload/`;
      if (url.hostname !== "res.cloudinary.com" || !url.pathname.startsWith(uploadPrefix)) return NextResponse.json({ error: "This photo can’t be managed from this account." }, { status: 400 });
      publicId = url.pathname.slice(uploadPrefix.length).replace(/^v\d+\//, "").replace(/\.[^/.]+$/, "");
    }
    if (!publicId.startsWith(ownedFolder)) return NextResponse.json({ error: "This photo doesn’t belong to your progress-photo folder." }, { status: 403 });

    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createHash("sha1").update(`invalidate=true&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`).digest("hex");
    const form = new FormData();
    form.set("public_id", publicId);
    form.set("timestamp", String(timestamp));
    form.set("api_key", apiKey);
    form.set("invalidate", "true");
    form.set("signature", signature);
    const cloudinaryResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, { method: "POST", body: form });
    const cloudinaryResult = await cloudinaryResponse.json();
    if (!cloudinaryResponse.ok || !["ok", "not found"].includes(cloudinaryResult.result)) {
      console.error("Cloudinary progress-photo deletion failed:", cloudinaryResult.result || cloudinaryResult.error?.message || cloudinaryResponse.status);
      return NextResponse.json({ error: "Couldn’t remove the photo from Cloudinary. Please try again." }, { status: 502 });
    }
    await collection.deleteOne({ _id: photo._id, userId: id });
    return NextResponse.json({ ok: true, date: photo.date, id: photoId });
  } catch (error) {
    console.error("Progress-photo deletion failed:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Couldn’t remove this progress photo. Please try again." }, { status: 500 });
  }
}
