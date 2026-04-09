"use client";

import { useMemo, useState } from "react";
import type { ProjectFile } from "@/lib/types";

export function FilesPanel({ projectId, files: initialFiles }: { projectId: string; files: ProjectFile[] }) {
  const [files, setFiles] = useState(initialFiles);
  const [selectedPath, setSelectedPath] = useState(initialFiles[0]?.path ?? "PROJECT.md");
  const [content, setContent] = useState(initialFiles[0]?.content ?? "");

  const selected = useMemo(() => files.find((f) => f.path === selectedPath), [files, selectedPath]);

  async function saveFile() {
    const response = await fetch("/api/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, path: selectedPath, content }),
    });
    if (!response.ok) return;
    const payload = await response.json();
    setFiles((prev) => [...prev.filter((f) => f.path !== payload.file.path), payload.file].sort((a, b) => a.path.localeCompare(b.path)));
  }

  return (
    <section className="grid h-[calc(100vh-9.5rem)] grid-cols-[18rem_1fr] gap-4">
      <aside className="rounded-2xl border border-[var(--line)] bg-white/70 p-4">
        <h1 className="display mb-3 text-2xl">Files</h1>
        <ul className="space-y-1">
          {files.map((file) => (
            <li key={file.id}>
              <button onClick={() => { setSelectedPath(file.path); setContent(file.content); }} className={`w-full rounded px-2 py-1.5 text-left text-sm ${selectedPath === file.path ? "bg-[var(--ink)] text-[var(--paper)]" : "hover:bg-[var(--paper)]"}`}>{file.path}</button>
            </li>
          ))}
        </ul>
      </aside>
      <div className="flex flex-col rounded-2xl border border-[var(--line)] bg-white/70">
        <div className="border-b border-[var(--line)] px-4 py-2">
          <h2 className="font-mono text-sm">{selectedPath}</h2>
          {selected ? <p className="text-xs text-[var(--ink-soft)]">Updated {new Date(selected.updated_at).toLocaleString()}</p> : null}
        </div>
        <textarea value={content} onChange={(event) => setContent(event.target.value)} className="flex-1 resize-none bg-transparent p-4 font-mono text-sm leading-relaxed outline-none" />
        <div className="border-t border-[var(--line)] px-4 py-2"><button onClick={saveFile} className="rounded bg-[var(--accent)] px-3 py-1.5 text-sm text-white">Save + version</button></div>
      </div>
    </section>
  );
}
