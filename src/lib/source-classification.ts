import type { SourceMaterial } from "@/lib/types";

export type SourceCategory = SourceMaterial["type"];

export type StagedFile = {
  id: string;
  file: File;
  name: string;
  size: number;
  category: SourceCategory;
  categoryConfidence: "high" | "medium" | "low";
};

const ACCEPTED_EXTENSIONS = new Set([
  ".eml",
  ".pdf",
  ".docx",
  ".pptx",
  ".xlsx",
  ".txt",
  ".vtt",
  ".srt",
  ".md",
]);

const ACCEPTED_MIME_TYPES = new Set([
  "message/rfc822",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/vtt",
  "text/markdown",
]);

export function getFileExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot).toLowerCase();
}

export function isAcceptedFile(file: File): boolean {
  const ext = getFileExtension(file.name);
  return ACCEPTED_EXTENSIONS.has(ext) || ACCEPTED_MIME_TYPES.has(file.type);
}

export function buildAcceptString(): string {
  return [
    ".eml",
    ".pdf",
    ".docx",
    ".pptx",
    ".xlsx",
    ".txt",
    ".vtt",
    ".srt",
    ".md",
  ].join(",");
}

/**
 * Classify a file by extension first, then optionally refine by reading
 * a text snippet to detect meeting-transcript patterns.
 */
export async function classifyFile(file: File): Promise<Pick<StagedFile, "category" | "categoryConfidence">> {
  const ext = getFileExtension(file.name);

  if (ext === ".eml") {
    return { category: "email", categoryConfidence: "high" };
  }

  if (ext === ".pdf" || ext === ".docx" || ext === ".pptx" || ext === ".xlsx") {
    return { category: "document", categoryConfidence: "high" };
  }

  if (ext === ".vtt" || ext === ".srt") {
    return { category: "meeting", categoryConfidence: "high" };
  }

  if (ext === ".txt" || ext === ".md") {
    return classifyTextFile(file);
  }

  return { category: "note", categoryConfidence: "low" };
}

const TEXT_SNIPPET_BYTES = 16 * 1024;

const TIMESTAMPED_SPEAKER_LINE = /^\d{1,2}:\d{2}(?::\d{2})?\s*[-–—]\s*[^\n]+$/gm;
const TIMESTAMP_RANGE = /\d{1,2}:\d{2}\s*[-–—]\s*\d{1,2}:\d{2}/g;
const NUMBERED_SPEAKER_LINE = /^(speaker|participant)\s*\d/im;
const NAMED_SPEAKER_LINE = /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}:/gm;
const MEETING_KEYWORDS = /\b(transcript|minutes|meeting|attendees?|agenda|action items?|next steps?|decisions?)\b/gi;
const MEETING_FILENAME_HINTS = /\b(meeting|transcript|notes?|minutes|workshop|standup|retro|sync|call)\b/i;
const ONE_TO_ONE_FILENAME_HINTS = /(?:^|[\s_-])(1to1|1:1)(?:[\s_-]|$)/i;
const TRANSCRIPT_TOOL_HINTS = /\b(bluedot|fireflies|otter)\b/i;
const TRANSCRIPT_THRESHOLD = 3;
const HIGH_CONFIDENCE_THRESHOLD = 5;

async function classifyTextFile(file: File): Promise<Pick<StagedFile, "category" | "categoryConfidence">> {
  try {
    const snippet = await readSnippet(file, TEXT_SNIPPET_BYTES);
    const score = scoreMeetingTranscript(file.name, snippet);

    if (score >= TRANSCRIPT_THRESHOLD) {
      return {
        category: "meeting",
        categoryConfidence: score >= HIGH_CONFIDENCE_THRESHOLD ? "high" : "medium",
      };
    }

    return { category: "note", categoryConfidence: "medium" };
  } catch {
    return { category: "note", categoryConfidence: "low" };
  }
}

function scoreMeetingTranscript(fileName: string, snippet: string): number {
  let score = 0;

  const timestampedSpeakerLines = countMatches(snippet, TIMESTAMPED_SPEAKER_LINE);
  const timestampRanges = countMatches(snippet, TIMESTAMP_RANGE);
  const numberedSpeakerLines = countMatches(snippet, NUMBERED_SPEAKER_LINE);
  const namedSpeakerLines = countMatches(snippet, NAMED_SPEAKER_LINE);
  const meetingKeywords = countMatches(snippet, MEETING_KEYWORDS);

  // Transcript exports often repeat a "timestamp - speaker" structure many times.
  if (timestampedSpeakerLines >= 3) {
    score += 4;
  } else if (timestampedSpeakerLines >= 1) {
    score += 2;
  }

  if (timestampRanges >= 1) {
    score += 2;
  }

  if (numberedSpeakerLines >= 1) {
    score += 2;
  }

  if (namedSpeakerLines >= 3) {
    score += 2;
  } else if (namedSpeakerLines >= 1) {
    score += 1;
  }

  if (meetingKeywords >= 2) {
    score += 2;
  } else if (meetingKeywords >= 1) {
    score += 1;
  }

  if (MEETING_FILENAME_HINTS.test(fileName) || ONE_TO_ONE_FILENAME_HINTS.test(fileName)) {
    score += 1;
  }

  if (TRANSCRIPT_TOOL_HINTS.test(snippet)) {
    score += 1;
  }

  return score;
}

function countMatches(text: string, pattern: RegExp): number {
  return text.match(pattern)?.length ?? 0;
}

function readSnippet(file: File, maxBytes: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const slice = file.slice(0, maxBytes);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(slice);
  });
}

export function categoryLabel(cat: SourceCategory): string {
  switch (cat) {
    case "email": return "Email";
    case "document": return "File";
    case "meeting": return "Meeting Transcript";
    case "note": return "Note";
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
