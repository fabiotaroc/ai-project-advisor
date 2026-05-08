import "server-only";

import { z } from "zod";

// Used by extractMeetingTranscriptInsights in src/lib/server/ingestion.ts.
export const MEETING_EXTRACTION_SYSTEM_PROMPT = `You extract structured meeting intelligence from transcripts (plain text, markdown, VTT, or SRT).
Rules:
- Use only what is supported by the transcript; do not invent facts, people, or dates.
- Lists may be empty if nothing applies.
- participants: include only people who actually attended or spoke in the meeting, based on speaker labels, explicit attendee lists, or platform metadata. Exclude people who are only mentioned by participants.
- meeting_at: output a full ISO-8601 string only when the calendar wall time is explicit or unambiguous (e.g. meeting title line, "Date:", Zoom/Teams headers, first subtitle cue with a real date). Otherwise null.`;

// Used by generateSourceSummary in src/lib/server/ingestion.ts.
export const SOURCE_SUMMARY_SYSTEM_PROMPT =
  "You are a concise summarizer. Produce a 2-4 sentence summary of the document. Focus on the key facts, decisions, and action items.";

// Head-heavy cap: keeps VTT/SRT cue timestamps and file headers for datetime inference.
export const MEETING_TRANSCRIPT_PROMPT_CHAR_CAP = 40_000;

export const meetingTranscriptExtractionSchema = z.object({
  short_summary: z
    .string()
    .describe("Exactly two sentences summarizing what happened in the meeting."),
  decisions: z.array(z.string()).describe("Concrete decisions or agreements."),
  action_items: z.array(z.string()).describe("Tasks with owner or clear next step when stated."),
  risks: z.array(z.string()).describe("Risks, concerns, or blockers discussed."),
  open_questions: z.array(z.string()).describe("Unresolved questions or items needing follow-up."),
  participants: z
    .array(z.string())
    .describe(
      "Actual meeting participants only: include explicit speakers, attendee-list entries, or platform metadata attendees. Do not include people who are merely mentioned in the conversation. Add role in parentheses only if explicit.",
    ),
  meeting_at: z
    .string()
    .nullable()
    .describe(
      "ISO-8601 datetime if clearly stated (title, headers, platform lines, or first VTT/SRT cue). Null if unknown or uncertain — never invent a date.",
    ),
});

export type MeetingTranscriptExtraction = z.infer<typeof meetingTranscriptExtractionSchema>;

export function truncateMeetingTranscriptForPrompt(text: string): string {
  if (text.length <= MEETING_TRANSCRIPT_PROMPT_CHAR_CAP) return text;
  return text.slice(0, MEETING_TRANSCRIPT_PROMPT_CHAR_CAP);
}

export function buildMeetingExtractionUserPrompt(title: string, transcript: string): string {
  return `Meeting file name / title: ${title}

Transcript (may be truncated from the start of the file):
${transcript}`;
}

export function buildSourceSummaryUserPrompt(title: string, snippet: string): string {
  return `Document title: ${title}\n\n${snippet}`;
}
