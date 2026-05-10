/**
 * Patch model for canonical wiki edits.
 *
 * A pending edit can be one of:
 *   - "add":    inserted_text only (no deleted_text). Anchor-based insertion.
 *   - "update": both inserted_text and deleted_text — replace deleted_text with inserted_text.
 *   - "remove": deleted_text only — strip the matched span from the doc.
 *
 * Applying a patch verifies the expected base text (deleted_text) still
 * matches the canonical doc body. When it doesn't, the result is "stale" so
 * the UI can warn instead of silently rewriting the doc.
 */

export type PendingEditPatchType = "add" | "update" | "remove";

export type PatchApplication = {
  status: "applied" | "stale";
  body: string;
  repositioned: boolean;
  fallbackApplied: boolean;
  locationNote: string;
  /** Character offset where the patch landed in the resulting body. */
  index: number;
  /** Length of the inserted span (for hunk rendering). */
  insertedLength: number;
};

type Anchor = {
  heading?: string;
  before?: string;
  after?: string;
};

export function classifyPatchType(
  insertedText: string,
  deletedText: string | null,
): PendingEditPatchType {
  const hasInsert = Boolean(insertedText && insertedText.trim());
  const hasDelete = Boolean(deletedText && deletedText.trim());
  if (hasDelete && hasInsert) return "update";
  if (hasDelete) return "remove";
  return "add";
}

export function applyPatchToBody({
  body,
  insertedText,
  deletedText,
  anchor: rawAnchor,
  patchType,
}: {
  body: string;
  insertedText: string;
  deletedText: string | null;
  anchor: Record<string, unknown>;
  patchType: PendingEditPatchType;
}): PatchApplication {
  const trimmedBody = body.replace(/\s+$/, "");
  const insertion = insertedText.trim();

  if (patchType === "update" || patchType === "remove") {
    const target = (deletedText ?? "").trim();
    if (!target) {
      return staleResult(trimmedBody, "Expected base text was empty.");
    }
    const index = findFlexible(trimmedBody, target);
    if (index < 0) {
      return staleResult(
        trimmedBody,
        "The text this edit was based on no longer matches the canonical doc.",
      );
    }
    const before = trimmedBody.slice(0, index);
    const after = trimmedBody.slice(index + target.length);
    const replacement = patchType === "remove" ? "" : insertion;
    const nextBody = `${before}${replacement}${after}`.replace(/\n{3,}/g, "\n\n").trimEnd();
    return {
      status: "applied",
      body: nextBody,
      repositioned: false,
      fallbackApplied: false,
      locationNote:
        patchType === "remove"
          ? "Removed matched text from doc."
          : "Replaced matched text in doc.",
      index,
      insertedLength: replacement.length,
    };
  }

  // Add — fall back to anchor heuristics.
  const anchor = normalizeAnchor(rawAnchor);

  if (anchor.heading) {
    const exact = findHeadingSection(trimmedBody, anchor.heading, "exact");
    if (exact) {
      return insertAt(trimmedBody, exact.end, insertion, {
        repositioned: false,
        fallbackApplied: false,
        locationNote: `Inserted under "${exact.heading}".`,
      });
    }

    const bestEffort = findHeadingSection(trimmedBody, anchor.heading, "best-effort");
    if (bestEffort) {
      return insertAt(trimmedBody, bestEffort.end, insertion, {
        repositioned: true,
        fallbackApplied: false,
        locationNote: `Repositioned under "${bestEffort.heading}".`,
      });
    }
  }

  if (anchor.before) {
    const index = trimmedBody.indexOf(anchor.before);
    if (index >= 0) {
      return insertAt(trimmedBody, index + anchor.before.length, insertion, {
        repositioned: Boolean(anchor.heading),
        fallbackApplied: false,
        locationNote: "Inserted after matching anchor context.",
      });
    }
  }

  return insertAt(trimmedBody, trimmedBody.length, insertion, {
    repositioned: false,
    fallbackApplied: true,
    locationNote: "Appended at end of doc.",
  });
}

/**
 * Locate where the patch should appear inside the canonical body for hunk
 * rendering (the read-only diff viewer doesn't actually mutate body).
 * Mirrors the matching logic in applyPatchToBody but returns position-only data.
 */
export function locatePatch({
  body,
  insertedText,
  deletedText,
  anchor: rawAnchor,
  patchType,
}: {
  body: string;
  insertedText: string;
  deletedText: string | null;
  anchor: Record<string, unknown>;
  patchType: PendingEditPatchType;
}): { index: number; matchLength: number; locationNote: string | null; stale: boolean } {
  if (patchType !== "add") {
    const target = (deletedText ?? "").trim();
    const index = target ? findFlexible(body, target) : -1;
    if (index < 0) {
      return {
        index: body.length,
        matchLength: 0,
        locationNote: "stale — base text not found in doc",
        stale: true,
      };
    }
    return { index, matchLength: target.length, locationNote: null, stale: false };
  }

  const anchor = normalizeAnchor(rawAnchor);
  if (anchor.heading) {
    const exact = findHeadingSection(body, anchor.heading, "exact");
    if (exact) return { index: exact.end, matchLength: 0, locationNote: null, stale: false };
    const best = findHeadingSection(body, anchor.heading, "best-effort");
    if (best) {
      return {
        index: best.end,
        matchLength: 0,
        locationNote: `repositioned to "${best.heading}"`,
        stale: false,
      };
    }
  }
  if (anchor.before) {
    const idx = body.indexOf(anchor.before);
    if (idx >= 0) {
      return {
        index: idx + anchor.before.length,
        matchLength: 0,
        locationNote: anchor.heading ? "repositioned to matching context" : null,
        stale: false,
      };
    }
  }
  void insertedText;
  return {
    index: body.length,
    matchLength: 0,
    locationNote: "appended at end of doc",
    stale: false,
  };
}

function staleResult(body: string, locationNote: string): PatchApplication {
  return {
    status: "stale",
    body,
    repositioned: false,
    fallbackApplied: false,
    locationNote,
    index: body.length,
    insertedLength: 0,
  };
}

function findFlexible(body: string, needle: string): number {
  const direct = body.indexOf(needle);
  if (direct >= 0) return direct;
  // Whitespace-tolerant fallback: collapse runs of whitespace in both, then
  // walk the body for the first match by reconstructed offset.
  const normalize = (value: string) => value.replace(/\s+/g, " ").trim();
  const normalizedNeedle = normalize(needle);
  if (!normalizedNeedle) return -1;
  const normalizedBody = body.replace(/\s+/g, " ");
  const idxInNormalized = normalizedBody.indexOf(normalizedNeedle);
  if (idxInNormalized < 0) return -1;
  // Walk original body counting non-collapsed equivalents.
  let original = 0;
  let normalizedSeen = 0;
  while (original < body.length && normalizedSeen < idxInNormalized) {
    const ch = body[original];
    if (/\s/.test(ch)) {
      original += 1;
      while (original < body.length && /\s/.test(body[original])) original += 1;
      normalizedSeen += 1;
    } else {
      original += 1;
      normalizedSeen += 1;
    }
  }
  return original;
}

function normalizeAnchor(rawAnchor: Record<string, unknown>): Anchor {
  return {
    heading: normalizeOptionalString(rawAnchor.heading),
    before: normalizeOptionalString(rawAnchor.before),
    after: normalizeOptionalString(rawAnchor.after),
  };
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeMatch(value: string) {
  return value
    .toLowerCase()
    .replace(/[#*_`[\]()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function findHeadingSection(body: string, target: string, mode: "exact" | "best-effort") {
  const headings = [...body.matchAll(/^(#{1,6})\s+(.+)$/gm)].map((match) => ({
    start: match.index ?? 0,
    endOfLine: (match.index ?? 0) + match[0].length,
    level: match[1].length,
    heading: match[2].trim(),
  }));
  const normalizedTarget = normalizeMatch(target);

  for (let index = 0; index < headings.length; index += 1) {
    const heading = headings[index];
    const normalizedHeading = normalizeMatch(heading.heading);
    const matches =
      mode === "exact"
        ? normalizedHeading === normalizedTarget
        : normalizedHeading.includes(normalizedTarget) ||
          normalizedTarget.includes(normalizedHeading);

    if (!matches) continue;

    const nextPeer = headings
      .slice(index + 1)
      .find((candidate) => candidate.level <= heading.level);
    return {
      heading: heading.heading,
      end: nextPeer ? nextPeer.start : body.length,
    };
  }

  return null;
}

function insertAt(
  body: string,
  index: number,
  insertion: string,
  meta: Omit<PatchApplication, "body" | "status" | "index" | "insertedLength">,
): PatchApplication {
  const before = body.slice(0, index).trimEnd();
  const after = body.slice(index).trimStart();
  const segments = [before, insertion.trim(), after].filter(Boolean);
  const nextBody = segments.join("\n\n");
  const insertedAt = before ? before.length + 2 : 0;
  return {
    status: "applied",
    body: nextBody,
    index: insertedAt,
    insertedLength: insertion.trim().length,
    ...meta,
  };
}
