/* The hero artifact: the Cursor/Codex-style review panel.

   Three panes:
     [ rail: pending edits, grouped ]  [ canonical doc with tracked-changes ]  [ source evidence ]

   Calm prose diff (NOT a Git block view): inline highlighted insertions, struck deletions,
   provenance pills above each hunk. Click a rail item OR a hunk to focus it; evidence on
   the right always reflects the focused hunk. */

const { useState, useMemo, useEffect, useRef } = React;
const { Icons, SpecData } = window;

// ---- helpers ---------------------------------------------------------------

function kindGlyph(kind) {
  if (kind === "insert") return { cls: "glyph--add", char: "+" };
  if (kind === "delete") return { cls: "glyph--del", char: "−" };
  return { cls: "glyph--rep", char: "↻" };
}
function kindLabel(kind) {
  if (kind === "insert") return "Insertion";
  if (kind === "delete") return "Deletion";
  return "Replacement";
}
function kindPill(kind) {
  if (kind === "insert") return <span className="pill pill--success"><Icons.plus />Insert</span>;
  if (kind === "delete") return <span className="pill pill--danger"><Icons.minus />Delete</span>;
  return <span className="pill pill--warn"><Icons.swap />Replace</span>;
}
function sourceIcon(name) {
  const I = Icons[name] || Icons.file;
  return <I />;
}

// ---- the canonical doc, rendered with hunks inline -------------------------

function DocBody({ activeId, edits, statusMap, onFocus, onResolve }) {
  // We render the doc as fixed prose blocks, with hunks attached at the right anchor.
  // This keeps the demo clear without parsing markdown — in production this is the same
  // job as buildRenderBlocks() in canonical-doc-diff-viewer.tsx.
  const get = (id) => edits.find(e => e.id === id);
  const e1 = get("edit_001"), e2 = get("edit_002"), e3 = get("edit_003"),
        e4 = get("edit_004"), e5 = get("edit_005");

  return (
    <article className="doc-prose">
      <h1>Decisions</h1>
      <p className="meta">decisions.md · updated 2 hours ago · 5 pending edits</p>

      <p>
        Recorded decisions for the Aurora brand refresh. New items land here only after
        the team has reviewed and accepted a proposal. Anything contested goes to <strong>Open
        questions</strong> in <code>work.md</code> first.
      </p>

      <h2>Q2 strategy</h2>
      <ul>
        <li>Target launch window is the <strong>first week of August</strong>, anchored on the partner conference keynote.</li>
        <li>Primary persona has narrowed from "marketing operator" to <strong>"brand director at a Series-B-to-D SaaS"</strong> after the customer interviews in April.</li>
        <li>Photography direction is <strong>portraits over product shots</strong>; existing illustration set is paused but not retired.</li>
      </ul>

      <Hunk e={e1} active={activeId === e1.id} status={statusMap[e1.id]} onFocus={onFocus} onResolve={onResolve}>
        <p><ins className="add">{e1.inserted_text}</ins></p>
      </Hunk>

      <Hunk e={e4} active={activeId === e4.id} status={statusMap[e4.id]} onFocus={onFocus} onResolve={onResolve}>
        <p><ins className="add">{e4.inserted_text}</ins></p>
      </Hunk>

      <h2>Naming &amp; nomenclature</h2>
      <ul>
        <li>The product family will be referred to as <strong>Aurora Studio</strong> in external collateral. "Aurora" alone is reserved for the platform brand.</li>
        <li>"Modules" → "Workspaces" everywhere user-facing. Marketing, docs and sales decks all migrate together; no partial rollout.</li>
      </ul>

      <h2>Vendors</h2>
      <Hunk e={e3} active={activeId === e3.id} status={statusMap[e3.id]} onFocus={onFocus} onResolve={onResolve}>
        <ul><li><del className="del">Continue with <strong>Field &amp; Form</strong> for motion design through Q3. Decision to revisit at the post-launch retro.</del></li></ul>
      </Hunk>
      <ul>
        <li>Photography sourced through <strong>Studio Liminal</strong> for the hero campaign; secondary assets through internal team.</li>
      </ul>

      <h2>Pricing</h2>
      <ul>
        <li>Headline tier remains <strong>$249/seat/month</strong> for the first 12 months post-launch.</li>
      </ul>
      <Hunk e={e2} active={activeId === e2.id} status={statusMap[e2.id]} onFocus={onFocus} onResolve={onResolve}>
        <ul><li>
          The annual-prepay discount drops from 20% to <del className="del"><strong>15%</strong></del>{" "}
          <ins className="add"><strong>18%</strong></ins> to protect margin during the launch quarter.
        </li></ul>
      </Hunk>

      <h2>Out of scope for this engagement</h2>
      <ul>
        <li>Localization beyond English and German is deferred to 2027.</li>
      </ul>
      <Hunk e={e5} active={activeId === e5.id} status={statusMap[e5.id]} onFocus={onFocus} onResolve={onResolve}>
        <ul><li>
          <del className="del">Mobile app refresh is tracked separately under <code>mobile.md</code>.</del>{" "}
          <br /><ins className="add">Mobile app refresh <strong>moves into scope</strong> for a phase 2 starting October.</ins>
        </li></ul>
      </Hunk>
    </article>
  );
}

function Hunk({ e, active, status, onFocus, onResolve, children }) {
  if (status === "rejected") {
    // Resolved-rejected hunks collapse to a single faded line so the user can audit.
    return (
      <div className="hunk hunk--resolved-reject" onClick={() => onFocus(e.id)}>
        <div className="row small muted">
          <Icons.x /> Rejected · {kindLabel(e.kind).toLowerCase()} from {SpecData.SOURCES[e.source_id].title}
        </div>
      </div>
    );
  }
  if (status === "accepted") {
    // Accepted: the inserted text becomes part of the doc. We render that here without the +/− chrome.
    return (
      <div className="hunk hunk--resolved-accept">
        <div className="row small muted" style={{ marginBottom: 4 }}>
          <Icons.check /> Saved to decisions.md · from {SpecData.SOURCES[e.source_id].title}
        </div>
        {e.kind !== "delete" && <p>{e.inserted_text}</p>}
      </div>
    );
  }

  const cls = "hunk hunk--" + (e.kind === "insert" ? "add" : e.kind === "delete" ? "del" : "rep")
    + (active ? " hunk--active" : "")
    + (e.conflict ? " hunk--conflict" : "");

  return (
    <div className={cls} id={"hunk-" + e.id} onClick={() => onFocus(e.id)}>
      <div className="hunk-tag">
        {kindPill(e.kind)}
        {e.drift && <span className="pill pill--warn"><Icons.mapPin />Repositioned</span>}
        {e.conflict && <span className="pill pill--warn"><Icons.warn />Doc changed</span>}
      </div>
      {children}
      <div className="hunk-toolbar" onClick={(ev) => ev.stopPropagation()}>
        <button className="btn btn--xs btn--reject" onClick={() => onResolve(e.id, "reject")}>
          <Icons.x />Reject
        </button>
        <button className="btn btn--xs btn--accept" onClick={() => onResolve(e.id, "accept")}>
          <Icons.check />Accept
        </button>
      </div>
    </div>
  );
}

// ---- left rail -------------------------------------------------------------

function Rail({ activeId, statusMap, onSelect, mode, setMode }) {
  const visible = SpecData.EDITS.filter(e => statusMap[e.id] !== "rejected");

  // Group either by doc (just one doc in this demo) or by source.
  const groups = mode === "doc"
    ? [{ key: "decisions", label: "decisions.md", note: "Decisions", edits: visible }]
    : SpecData.BY_SOURCE.map(g => ({ key: g.source.id, label: g.source.title, note: g.source.when, edits: g.edits.filter(e => statusMap[e.id] !== "rejected") })).filter(g => g.edits.length > 0);

  return (
    <div className="pane">
      <div className="pane-head">
        <div>
          <h4>Pending edits</h4>
          <div className="sub">{visible.length} pending across 1 doc</div>
        </div>
        <button className="btn btn--xs btn--ghost" title="Filter"><Icons.filter /></button>
      </div>

      <div style={{ padding: "10px 14px 0" }}>
        <div className="rail-tabs" role="tablist">
          <button className={mode === "doc" ? "on" : ""} onClick={() => setMode("doc")}>By doc</button>
          <button className={mode === "source" ? "on" : ""} onClick={() => setMode("source")}>By source</button>
        </div>
      </div>

      <div className="search" style={{ marginTop: 10 }}>
        <Icons.search />
        <input placeholder="Search reasons, sources…" />
      </div>

      <div className="pane-body">
        {groups.map(g => (
          <div key={g.key} className="rail-group">
            <div className="rail-group-head">
              <span>{g.label}</span>
              <span>{g.edits.length}</span>
            </div>
            {g.edits.map(e => {
              const status = statusMap[e.id];
              const glyph = kindGlyph(e.kind);
              const src = SpecData.SOURCES[e.source_id];
              return (
                <div
                  key={e.id}
                  className={"rail-item" + (activeId === e.id ? " active" : "") + (status === "accepted" ? " resolved" : "")}
                  onClick={() => onSelect(e.id)}
                >
                  <span className={"glyph " + (status === "accepted" ? "glyph--resolved" : glyph.cls)}>{status === "accepted" ? "✓" : glyph.char}</span>
                  <div>
                    <div className="reason">{e.reason}</div>
                    <div className="src">{sourceIcon(src.icon)}<span>{src.title}</span></div>
                    {e.drift && <div style={{ marginTop: 4 }}><span className="pill pill--warn"><Icons.mapPin />Repositioned</span></div>}
                    {e.conflict && <div style={{ marginTop: 4 }}><span className="pill pill--warn"><Icons.warn />Doc changed</span></div>}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="pane-foot">
        <span className="muted small">Bulk:</span>
        <div className="row" style={{ gap: 6 }}>
          <button className="btn btn--xs btn--reject"><Icons.x />Reject all</button>
          <button className="btn btn--xs btn--accept"><Icons.check />Accept all</button>
        </div>
      </div>
    </div>
  );
}

// ---- right rail (source evidence) ------------------------------------------

function Evidence({ edit }) {
  if (!edit) {
    return (
      <div className="pane pane-evidence">
        <div className="pane-head"><h4>Source evidence</h4></div>
        <div className="pane-body" style={{ padding: 16 }}>
          <p className="muted small">Select a pending edit to see the source quote, the librarian's reason, and the confidence signal.</p>
        </div>
      </div>
    );
  }
  const src = SpecData.SOURCES[edit.source_id];
  return (
    <div className="pane pane-evidence">
      <div className="pane-head">
        <div>
          <h4>Source evidence</h4>
          <div className="sub">Why the librarian proposed this</div>
        </div>
        <button className="btn btn--xs btn--ghost" title="Collapse"><Icons.collapse /></button>
      </div>
      <div className="pane-body evidence">
        <div className="evidence-card">
          <h5>{sourceIcon(src.icon)} {src.kind}</h5>
          <div style={{ fontSize: 14, fontWeight: 500 }}>{src.title}</div>
          <div className="evidence-meta" style={{ marginTop: 4 }}>
            <span className="who">{src.who}</span>
            <span>·</span>
            <span>{src.when}</span>
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn btn--xs"><Icons.link />Open source</button>
            <button className="btn btn--xs btn--ghost"><Icons.history />See thread</button>
          </div>
        </div>

        <div className="evidence-card">
          <h5><Icons.sparkles />Verbatim quote</h5>
          <div className="evidence-quote">
            "{edit.quote}"
            <div><span className="ts">— {edit.quoted_by} · {edit.quoted_at}</span></div>
          </div>
        </div>

        <div className="evidence-card">
          <h5><Icons.shield />Why this proposal</h5>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6 }}>{edit.reason}.</p>
          <div className="evidence-meta" style={{ marginTop: 10 }}>
            <span className={"confidence " + (edit.confidence)}>
              <i></i><i></i><i></i>
              <span style={{ marginLeft: 4 }}>Confidence: {edit.confidence}</span>
            </span>
          </div>
        </div>

        {edit.drift && (
          <div className="callout callout--warn">
            <div className="callout-head"><Icons.mapPin />Anchor repositioned</div>
            <p>The original anchor <span className="mono">"Q2 actions"</span> no longer exists in the doc. Best-effort placed under <strong>"Q2 strategy"</strong>. Confirm before accepting.</p>
          </div>
        )}
        {edit.conflict && (
          <div className="callout callout--warn">
            <div className="callout-head"><Icons.warn />Doc changed since proposal</div>
            <p>The "Out of scope" section was edited 4 min ago. Review the current text before accepting, or ask the advisor to re-draft against the latest version.</p>
            <div className="row" style={{ marginTop: 4 }}>
              <button className="btn btn--xs"><Icons.rotate />Re-anchor against current</button>
              <button className="btn btn--xs btn--ghost">Reject &amp; reauthor in chat</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- the whole panel -------------------------------------------------------

function ReviewPanel() {
  const [activeId, setActiveId] = useState("edit_001");
  const [statusMap, setStatusMap] = useState({});
  const [mode, setMode] = useState("doc");
  const [toast, setToast] = useState(null);
  const focused = SpecData.EDITS.find(e => e.id === activeId);

  function onResolve(id, action) {
    const prev = statusMap[id];
    setStatusMap(s => ({ ...s, [id]: action === "accept" ? "accepted" : "rejected" }));
    setToast({ id, label: action === "accept" ? "Accepted" : "Rejected", prev });
    window.clearTimeout(window.__hunkToastTimer);
    window.__hunkToastTimer = window.setTimeout(() => setToast(null), 6000);
  }
  function undo() {
    if (!toast) return;
    setStatusMap(s => {
      const next = { ...s };
      if (toast.prev === undefined) delete next[toast.id]; else next[toast.id] = toast.prev;
      return next;
    });
    setToast(null);
  }

  // auto-focus next pending after resolve
  useEffect(() => {
    if (statusMap[activeId]) {
      const next = SpecData.EDITS.find(e => !statusMap[e.id]);
      if (next) setActiveId(next.id);
    }
  }, [statusMap]);

  return (
    <div className="hero-frame">
      <div className="hero-stage">
        <div className="hero-topbar">
          <div className="crumbs">
            <Icons.layers />
            <span>Aurora Brand Refresh</span>
            <span className="sep">/</span>
            <strong>Review</strong>
            <span className="pill pill--accent" style={{ marginLeft: 8 }}><Icons.inbox />5 pending</span>
          </div>
          <div className="hero-topbar-r">
            <span className="row small muted" style={{ gap: 8 }}>
              <span><span className="kbd">J</span><span className="kbd">K</span> nav</span>
              <span><span className="kbd">A</span> accept</span>
              <span><span className="kbd">R</span> reject</span>
              <span><span className="kbd">?</span> help</span>
            </span>
            <button className="btn btn--xs btn--ghost"><Icons.panel />Pop out</button>
            <button className="btn btn--xs btn--ghost" title="Close"><Icons.x /></button>
          </div>
        </div>

        <div className="review-grid" style={{ position: "relative" }}>
          <Rail activeId={activeId} statusMap={statusMap} onSelect={setActiveId} mode={mode} setMode={setMode} />
          <div className="pane">
            <div className="pane-head">
              <div className="row" style={{ gap: 10 }}>
                <Icons.doc />
                <div>
                  <h4 style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    Decisions
                    <span className="pill pill--soft mono">decisions.md</span>
                  </h4>
                  <div className="sub">Canonical doc · 5 pending edits visible inline</div>
                </div>
              </div>
              <div className="row">
                <button className="btn btn--xs btn--ghost"><Icons.history />Compare</button>
                <button className="btn btn--xs">Open in wiki</button>
              </div>
            </div>
            <div className="pane-body">
              <div className="doc-stage">
                <DocBody activeId={activeId} edits={SpecData.EDITS} statusMap={statusMap} onFocus={setActiveId} onResolve={onResolve} />
              </div>
            </div>
          </div>
          <Evidence edit={focused} />

          {toast && (
            <div className="toast">
              <Icons.check style={{ color: "oklch(0.85 0.10 155)" }} />
              <span>{toast.label} · {SpecData.EDITS.find(e => e.id === toast.id).reason.slice(0, 42)}…</span>
              <button onClick={undo}><Icons.undo /> Undo</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

window.ReviewPanel = ReviewPanel;
