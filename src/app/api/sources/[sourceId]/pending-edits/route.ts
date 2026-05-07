import { NextResponse } from "next/server";
import { z } from "zod";

import { listPendingEditsForSource } from "@/lib/server/wiki-edits";

const paramsSchema = z.object({ sourceId: z.string().uuid() });

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sourceId: string }> },
) {
  const parsed = paramsSchema.safeParse(await params);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid sourceId" }, { status: 400 });
  }

  try {
    const groups = await listPendingEditsForSource(parsed.data.sourceId);
    return NextResponse.json({ groups });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to list pending edits." },
      { status: 400 },
    );
  }
}
