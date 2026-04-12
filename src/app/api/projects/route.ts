import { NextResponse } from "next/server";
import { z } from "zod";
import { getOptionalSessionUser } from "@/lib/server/auth";
import { createProject } from "@/lib/server/project-setup";

const schema = z.object({ name: z.string().min(1).max(200) });

export async function POST(request: Request) {
  const body = schema.parse(await request.json());
  const user = await getOptionalSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await createProject(body.name, user.id);
  return NextResponse.json({ project });
}
