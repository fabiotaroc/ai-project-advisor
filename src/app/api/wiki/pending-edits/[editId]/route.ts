import { NextResponse } from "next/server";
import { z } from "zod";

import { acceptPendingEdit, rejectPendingEdit } from "@/lib/server/wiki-edits";

const paramsSchema = z.object({ editId: z.string().uuid() });
const bodySchema = z.object({ action: z.enum(["accept", "reject"]) });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ editId: string }> },
) {
  const parsedParams = paramsSchema.safeParse(await params);
  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid editId" }, { status: 400 });
  }

  const parsedBody = bodySchema.safeParse(await request.json());
  if (!parsedBody.success) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  try {
    const edit =
      parsedBody.data.action === "accept"
        ? await acceptPendingEdit(parsedParams.data.editId)
        : await rejectPendingEdit(parsedParams.data.editId);

    return NextResponse.json({ edit });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to resolve pending edit." },
      { status: 400 },
    );
  }
}
