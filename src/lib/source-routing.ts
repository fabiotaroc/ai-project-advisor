import type { SourceMaterial } from "@/lib/types";

export type InputView = "files" | "meetings" | "emails";

export function inputViewForSourceType(type: SourceMaterial["type"]): InputView {
  switch (type) {
    case "meeting":
      return "meetings";
    case "email":
      return "emails";
    case "document":
    case "note":
      return "files";
  }
}

export function inputHrefForSource(
  projectId: string,
  sourceType: SourceMaterial["type"] | undefined,
  options?: {
    sourceId?: string | null;
    chunkId?: string | null;
  },
) {
  const view = sourceType ? inputViewForSourceType(sourceType) : "files";
  const params = new URLSearchParams();

  if (options?.sourceId) {
    params.set("source", options.sourceId);
  }

  if (options?.chunkId) {
    params.set("chunk", options.chunkId);
  }

  const query = params.toString();
  return `/project/${projectId}/${view === "files" ? "sources" : view}${query ? `?${query}` : ""}`;
}
