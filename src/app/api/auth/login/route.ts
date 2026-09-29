import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { database } from "@/lib/db";
import { createSession } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    const user = await (await database()).collection("users").findOne({ email: String(email || "").trim().toLowerCase() });
    if (!user || !await compare(String(password || ""), user.passwordHash)) return NextResponse.json({ error: "Email or password doesn’t match." }, { status: 401 });
    await createSession(user._id.toString());
    return NextResponse.json({ ok: true });
  } catch (error) { console.error("Login failed", error); return NextResponse.json({ error: "Could not log in. Please try again." }, { status: 500 }); }
}
