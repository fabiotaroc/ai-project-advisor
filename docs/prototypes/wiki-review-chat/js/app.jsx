/* App root: TOC + sections. Active-section tracking via IntersectionObserver. */

const { useEffect, useState, useRef } = React;
const S = window.SpecSections;
const I = window.Icons;

const SECTIONS = [
  { id: "top", num: "00", label: "Overview" },
  { id: "problem", num: "01", label: "Problem" },
  { id: "recommendation", num: "02", label: "Recommendation" },
  { id: "flow", num: "03", label: "Flow & entry points" },
  { id: "layout", num: "04", label: "Layout (live mockup)" },
  { id: "states", num: "05", label: "Diff vocabulary" },
  { id: "evidence", num: "06", label: "Source evidence" },
  { id: "actions", num: "07", label: "Accept / reject" },
  { id: "conflict", num: "08", label: "Conflict handling" },
  { id: "scope", num: "09", label: "MVP scope" },
  { id: "risks", num: "10", label: "Risks &amp; questions" },
];

function App() {
  const [active, setActive] = useState("top");

  useEffect(() => {
    const els = SECTIONS.map(s => document.getElementById(s.id)).filter(Boolean);
    const obs = new IntersectionObserver((entries) => {
      const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setActive(visible[0].target.id);
    }, { rootMargin: "-30% 0px -55% 0px", threshold: 0 });
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <div className="shell">
      <aside className="toc">
        <div className="toc-brand">
          <div className="toc-brand-dot">A</div>
          <div>
            <div className="toc-eyebrow">UX spec · v1.0</div>
            <div className="toc-title">Wiki review<br />— rich diffs &amp; the new panel</div>
          </div>
        </div>

        <nav>
          {SECTIONS.map(s => (
            <a key={s.id} href={`#${s.id}`} className={active === s.id ? "active" : ""}
               dangerouslySetInnerHTML={{ __html: `<span class="num">${s.num}</span><span>${s.label}</span>` }} />
          ))}
        </nav>

        <div className="toc-foot">
          <span>Audience: PM · Eng · Design</span>
          <span>Status: ready for review</span>
          <span>Replaces: TODO ↗ pending-edits item</span>
        </div>
      </aside>

      <main className="body">
        <section id="top">
          <div className="eyebrow">Wiki · pending edits · v2</div>
          <h1 className="h1">A calmer review surface for proposed wiki edits.</h1>
          <p className="deck">
            Today, librarian-extracted edits land as cramped append-only cards on a source page,
            and chat-originated proposals live inside the chat thread. We're replacing both with a
            single, spacious review panel — a 3-pane Cursor/Codex-style surface where the canonical
            doc, the proposed change, and the source quote all live side by side. This spec captures
            the flow, the layout, the diff vocabulary, the conflict states, and what ships in MVP.
          </p>

          <div className="row" style={{ gap: 8, marginTop: 6 }}>
            <span className="pill pill--accent"><I.sparkles />New: replacements + deletions</span>
            <span className="pill pill--success"><I.shield />Source-grounded by contract</span>
            <span className="pill"><I.panel />Slide-over · keyboard-first</span>
            <span className="pill pill--soft"><I.history />Auditable, with undo</span>
          </div>

          <div className="callout" style={{ marginTop: 30 }}>
            <div className="callout-head"><I.zap />TL;DR — the recommendation in five lines</div>
            <p>
              <strong>(1)</strong> Promote review to its own first-class surface — <span className="mono">/project/_/review</span> — also slide-overable from sources, chat, and a top-nav badge.
              <strong> (2)</strong> Three panes when there's room: pending-edits rail, canonical doc with tracked-changes prose, source-evidence drawer.
              <strong> (3)</strong> Adopt a calm, Word-style tracked-changes vocabulary — green underline for adds, red strikethrough for deletes — so it never feels like reviewing a pull request.
              <strong> (4)</strong> Relax the append-only constraint: replacements and deletions are allowed, but only when the proposal carries a verbatim quote.
              <strong> (5)</strong> Per-hunk Accept / Reject is atomic, keyboard-first, and reversible for 6 seconds.
            </p>
          </div>
        </section>

        <S.Problem />
        <S.Recommendation />
        <S.Flow />
        <S.Layout />
        <S.States />
        <S.Evidence />
        <S.AcceptReject />
        <S.Conflict />
        <S.Scope />
        <S.Risks />

        <div className="divider" />
        <p className="muted small" style={{ marginTop: 28 }}>
          Spec ready for engineering &amp; design review. Implementation order recommended:
          schema-relaxation in librarian → /review route → 3-pane panel → tracked-changes prose →
          conflict states → activity-feed wiring. ETA discussed in the planning thread.
        </p>
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
