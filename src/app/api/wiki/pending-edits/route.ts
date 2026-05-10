import { NextResponse } from "next/server";
import { z } from "zod";

import {
  listPendingEditsForProject,
  listPendingEditsForProjectDoc,
} from "@/lib/server/wiki-edits";

const querySchema = z.object({
  projectId: z.string().uuid(),
  targetDocId: z.string().uuid().optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    projectId: url.searchParams.get("projectId") ?? undefined,
    targetDocId: url.searchParams.get("targetDocId") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query." }, { status: 400 });
  }

  try {
    const groups = parsed.data.targetDocId
      ? await listPendingEditsForProjectDoc(parsed.data.projectId, parsed.data.targetDocId)
      : await listPendingEditsForProject(parsed.data.projectId);
    return NextResponse.json({ groups });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to list pending edits." },
      { status: 400 },
    );
  }
}
