/* Sample data shaped like the real types from src/lib/types.ts. The "decisions" doc body
   below is realistic project memory for a fictional "Aurora Brand Refresh" consulting
   engagement, so the demo reads like the actual product. */

const DOC = {
  id: "doc_decisions",
  slug: "decisions",
  title: "Decisions",
  is_default: true,
  updated_at: "2026-05-08T14:22:00Z",
  body: `# Decisions

Recorded decisions for the Aurora brand refresh. New items land here only after the team has reviewed and accepted a proposal. Anything contested goes to **Open questions** in \`work.md\` first.

## Q2 strategy

- Target launch window is the **first week of August**, anchored on the partner conference keynote.
- Primary persona has narrowed from "marketing operator" to "**brand director at a Series-B-to-D SaaS**" after the customer interviews in April.
- Photography direction is **portraits over product shots**; existing illustration set is paused but not retired.

## Naming & nomenclature

- The product family will be referred to as **Aurora Studio** in external collateral. "Aurora" alone is reserved for the platform brand.
- "Modules" → "Workspaces" everywhere user-facing. Marketing, docs and sales decks all migrate together; no partial rollout.

## Vendors

- Continue with **Field & Form** for motion design through Q3. Decision to revisit at the post-launch retro.
- Photography sourced through **Studio Liminal** for the hero campaign; secondary assets through internal team.

## Pricing

- Headline tier remains **$249/seat/month** for the first 12 months post-launch.
- The annual-prepay discount drops from 20% to **15%** to protect margin during the launch quarter.

## Out of scope for this engagement

- Localization beyond English and German is deferred to 2027.
- Mobile app refresh is tracked separately under \`mobile.md\`.
`
};

/* Source artifacts referenced by the proposed edits. */
const SOURCES = {
  meet_q2_kickoff: {
    id: "src_001", kind: "meeting", icon: "meeting",
    title: "Q2 leadership sync",
    when: "Tue · May 6 · 47 min",
    who: "Marta Reyes, Devon Cho, Sam Patel",
  },
  email_legal: {
    id: "src_002", kind: "email", icon: "email",
    title: "Re: pricing review — legal redline",
    when: "Wed · May 7 · 9:14 am",
    who: "Priya Anand → project channel",
  },
  file_brief: {
    id: "src_003", kind: "file", icon: "file",
    title: "Aurora-brief-v4.pdf",
    when: "Mon · May 5 · uploaded by Devon",
    who: "Brand strategy brief, page 3",
  },
  chat_devon: {
    id: "src_004", kind: "chat", icon: "chat",
    title: "Chat with the advisor",
    when: "Today · 2:48 pm",
    who: "Devon asked the advisor to record a decision",
  },
};

/* Pending edits — three flavors (insert / replace / delete) plus a drift example and a
   conflict example. Each carries the rich evidence the right-rail will display. */

const EDITS = [
  {
    id: "edit_001",
    kind: "insert",
    status: "pending",
    confidence: "high",
    target_doc_id: "doc_decisions",
    reason: "Lock in launch dependency on the partner keynote",
    anchor: { heading: "Q2 strategy", position: "after-list" },
    inserted_text: "Launch is contingent on the partner keynote slot — if it slips, the August window slips with it.",
    deleted_text: null,
    source_id: "meet_q2_kickoff",
    quote: "If we don't get the keynote slot, there's no point shipping that week. Aurora ships when the keynote does. Mark it down.",
    quoted_by: "Marta Reyes",
    quoted_at: "12:08",
  },
  {
    id: "edit_002",
    kind: "replace",
    status: "pending",
    confidence: "high",
    target_doc_id: "doc_decisions",
    reason: "Annual-prepay discount changed from 15% to 18% per legal redline",
    anchor: { heading: "Pricing", position: "bullet-2" },
    inserted_text: "The annual-prepay discount drops from 20% to **18%** to protect margin during the launch quarter.",
    deleted_text: "The annual-prepay discount drops from 20% to **15%** to protect margin during the launch quarter.",
    source_id: "email_legal",
    quote: "Confirmed with finance — 18% is the floor we can defend without re-papering the contracts. 15% triggers the MFN clause for two key accounts.",
    quoted_by: "Priya Anand",
    quoted_at: "9:14",
  },
  {
    id: "edit_003",
    kind: "delete",
    status: "pending",
    confidence: "med",
    target_doc_id: "doc_decisions",
    reason: "Vendor decision was reversed — Field & Form contract not renewed",
    anchor: { heading: "Vendors", position: "bullet-1" },
    inserted_text: null,
    deleted_text: "Continue with **Field & Form** for motion design through Q3. Decision to revisit at the post-launch retro.",
    source_id: "meet_q2_kickoff",
    quote: "We're not renewing Field & Form. Devon will brief Studio Liminal on motion as well. Strike the previous decision from the wiki.",
    quoted_by: "Sam Patel",
    quoted_at: "31:42",
  },
  {
    id: "edit_004",
    kind: "insert",
    status: "pending",
    confidence: "med",
    target_doc_id: "doc_decisions",
    drift: "repositioned",
    drift_note: "anchor 'Q2 actions' not found — placed under 'Q2 strategy'",
    target_doc_id_note: "Q2 strategy",
    reason: "Persona narrowing was discussed but not yet recorded",
    anchor: { heading: "Q2 actions", position: "after-list" },
    inserted_text: "Stop targeting agency operators in the next research wave; the brand-director cohort tested 2.4× higher on intent.",
    deleted_text: null,
    source_id: "file_brief",
    quote: "Across both cohorts the brand-director persona had a +140% intent lift over agency operators. Recommend dropping the agency cohort from wave 3.",
    quoted_by: "Aurora-brief-v4.pdf, page 3",
    quoted_at: "p. 3",
  },
  {
    id: "edit_005",
    kind: "replace",
    status: "pending",
    confidence: "low",
    target_doc_id: "doc_decisions",
    conflict: true,
    conflict_note: "the section 'Out of scope' was edited 4 minutes ago",
    reason: "Mobile app may now be in scope per Devon's chat note",
    anchor: { heading: "Out of scope for this engagement", position: "bullet-2" },
    inserted_text: "Mobile app refresh **moves into scope** for a phase 2 starting October.",
    deleted_text: "Mobile app refresh is tracked separately under `mobile.md`.",
    source_id: "chat_devon",
    quote: "Add a note that mobile is now in scope for a phase 2 starting October — leadership greenlit it this morning.",
    quoted_by: "Devon Cho · in chat",
    quoted_at: "2:48 pm",
  },
];

/* Group edits by source for the "by-source" view in the rail. */
const BY_SOURCE = Object.values(SOURCES).map(s => ({
  source: s,
  edits: EDITS.filter(e => e.source_id === s.id),
})).filter(g => g.edits.length > 0);

window.SpecData = { DOC, SOURCES, EDITS, BY_SOURCE };
