import { NextRequest, NextResponse } from "next/server";
import { getOptionalSessionUser } from "@/lib/server/auth";
import { getAccountProfile, updateAccountProfile } from "@/lib/server/profile";

export async function GET() {
  const user = await getOptionalSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getAccountProfile(user.id);
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  return NextResponse.json({ profile });
}

export async function PATCH(request: NextRequest) {
  const user = await getOptionalSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { first_name?: unknown; last_name?: unknown; avatar_url?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const profile = await updateAccountProfile(user.id, body);
    return NextResponse.json({ profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update profile.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
