import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOptionalSessionUser } from "@/lib/server/auth";
import { getProjectAccessForUser } from "@/lib/server/data";
import { listCanonicalDocs, pinCustomDoc } from "@/lib/server/canonical-docs";

const listSchema = z.object({ projectId: z.string().uuid() });
const pinSchema = z.object({
  projectId: z.string().uuid(),
  slug: z.string().min(1).max(64),
  title: z.string().min(1).max(120),
});

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId") ?? "";
  const parsed = listSchema.safeParse({ projectId });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid projectId" }, { status: 400 });
  }

  const user = await getOptionalSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await getProjectAccessForUser(user.id, parsed.data.projectId);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const docs = await listCanonicalDocs(parsed.data.projectId);
  return NextResponse.json({ docs });
}

export async function POST(request: NextRequest) {
  const body = pinSchema.parse(await request.json());

  const user = await getOptionalSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await getProjectAccessForUser(user.id, body.projectId);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (access.role === "viewer") {
    return NextResponse.json({ error: "Viewers have read-only access." }, { status: 403 });
  }

  try {
    const doc = await pinCustomDoc(body.projectId, body.slug, body.title);
    return NextResponse.json({ doc });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to pin doc" },
      { status: 400 },
    );
  }
}
