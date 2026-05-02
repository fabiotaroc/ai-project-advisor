import { FileSpreadsheet, FileText, Mail, Presentation, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getFileExtension } from "@/lib/source-classification";
import type { SourceMaterial } from "@/lib/types";

/** Map known upload MIME types to a short file-type label (lowercase; row uses uppercase). */
const MIME_TO_SHORT_TYPE: Record<string, string> = {
  "message/rfc822": "eml",
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "text/plain": "txt",
  "text/markdown": "md",
  "text/vtt": "vtt",
  "text/srt": "srt",
};

/**
 * Short file-type label for list rows: extension from title, else MIME from metadata.
 */
export function sourceFileTypeShortLabel(source: SourceMaterial): string | null {
  const fromTitle = getFileExtension(source.title);
  if (fromTitle) return fromTitle.slice(1);
  const mime = readMetaString(source.metadata, "mimeType");
  if (mime) {
    const byMime = MIME_TO_SHORT_TYPE[mime];
    if (byMime) return byMime;
  }
  return null;
}

export function sourceTypeIcon(type: SourceMaterial["type"], className?: string) {
  const cls = cn("size-4", className);
  switch (type) {
    case "email":
      return <Mail className={cls} />;
    case "document":
      return <Presentation className={cls} />;
    case "meeting":
      return <Users className={cls} />;
    case "note":
      return <FileText className={cls} />;
  }
}

export function fileGlyph(name: string | null | undefined, fallbackType: SourceMaterial["type"], className?: string) {
  const cls = cn("size-4", className);
  const ext = name ? getFileExtension(name) : "";
  switch (ext) {
    case ".eml":
      return <Mail className={cls} />;
    case ".pptx":
      return <Presentation className={cls} />;
    case ".xlsx":
      return <FileSpreadsheet className={cls} />;
    case ".vtt":
    case ".srt":
      return <Users className={cls} />;
    case ".txt":
    case ".md":
      if (fallbackType === "meeting") {
        return <Users className={cls} />;
      }
      if (fallbackType === "email") {
        return <Mail className={cls} />;
      }
      return <FileText className={cls} />;
    default:
      return sourceTypeIcon(fallbackType, className);
  }
}

export function typeLabel(type: SourceMaterial["type"]): string {
  switch (type) {
    case "email":
      return "Email";
    case "document":
      return "File";
    case "meeting":
      return "Meeting";
    case "note":
      return "Note";
  }
}

export function statusBadge(status: SourceMaterial["status"]) {
  switch (status) {
    case "ready":
      return null;
    case "processing":
      return (
        <Badge variant="outline" className="animate-pulse text-[10px]">
          Processing…
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="destructive" className="text-[10px]">
          Failed
        </Badge>
      );
  }
}

export function formatBytes(bytes: number | null | undefined): string | null {
  if (typeof bytes !== "number" || !Number.isFinite(bytes) || bytes < 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function readMetaString(metadata: Record<string, unknown>, key: string): string | null {
  const value = metadata[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function readMetaNumber(metadata: Record<string, unknown>, key: string): number | null {
  const value = metadata[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
