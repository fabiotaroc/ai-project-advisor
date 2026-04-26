import "server-only";

const DEFAULT_EXCERPT_LENGTH = 260;
const MAX_BACKTRACK = 240;

type SourceDisplayExcerptInput = {
  content: string;
  fullText?: string | null;
  maxLength?: number;
};

function normalizeInlineText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function findReadableStart(text: string, chunkStart: number) {
  const searchStart = Math.max(0, chunkStart - MAX_BACKTRACK);
  const prefix = text.slice(searchStart, chunkStart);
  const boundaryMatches = [...prefix.matchAll(/[.!?]\s+|\n{2,}|\r?\n/g)];
  const lastBoundary = boundaryMatches.at(-1);

  if (lastBoundary?.index !== undefined) {
    return searchStart + lastBoundary.index + lastBoundary[0].length;
  }

  const wordBoundary = prefix.search(/\S/);
  return wordBoundary >= 0 ? searchStart + wordBoundary : searchStart;
}

export function buildSourceDisplayExcerpt({
  content,
  fullText,
  maxLength = DEFAULT_EXCERPT_LENGTH,
}: SourceDisplayExcerptInput) {
  const fallback = normalizeInlineText(content);
  if (!fullText) return fallback;

  const chunkStart = fullText.indexOf(content);
  if (chunkStart < 0) return fallback;

  const excerptStart = findReadableStart(fullText, chunkStart);
  const rawExcerpt = fullText.slice(excerptStart, excerptStart + maxLength);
  const excerpt = normalizeInlineText(rawExcerpt);

  if (!excerpt) return fallback;
  return `${excerptStart > 0 ? "... " : ""}${excerpt}${excerptStart + rawExcerpt.length < fullText.length ? "..." : ""}`;
}
