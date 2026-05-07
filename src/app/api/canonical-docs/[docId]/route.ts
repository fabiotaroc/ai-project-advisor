import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOptionalSessionUser } from "@/lib/server/auth";
import { getProjectAccessForUser } from "@/lib/server/data";
import {
  getCanonicalDocById,
  unpinCustomDoc,
  updateCanonicalDocBody,
} from "@/lib/server/canonical-docs";

const patchSchema = z.object({ body: z.string() });

async function resolveAccess(docId: string) {
  const user = await getOptionalSessionUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const doc = await getCanonicalDocById(docId);
  if (!doc) {
    return { error: NextResponse.json({ error: "Doc not found" }, { status: 404 }) };
  }
  const access = await getProjectAccessForUser(user.id, doc.project_id);
  if (!access) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  if (access.role === "viewer") {
    return {
      error: NextResponse.json({ error: "Viewers have read-only access." }, { status: 403 }),
    };
  }
  return { doc };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ docId: string }> },
) {
  const { docId } = await params;
  const access = await resolveAccess(docId);
  if ("error" in access) return access.error;

  const payload = patchSchema.parse(await request.json());
  const updated = await updateCanonicalDocBody(docId, payload.body);
  return NextResponse.json({ doc: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ docId: string }> },
) {
  const { docId } = await params;
  const access = await resolveAccess(docId);
  if ("error" in access) return access.error;

  try {
    await unpinCustomDoc(docId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete doc" },
      { status: 400 },
    );
  }
}
