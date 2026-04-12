"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { GlossaryEntry } from "@/lib/types";

function parseGlossaryMarkdown(markdown: string): GlossaryEntry[] {
  const lines = markdown.split("\n");
  const entries: GlossaryEntry[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) continue;
    if (trimmed.startsWith("| Term") || trimmed.startsWith("|---") || trimmed.startsWith("| ---")) {
      continue;
    }

    const cells = trimmed
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean);

    if (cells.length >= 2 && cells[0]) {
      entries.push({ term: cells[0], definition: cells[1] ?? "" });
    }
  }

  return entries;
}

function serializeGlossaryMarkdown(entries: GlossaryEntry[]): string {
  const lines = ["# Glossary", "", "| Term | Definition |", "|------|------------|"];
  for (const { term, definition } of entries) {
    if (term.trim()) {
      lines.push(`| ${term.trim()} | ${definition.trim()} |`);
    }
  }
  lines.push("");
  return lines.join("\n");
}

export function GlossaryPanel({
  projectId,
  initialContent,
}: {
  projectId: string;
  initialContent: string;
}) {
  const initialEntries = useMemo(() => parseGlossaryMarkdown(initialContent), [initialContent]);
  const [entries, setEntries] = useState<GlossaryEntry[]>(initialEntries);
  const [newTerm, setNewTerm] = useState("");
  const [newDefinition, setNewDefinition] = useState("");
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const updateEntry = useCallback((index: number, field: keyof GlossaryEntry, value: string) => {
    setEntries((prev) =>
      prev.map((e, i) => (i === index ? { ...e, [field]: value } : e)),
    );
    setSaved(false);
  }, []);

  const removeEntry = useCallback((index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
    setSaved(false);
  }, []);

  function addEntry() {
    const term = newTerm.trim();
    if (!term) return;
    setEntries((prev) => [...prev, { term, definition: newDefinition.trim() }]);
    setNewTerm("");
    setNewDefinition("");
    setSaved(false);
  }

  function save() {
    startTransition(async () => {
      const markdown = serializeGlossaryMarkdown(entries);
      const response = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, path: "glossary.md", content: markdown }),
      });
      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    });
  }

  return (
    <section className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Glossary</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Project-specific terminology the advisor uses in every response.
          </p>
        </div>
        <Button onClick={save} disabled={isPending}>
          {isPending ? "Saving…" : saved ? "Saved" : "Save glossary"}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {entries.length} {entries.length === 1 ? "term" : "terms"} defined
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Term</TableHead>
                <TableHead>Definition</TableHead>
                <TableHead className="w-[48px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Input
                      value={entry.term}
                      onChange={(e) => updateEntry(index, "term", e.target.value)}
                      className="h-8 border-0 bg-transparent px-0 font-medium shadow-none focus-visible:ring-0"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={entry.definition}
                      onChange={(e) => updateEntry(index, "definition", e.target.value)}
                      className="h-8 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-destructive"
                      onClick={() => removeEntry(index)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}

              <TableRow>
                <TableCell>
                  <Input
                    value={newTerm}
                    onChange={(e) => setNewTerm(e.target.value)}
                    placeholder="New term…"
                    className="h-8 border-0 bg-transparent px-0 shadow-none placeholder:text-muted-foreground/50 focus-visible:ring-0"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addEntry();
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={newDefinition}
                    onChange={(e) => setNewDefinition(e.target.value)}
                    placeholder="Definition…"
                    className="h-8 border-0 bg-transparent px-0 shadow-none placeholder:text-muted-foreground/50 focus-visible:ring-0"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addEntry();
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={addEntry}
                    disabled={!newTerm.trim()}
                  >
                    <Plus className="size-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}
