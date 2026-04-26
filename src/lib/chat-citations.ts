export const CITATION_MARKER_REGEX = /〖cite:([0-9a-fA-F-]{36})〗/g;
export const CITATION_LINK_PREFIX = "advisor-citation:";

export type CitationItem = {
  key: string;
  chunkId: string;
  sourceMaterialId: string;
  sourceTitle: string;
  excerpt?: string;
  charStart: number | null;
  charEnd: number | null;
};

export type MessageCitationMetadata = {
  version: 1;
  items: CitationItem[];
};

export type ChatMessageMetadata = {
  citations?: MessageCitationMetadata;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}

function readNumberOrNull(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
}

function normalizeInlineText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function truncate(value: string, maxLength: number) {
  const normalized = normalizeInlineText(value);
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function getToolName(part: unknown) {
  if (!isRecord(part)) return undefined;
  const type = readString(part, "type");
  if (type?.startsWith("tool-")) return type.slice("tool-".length);
  return readString(part, "toolName", "tool_name", "name");
}

function getToolOutput(part: unknown) {
  return isRecord(part) ? part.output : undefined;
}

function collectCiteableChunks(parts: unknown[]) {
  const chunks = new Map<string, CitationItem>();

  for (const part of parts) {
    if (getToolName(part) !== "search_sources") continue;
    const output = getToolOutput(part);
    if (!Array.isArray(output)) continue;

    for (const result of output) {
      if (!isRecord(result)) continue;
      const chunkId = readString(result, "chunk_id", "chunkId");
      const sourceMaterialId = readString(result, "source_material_id", "sourceMaterialId");
      if (!chunkId || !sourceMaterialId) continue;

      const sourceTitle = readString(result, "source_title", "sourceTitle", "title") ?? "Source material";
      const excerpt = readString(result, "excerpt") ?? readString(result, "content");
      chunks.set(chunkId.toLowerCase(), {
        key: chunkId,
        chunkId,
        sourceMaterialId,
        sourceTitle,
        excerpt: excerpt ? truncate(excerpt, 280) : undefined,
        charStart: readNumberOrNull(result, "char_start", "charStart"),
        charEnd: readNumberOrNull(result, "char_end", "charEnd"),
      });
    }
  }

  return chunks;
}

export function extractCitationMarkerIds(text: string) {
  const ids: string[] = [];
  for (const match of text.matchAll(CITATION_MARKER_REGEX)) {
    ids.push(match[1]);
  }
  return ids;
}

export function buildCitationMetadataFromParts(parts: unknown[]): MessageCitationMetadata | undefined {
  const citeableChunks = collectCiteableChunks(parts);
  if (citeableChunks.size === 0) return undefined;

  const items: CitationItem[] = [];
  const seen = new Set<string>();

  for (const part of parts) {
    if (!isRecord(part) || part.type !== "text" || typeof part.text !== "string") continue;
    for (const markerId of extractCitationMarkerIds(part.text)) {
      const key = markerId.toLowerCase();
      if (seen.has(key)) continue;
      const citation = citeableChunks.get(key);
      if (!citation) continue;
      seen.add(key);
      items.push(citation);
    }
  }

  return items.length > 0 ? { version: 1, items } : undefined;
}

export function parseMessageCitationMetadata(value: unknown): MessageCitationMetadata | undefined {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.items)) return undefined;

  const items = value.items.flatMap((item): CitationItem[] => {
    if (!isRecord(item)) return [];
    const chunkId = readString(item, "chunkId", "chunk_id");
    const sourceMaterialId = readString(item, "sourceMaterialId", "source_material_id");
    const sourceTitle = readString(item, "sourceTitle", "source_title", "title");
    if (!chunkId || !sourceMaterialId || !sourceTitle) return [];
    return [{
      key: readString(item, "key") ?? chunkId,
      chunkId,
      sourceMaterialId,
      sourceTitle,
      excerpt: readString(item, "excerpt"),
      charStart: readNumberOrNull(item, "charStart", "char_start"),
      charEnd: readNumberOrNull(item, "charEnd", "char_end"),
    }];
  });

  return items.length > 0 ? { version: 1, items } : undefined;
}

export function getCitationMetadataFromMessageLike(message: {
  metadata?: unknown;
  parts: unknown[];
}) {
  const metadata = isRecord(message.metadata)
    ? parseMessageCitationMetadata(message.metadata.citations)
    : undefined;
  return metadata ?? buildCitationMetadataFromParts(message.parts);
}

export function renderCitationMarkersAsMarkdownLinks(
  text: string,
  metadata: MessageCitationMetadata | undefined,
) {
  const indexByChunkId = new Map(
    (metadata?.items ?? []).map((item, index) => [item.chunkId.toLowerCase(), index] as const),
  );

  return text.replace(CITATION_MARKER_REGEX, (_, rawChunkId: string) => {
    const index = indexByChunkId.get(rawChunkId.toLowerCase());
    if (index === undefined) return "";
    return `[${index + 1}](${CITATION_LINK_PREFIX}${rawChunkId})`;
  });
}

export function getCitationFromHref(
  href: string | undefined,
  metadata: MessageCitationMetadata | undefined,
) {
  if (!href?.startsWith(CITATION_LINK_PREFIX)) return undefined;
  const chunkId = href.slice(CITATION_LINK_PREFIX.length).toLowerCase();
  const citationIndex = metadata?.items.findIndex((item) => item.chunkId.toLowerCase() === chunkId) ?? -1;
  if (citationIndex < 0) return undefined;
  return { citation: metadata?.items[citationIndex], index: citationIndex };
}
