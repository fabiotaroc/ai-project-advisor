import { NextResponse } from "next/server";
import { z } from "zod";

import { updateChatPendingEditDraft } from "@/lib/server/wiki-edits";

const paramsSchema = z.object({ editId: z.string().uuid() });
const bodySchema = z.object({
  inserted_text: z.string().min(1),
  target_doc_id: z.string().uuid().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ editId: string }> },
) {
  const parsedParams = paramsSchema.safeParse(await params);
  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid editId" }, { status: 400 });
  }

  const parsedBody = bodySchema.safeParse(await request.json());
  if (!parsedBody.success) {
    return NextResponse.json({ error: "Invalid draft payload" }, { status: 400 });
  }

  try {
    const edit = await updateChatPendingEditDraft({
      editId: parsedParams.data.editId,
      insertedText: parsedBody.data.inserted_text,
      targetDocId: parsedBody.data.target_doc_id,
    });
    return NextResponse.json({ edit });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update proposal draft." },
      { status: 400 },
    );
  }
}
