/* Side panel: the Cursor/Codex-style review surface that slides over from the
   right when the user clicks "Open review" inside the chat. Three regions:

     [ rail: pending edits ]   [ canonical doc with rich diffs ]   [ evidence ]

   Word-level diffs (via ChatDiff.WordDiff) so a one-word change colors only
   that word — surrounding prose stays plain. Only red (delete) and green
   (insert) carry color; provenance / drift / conflict use neutral pills. */

const { useState: useStateR, useEffect: useEffectR, useMemo: useMemoR, useRef: useRefR, useCallback: useCallbackR } = React;
const { WordDiff } = window.ChatDiff;

(function () {
  const I = window.Icons;
  const { EDITS, SOURCES, BY_SOURCE } = window.SpecData;

  function srcIcon(name) {
    const Comp = I[name] || I.file;
    return <Comp />;
  }
  function kindLabel(k) {
    return k === "insert" ? "Insertion" : k === "delete" ? "Deletion" : "Replacement";
  }
  function kindGlyph(k) {
    if (k === "insert") return { cls: "kglyph kglyph--add", char: "+" };
    if (k === "delete") return { cls: "kglyph kglyph--del", char: "−" };
    return { cls: "kglyph kglyph--rep", char: "↻" };
  }
  function kindBadge(k) {
    if (k === "insert") return <span className="kbadge kbadge--add"><I.plus />Insert</span>;
    if (k === "delete") return <span className="kbadge kbadge--del"><I.minus />Delete</span>;
    return <span className="kbadge kbadge--rep"><I.swap />Replace</span>;
  }

  // ---- canonical doc, hunks slotted in at their right anchors ------------

  function DocBody({ activeId, statusMap, onFocus, onResolve }) {
    const get = (id) => EDITS.find((e) => e.id === id);
    const e1 = get("edit_001"), e2 = get("edit_002"), e3 = get("edit_003"),
          e4 = get("edit_004"), e5 = get("edit_005");

    return (
      <article className="rdoc">
        <header className="rdoc-head">
          <div className="rdoc-eyebrow">decisions.md · updated 2 hours ago · 5 pending</div>
          <h1>Decisions</h1>
        </header>

        <p>
          Recorded decisions for the Aurora brand refresh. New items land here only after the team
          has reviewed and accepted a proposal. Anything contested goes to <strong>Open
          questions</strong> in <code>work.md</code> first.
        </p>

        <h2>Q2 strategy</h2>
        <ul>
          <li>Target launch window is the <strong>first week of August</strong>, anchored on the partner conference keynote.</li>
          <li>Primary persona has narrowed from "marketing operator" to <strong>"brand director at a Series-B-to-D SaaS"</strong> after the customer interviews in April.</li>
          <li>Photography direction is <strong>portraits over product shots</strong>; existing illustration set is paused but not retired.</li>
        </ul>

        <Hunk e={e1} active={activeId === e1.id} status={statusMap[e1.id]} onFocus={onFocus} onResolve={onResolve}>
          <p><WordDiff kind="insert" after={e1.inserted_text} /></p>
        </Hunk>

        <Hunk e={e4} active={activeId === e4.id} status={statusMap[e4.id]} onFocus={onFocus} onResolve={onResolve}>
          <p><WordDiff kind="insert" after={e4.inserted_text} /></p>
        </Hunk>

        <h2>Naming &amp; nomenclature</h2>
        <ul>
          <li>The product family will be referred to as <strong>Aurora Studio</strong> in external collateral. "Aurora" alone is reserved for the platform brand.</li>
          <li>"Modules" → "Workspaces" everywhere user-facing. Marketing, docs and sales decks all migrate together; no partial rollout.</li>
        </ul>

        <h2>Vendors</h2>
        <Hunk e={e3} active={activeId === e3.id} status={statusMap[e3.id]} onFocus={onFocus} onResolve={onResolve}>
          <ul><li><WordDiff kind="delete" before={e3.deleted_text} /></li></ul>
        </Hunk>
        <ul>
          <li>Photography sourced through <strong>Studio Liminal</strong> for the hero campaign; secondary assets through internal team.</li>
        </ul>

        <h2>Pricing</h2>
        <ul>
          <li>Headline tier remains <strong>$249/seat/month</strong> for the first 12 months post-launch.</li>
        </ul>
        <Hunk e={e2} active={activeId === e2.id} status={statusMap[e2.id]} onFocus={onFocus} onResolve={onResolve}>
          <ul><li><WordDiff before={e2.deleted_text} after={e2.inserted_text} /></li></ul>
        </Hunk>

        <h2>Out of scope for this engagement</h2>
        <ul>
          <li>Localization beyond English and German is deferred to 2027.</li>
        </ul>
        <Hunk e={e5} active={activeId === e5.id} status={statusMap[e5.id]} onFocus={onFocus} onResolve={onResolve}>
          <ul><li><WordDiff before={e5.deleted_text} after={e5.inserted_text} /></li></ul>
        </Hunk>
      </article>
    );
  }

  function Hunk({ e, active, status, onFocus, onResolve, children }) {
    if (status === "rejected") {
      return (
        <div className="rhunk rhunk--resolved-rej" onClick={() => onFocus(e.id)}>
          <I.x /> <span>Rejected · {kindLabel(e.kind).toLowerCase()} from {SOURCES[e.source_id].title}</span>
        </div>
      );
    }
    if (status === "accepted") {
      return (
        <div className="rhunk rhunk--resolved-acc">
          <div className="rhunk-resolved-tag"><I.check /> Saved to decisions.md · from {SOURCES[e.source_id].title}</div>
          {e.kind !== "delete" && <p>{window.ChatDiff.stripBold(e.inserted_text || "")}</p>}
        </div>
      );
    }
    const cls = "rhunk rhunk--" + (e.kind === "insert" ? "add" : e.kind === "delete" ? "del" : "rep")
      + (active ? " is-active" : "")
      + (e.conflict ? " is-conflict" : "");
    return (
      <div className={cls} id={"rhunk-" + e.id} onClick={() => onFocus(e.id)}>
        <div className="rhunk-tag">
          {kindBadge(e.kind)}
          {e.drift && <span className="kbadge kbadge--neutral"><I.mapPin />Repositioned</span>}
          {e.conflict && <span className="kbadge kbadge--neutral"><I.warn />Doc changed</span>}
        </div>
        <div className="rhunk-body">{children}</div>
        <div className="rhunk-toolbar" onClick={(ev) => ev.stopPropagation()}>
          <button className="rbtn rbtn--reject" onClick={() => onResolve(e.id, "reject")}>
            <I.x />Reject <span className="rbtn-kbd">R</span>
          </button>
          <button className="rbtn rbtn--accept" onClick={() => onResolve(e.id, "accept")}>
            <I.check />Accept <span className="rbtn-kbd">A</span>
          </button>
        </div>
      </div>
    );
  }

  // ---- left rail (pending list) -----------------------------------------

  function Rail({ activeId, statusMap, onSelect, mode, setMode }) {
    const visible = EDITS.filter((e) => statusMap[e.id] !== "rejected");
    const groups = mode === "doc"
      ? [{ key: "decisions", label: "decisions.md", note: "Decisions", edits: visible }]
      : BY_SOURCE.map((g) => ({
          key: g.source.id,
          label: g.source.title,
          note: g.source.when,
          edits: g.edits.filter((e) => statusMap[e.id] !== "rejected"),
        })).filter((g) => g.edits.length > 0);

    return (
      <div className="rail">
        <div className="rail-head">
          <div>
            <h4>Pending edits</h4>
            <div className="rail-sub">{visible.length} pending across 1 doc</div>
          </div>
        </div>

        <div className="rail-tabs" role="tablist">
          <button className={mode === "doc" ? "on" : ""} onClick={() => setMode("doc")}>By doc</button>
          <button className={mode === "source" ? "on" : ""} onClick={() => setMode("source")}>By source</button>
        </div>

        <label className="rail-search">
          <I.search />
          <input placeholder="Search reasons, sources…" />
        </label>

        <div className="rail-body">
          {groups.map((g) => (
            <div key={g.key} className="rail-group">
              <div className="rail-group-head">
                <span>{g.label}</span>
                <span className="rail-count">{g.edits.length}</span>
              </div>
              {g.edits.map((e) => {
                const status = statusMap[e.id];
                const glyph = kindGlyph(e.kind);
                const src = SOURCES[e.source_id];
                return (
                  <button
                    key={e.id}
                    className={"rail-item" + (activeId === e.id ? " is-active" : "") + (status === "accepted" ? " is-resolved" : "")}
                    onClick={() => onSelect(e.id)}
                  >
                    <span className={status === "accepted" ? "kglyph kglyph--done" : glyph.cls}>
                      {status === "accepted" ? "✓" : glyph.char}
                    </span>
                    <span className="rail-item-body">
                      <span className="rail-reason">{e.reason}</span>
                      <span className="rail-src">{srcIcon(src.icon)}<span>{src.title}</span></span>
                      {(e.drift || e.conflict) && (
                        <span className="rail-flags">
                          {e.drift && <span className="kbadge kbadge--neutral kbadge--xs"><I.mapPin />Repositioned</span>}
                          {e.conflict && <span className="kbadge kbadge--neutral kbadge--xs"><I.warn />Doc changed</span>}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="rail-foot">
          <span className="rail-foot-lbl">Bulk:</span>
          <button className="rbtn rbtn--reject rbtn--sm"><I.x />Reject all</button>
          <button className="rbtn rbtn--accept rbtn--sm"><I.check />Accept all</button>
        </div>
      </div>
    );
  }

  // ---- right rail (evidence) --------------------------------------------

  function Evidence({ edit }) {
    if (!edit) {
      return (
        <aside className="evidence">
          <div className="evidence-head"><h4>Source evidence</h4></div>
          <div className="evidence-empty">Select a pending edit to see the source quote, the librarian's reason, and the confidence signal.</div>
        </aside>
      );
    }
    const src = SOURCES[edit.source_id];
    return (
      <aside className="evidence">
        <div className="evidence-head">
          <div>
            <h4>Source evidence</h4>
            <div className="evidence-sub">Why the librarian proposed this</div>
          </div>
        </div>

        <div className="evidence-body">
          <div className="ev-card">
            <div className="ev-card-head"><span className="ev-icon">{srcIcon(src.icon)}</span><span className="ev-kind">{src.kind}</span></div>
            <div className="ev-title">{src.title}</div>
            <div className="ev-meta"><span>{src.who}</span> · <span>{src.when}</span></div>
            <div className="ev-actions">
              <button className="rbtn rbtn--sm"><I.link />Open source</button>
              <button className="rbtn rbtn--sm rbtn--ghost"><I.history />See thread</button>
            </div>
          </div>

          <div className="ev-card">
            <div className="ev-card-head"><I.sparkles /><span>Verbatim quote</span></div>
            <blockquote className="ev-quote">
              "{edit.quote}"
              <cite>— {edit.quoted_by} · {edit.quoted_at}</cite>
            </blockquote>
          </div>

          <div className="ev-card">
            <div className="ev-card-head"><I.shield /><span>Why this proposal</span></div>
            <p className="ev-reason">{edit.reason}.</p>
            <div className={"ev-confidence ev-confidence--" + edit.confidence}>
              <i></i><i></i><i></i>
              <span>Confidence · {edit.confidence}</span>
            </div>
          </div>

          {edit.drift && (
            <div className="ev-callout ev-callout--neutral">
              <div className="ev-callout-head"><I.mapPin />Anchor repositioned</div>
              <p>The original anchor <span className="ev-mono">"Q2 actions"</span> no longer exists in the doc. Best-effort placed under <strong>"Q2 strategy"</strong>. Confirm before accepting.</p>
            </div>
          )}
          {edit.conflict && (
            <div className="ev-callout ev-callout--neutral">
              <div className="ev-callout-head"><I.warn />Doc changed since proposal</div>
              <p>The "Out of scope" section was edited 4 min ago. Review the current text before accepting, or ask the advisor to re-draft against the latest version.</p>
              <div className="ev-callout-actions">
                <button className="rbtn rbtn--sm"><I.rotate />Re-anchor against current</button>
                <button className="rbtn rbtn--sm rbtn--ghost">Reject &amp; reauthor in chat</button>
              </div>
            </div>
          )}
        </div>
      </aside>
    );
  }

  // ---- whole side panel -------------------------------------------------

  function ReviewPanel({ open, onClose }) {
    const [activeId, setActiveId] = useStateR("edit_001");
    const [statusMap, setStatusMap] = useStateR({});
    const [mode, setMode] = useStateR("doc");
    const [toast, setToast] = useStateR(null);
    const focused = EDITS.find((e) => e.id === activeId);

    const onResolve = useCallbackR((id, action) => {
      const prev = statusMap[id];
      setStatusMap((s) => ({ ...s, [id]: action === "accept" ? "accepted" : "rejected" }));
      setToast({ id, label: action === "accept" ? "Accepted" : "Rejected", prev });
      window.clearTimeout(window.__rToast);
      window.__rToast = window.setTimeout(() => setToast(null), 5500);
    }, [statusMap]);

    function undo() {
      if (!toast) return;
      setStatusMap((s) => {
        const next = { ...s };
        if (toast.prev === undefined) delete next[toast.id]; else next[toast.id] = toast.prev;
        return next;
      });
      setToast(null);
    }

    // Auto-focus next pending after resolve
    useEffectR(() => {
      if (statusMap[activeId]) {
        const next = EDITS.find((e) => !statusMap[e.id]);
        if (next) setActiveId(next.id);
      }
    }, [statusMap]);

    // Keyboard nav: J/K next/prev, A accept, R reject, Esc close
    useEffectR(() => {
      if (!open) return;
      function onKey(ev) {
        if (ev.target && /input|textarea/i.test(ev.target.tagName)) return;
        const pending = EDITS.filter((e) => !statusMap[e.id] || statusMap[e.id] === "pending");
        if (ev.key === "Escape") { onClose(); return; }
        if (ev.key === "j" || ev.key === "ArrowDown") {
          ev.preventDefault();
          const i = EDITS.findIndex((e) => e.id === activeId);
          const next = EDITS[(i + 1) % EDITS.length];
          if (next) setActiveId(next.id);
        } else if (ev.key === "k" || ev.key === "ArrowUp") {
          ev.preventDefault();
          const i = EDITS.findIndex((e) => e.id === activeId);
          const next = EDITS[(i - 1 + EDITS.length) % EDITS.length];
          if (next) setActiveId(next.id);
        } else if (ev.key === "a" || ev.key === "A") {
          ev.preventDefault(); onResolve(activeId, "accept");
        } else if (ev.key === "r" || ev.key === "R") {
          ev.preventDefault(); onResolve(activeId, "reject");
        }
      }
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, [open, activeId, statusMap, onResolve, onClose]);

    const pendingCount = EDITS.filter((e) => !statusMap[e.id]).length;

    return (
      <div className={"review-panel" + (open ? " is-open" : "")}>
        <div className="review-topbar">
          <div className="review-crumb">
            <I.layers />
            <span>Aurora Brand Refresh</span>
            <span className="sep">/</span>
            <strong>Review</strong>
            <span className="kbadge kbadge--accent" style={{ marginLeft: 8 }}><I.inbox />{pendingCount} pending</span>
          </div>
          <div className="review-topbar-right">
            <span className="review-keys">
              <span><span className="kbd-mini">J</span><span className="kbd-mini">K</span> nav</span>
              <span><span className="kbd-mini">A</span> accept</span>
              <span><span className="kbd-mini">R</span> reject</span>
              <span><span className="kbd-mini">Esc</span> close</span>
            </span>
            <button className="rbtn rbtn--sm rbtn--ghost"><I.panel />Pop out</button>
            <button className="rbtn rbtn--sm rbtn--ghost" onClick={onClose} title="Close (Esc)"><I.x /></button>
          </div>
        </div>

        <div className="review-grid">
          <Rail activeId={activeId} statusMap={statusMap} onSelect={setActiveId} mode={mode} setMode={setMode} />

          <main className="rdoc-pane">
            <div className="rdoc-pane-head">
              <div className="rdoc-pane-title">
                <I.doc />
                <div>
                  <h4>Decisions <span className="kbadge kbadge--soft mono">decisions.md</span></h4>
                  <div className="rail-sub">Canonical doc · {pendingCount} pending visible inline</div>
                </div>
              </div>
              <div className="rdoc-pane-actions">
                <button className="rbtn rbtn--sm rbtn--ghost"><I.history />Compare</button>
                <button className="rbtn rbtn--sm">Open in wiki</button>
              </div>
            </div>
            <div className="rdoc-scroll">
              <DocBody activeId={activeId} statusMap={statusMap} onFocus={setActiveId} onResolve={onResolve} />
            </div>
          </main>

          <Evidence edit={focused} />

          {toast && (
            <div className="review-toast">
              <I.check className="review-toast-ic" />
              <span>{toast.label} · {EDITS.find((e) => e.id === toast.id).reason.slice(0, 48)}…</span>
              <button onClick={undo}><I.undo /> Undo</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  window.ReviewSidePanel = ReviewPanel;
})();
