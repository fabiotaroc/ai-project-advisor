import { NextResponse } from "next/server";
import { z } from "zod";

import { bulkResolveEditsForSource } from "@/lib/server/wiki-edits";

const paramsSchema = z.object({ sourceId: z.string().uuid() });
const bodySchema = z.object({ action: z.enum(["accept", "reject"]) });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sourceId: string }> },
) {
  const parsedParams = paramsSchema.safeParse(await params);
  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid sourceId" }, { status: 400 });
  }

  const parsedBody = bodySchema.safeParse(await request.json());
  if (!parsedBody.success) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  try {
    const result = await bulkResolveEditsForSource(
      parsedParams.data.sourceId,
      parsedBody.data.action,
    );
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to resolve pending edits." },
      { status: 400 },
    );
  }
}
