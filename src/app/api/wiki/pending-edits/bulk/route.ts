import { NextResponse } from "next/server";
import { z } from "zod";

import { bulkResolveEditsForProjectDoc } from "@/lib/server/wiki-edits";

const bodySchema = z.object({
  projectId: z.string().uuid(),
  targetDocId: z.string().uuid(),
  action: z.enum(["accept", "reject"]),
  editIds: z.array(z.string().uuid()).optional(),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    const result = await bulkResolveEditsForProjectDoc(
      parsed.data.projectId,
      parsed.data.targetDocId,
      parsed.data.action,
      parsed.data.editIds,
    );
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to resolve pending edits." },
      { status: 400 },
    );
  }
}
