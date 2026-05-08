import "server-only";

type CanonicalDocPromptRow = {
  slug: string | null;
  title: string | null;
  body: string | null;
  is_default: boolean | null;
  is_pinned: boolean | null;
};

export function sortCanonicalDocsForPrompt<T extends CanonicalDocPromptRow>(docs: T[]): T[] {
  return docs.slice().sort((a, b) => {
    if (Boolean(a.is_default) !== Boolean(b.is_default)) {
      return a.is_default ? -1 : 1;
    }
    return String(a.slug ?? "").localeCompare(String(b.slug ?? ""));
  });
}

export function formatCanonicalDocsForPrompt(docs: CanonicalDocPromptRow[]): string {
  return sortCanonicalDocsForPrompt(docs)
    .map((doc) => {
      const status = doc.is_default ? "default" : "pinned";
      const slug = String(doc.slug ?? "unknown");
      const title = String(doc.title ?? "Untitled");
      const body = doc.body?.trim() ? doc.body : "(empty)";

      return [
        `## ${slug}.md — ${title} (${status})`,
        "```markdown",
        body,
        "```",
      ].join("\n");
    })
    .join("\n\n");
}
