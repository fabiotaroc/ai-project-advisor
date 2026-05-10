// Shared icons (inline SVG) + sample data for the prototype.
// Loaded as plain script before React.

window.Icon = ({ name, size = 16, stroke = 1.5 }) => {
  const props = {
    width: size, height: size, viewBox: "0 0 24 24",
    fill: "none", stroke: "currentColor",
    strokeWidth: stroke, strokeLinecap: "round", strokeLinejoin: "round",
  };
  const paths = {
    home: <><path d="M3 12 12 4l9 8"/><path d="M5 10v10h14V10"/></>,
    chat: <><path d="M21 12a8 8 0 0 1-12.5 6.6L3 20l1.4-5.5A8 8 0 1 1 21 12Z"/></>,
    book: <><path d="M4 5a2 2 0 0 1 2-2h13v18H6a2 2 0 0 1-2-2Z"/><path d="M6 3v18"/></>,
    activity: <><path d="M3 12h4l3-8 4 16 3-8h4"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    arrow: <><path d="M5 12h14M13 5l7 7-7 7"/></>,
    send: <><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/></>,
    paperclip: <><path d="m21 12-9 9a6 6 0 0 1-8.5-8.5l9-9a4 4 0 0 1 5.7 5.7l-9 9a2 2 0 0 1-2.8-2.8l8.5-8.5"/></>,
    sparkles: <><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></>,
    file: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></>,
    folder: <><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></>,
    upload: <><path d="M12 3v12M6 9l6-6 6 6"/><path d="M3 17v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2"/></>,
    chevron: <><path d="m9 6 6 6-6 6"/></>,
    check: <><path d="M5 12l5 5 9-11"/></>,
    x: <><path d="M6 6l12 12M18 6 6 18"/></>,
    more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></>,
    pdf: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></>,
    link: <><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></>,
  };
  return (
    <svg {...props}>{paths[name] || null}</svg>
  );
};

window.SAMPLE = {
  project: {
    name: "Samsung — DACH 2026",
    code: "smsg-2026",
  },
  user: {
    name: "Taro Mizuno",
    handle: "taro@alkemy.io",
    initials: "TM",
  },
  conversations: [
    { id: "c1", title: "EU hosting position for Samsung Legal", when: "2:14 PM" },
    { id: "c2", title: "Q2 campaign retro — what worked", when: "Yesterday" },
    { id: "c3", title: "Persona deck draft", when: "Tue" },
    { id: "c4", title: "Onboarding follow-up email", when: "Mon" },
    { id: "c5", title: "Capex narrative — first pass", when: "Apr 18" },
  ],
  sources: [
    { id: "s1", glyph: "MD", name: "PRD.md", kind: "Product spec", chunks: 42, when: "Apr 7", summary: "Working PRD for the Advisor product. Defines users, jobs, MVP scope, and EU hosting commitments." },
    { id: "s2", glyph: "EML", name: "Tomas — Samsung Legal review", kind: "Email", chunks: 8, when: "Apr 24", summary: "Tomas relays Samsung Legal feedback. Flags Germany-region hosting as a hard requirement for production." },
    { id: "s3", glyph: "PDF", name: "samsung-q2-recap.pdf", kind: "Deck", chunks: 26, when: "Apr 22", summary: "Q2 2026 campaign recap. Covers subject-line tests, segmentation, open rates by persona." },
    { id: "s4", glyph: "DOCX", name: "Stakeholder map v3.docx", kind: "Doc", chunks: 14, when: "Apr 18", summary: "Updated map of Samsung counterparts. Adds Marie (procurement) and revised reporting line for Eun-ji." },
    { id: "s5", glyph: "MD", name: "TECH_SPEC.md", kind: "Engineering", chunks: 31, when: "Apr 12", summary: "v1 architecture: Next.js + Supabase, ingestion pipeline, retrieval and memory model." },
    { id: "s6", glyph: "EML", name: "Eun-ji — Q3 brief kickoff", kind: "Email", chunks: 6, when: "Apr 10", summary: "Eun-ji sets a tentative Q3 brief kickoff for the first week of May. Asks for a status snapshot before then." },
    { id: "s7", glyph: "MD", name: "DECISIONS.md", kind: "Memory", chunks: 12, when: "Apr 9", summary: "Running log of project decisions with sources and dates. Last entry: Apr 8 — adopt Supabase pgvector." },
  ],
  citations: [
    { num: 1, source: "PRD.md", ref: "§13 · Compliance", quote: "Support EU-hosted infrastructure where possible · DPA · explicit handling of deletion requests." },
    { num: 2, source: "Tomas — Samsung Legal review", ref: "Apr 24 · 14:02", quote: "Samsung Legal flagged Germany specifically — they want German-region hosting for any production rollout." },
    { num: 3, source: "DECISIONS.md", ref: "line 18", quote: "Apr 8 · Adopt Supabase pgvector for retrieval; revisit at scale ≥ 1M chunks." },
  ],
  feed: [
    { when: "2 min ago", who: "AI", glyph: "◐", what: <>Drafted memory update on <span className="mono">DECISIONS.md</span> — German-region hosting for Samsung pilot.<span className="sub">Awaiting your review</span></> },
    { when: "1h ago", who: "Tomas", glyph: "TC", what: <>Uploaded <span className="mono">Tomas — Samsung Legal review</span> · 8 chunks indexed.<span className="sub">Email · 2.4kb</span></> },
    { when: "Today, 10:32", who: "AI", glyph: "◐", what: <>Answered <em>"What's our position on EU hosting?"</em> with 3 citations.<span className="sub">Conversation · EU hosting position for Samsung Legal</span></> },
    { when: "Yesterday", who: "Eun-ji", glyph: "EJ", what: <>Commented on <span className="mono">samsung-q2-recap.pdf</span> — flagged the persona segmentation slide.<span className="sub">Source · Deck</span></> },
    { when: "Apr 23", who: "AI", glyph: "◐", what: <>Saved memory update — added Marie (procurement) to the stakeholder map.<span className="sub">Approved by you</span></> },
    { when: "Apr 22", who: "You", glyph: "TM", what: <>Uploaded <span className="mono">samsung-q2-recap.pdf</span> · 26 chunks indexed.<span className="sub">Deck · 4.1mb</span></> },
  ],
  members: [
    { initials: "TM", name: "Taro Mizuno", email: "taro@alkemy.io", role: "Owner", access: "Full", color: "iris" },
    { initials: "TC", name: "Tomas Conradi", email: "tomas@alkemy.io", role: "Admin", access: "Full", color: "moss" },
    { initials: "EJ", name: "Eun-ji Park", email: "eunji@samsung.com", role: "Editor", access: "Project", color: "ember" },
    { initials: "MR", name: "Marie Reuter", email: "marie@samsung.com", role: "Viewer", access: "Read-only", color: "iris" },
  ],
};
