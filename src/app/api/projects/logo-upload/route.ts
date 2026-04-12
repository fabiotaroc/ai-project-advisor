import { Buffer } from "node:buffer";
import { NextRequest, NextResponse } from "next/server";
import { getOptionalSessionUser } from "@/lib/server/auth";
import { getProjectAccessForUser } from "@/lib/server/data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024;

function getFileExtension(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  return extension && extension.length > 0 ? extension : "png";
}

export async function POST(request: NextRequest) {
  const user = await getOptionalSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { projectId?: string; fileName?: string; fileType?: string; fileBase64?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { projectId, fileName, fileType, fileBase64 } = body;

  if (typeof projectId !== "string" || typeof fileBase64 !== "string" || fileBase64.length === 0) {
    return NextResponse.json({ error: "Missing logo file or projectId." }, { status: 400 });
  }

  const access = await getProjectAccessForUser(user.id, projectId);

  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (access.role !== "owner") {
    return NextResponse.json(
      { error: "Only the project owner can upload a project logo." },
      { status: 403 },
    );
  }

  const contentType =
    typeof fileType === "string" && fileType.startsWith("image/") ? fileType : "image/png";

  const buffer = Buffer.from(fileBase64, "base64");
  if (buffer.byteLength === 0) {
    return NextResponse.json({ error: "Missing logo file." }, { status: 400 });
  }

  if (buffer.byteLength > MAX_LOGO_SIZE_BYTES) {
    return NextResponse.json({ error: "Logo must be 5MB or smaller." }, { status: 400 });
  }

  const safeName = typeof fileName === "string" ? fileName : "logo.png";
  const storagePath = `${projectId}/logo-${Date.now()}.${getFileExtension(safeName)}`;
  const admin = createSupabaseAdminClient();
  const { error } = await admin.storage.from("project-logos").upload(storagePath, buffer, {
    contentType,
    upsert: true,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = admin.storage.from("project-logos").getPublicUrl(storagePath);

  return NextResponse.json({ publicUrl, path: storagePath });
}
