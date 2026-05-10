/* Chat prototype root.

   Three-column shell when idle:
     [ project sidebar ]   [ chat thread + composer ]   [ insights rail ]

   Click "Open review" inside an assistant message → the review side panel
   slides over from the right and the chat narrows to a comfortable column.
   The right insights rail tucks under the side panel; close the panel to
   restore the original three-column layout. */

const { useState, useEffect, useRef, useMemo, useCallback } = React;

(function () {
  const I = window.Icons;
  const { EDITS, SOURCES } = window.SpecData;

  // ---- mock content ------------------------------------------------------

  const PROJECT = {
    name: "Aurora Brand Refresh",
    initial: "A",
    note: "Strategy & motion · with Devon Cho",
  };
  const ME = { name: "Marta Reyes", handle: "marta@brevity.studio", initial: "MR" };

  const CONVERSATIONS = [
    { id: "c1", title: "Pricing redline + Q2 sync recap", when: "Today · 3:11 pm", active: true, dot: "fresh" },
    { id: "c2", title: "Persona narrowing — wave 3 brief", when: "Yesterday" },
    { id: "c3", title: "Studio Liminal motion handoff", when: "Mon · 4:02 pm" },
    { id: "c4", title: "August keynote backup plan", when: "Apr 28" },
    { id: "c5", title: "Field & Form non-renewal — talking points", when: "Apr 26" },
    { id: "c6", title: "Localization — defer or carve out?", when: "Apr 22" },
  ];

  const NAV = [
    { key: "home", label: "Home", icon: "layers" },
    { key: "chat", label: "Chat", icon: "chat", active: true },
    { key: "wiki", label: "Wiki", icon: "doc", badge: 5 },
    { key: "sources", label: "Sources", icon: "docs", badge: 4 },
    { key: "people", label: "People", icon: "user" },
  ];

  // ---- chat thread -------------------------------------------------------

  function makeInitial() {
    return [
      {
        id: "m1",
        role: "user",
        who: "Devon Cho", initial: "DC", color: "ember",
        when: "3:08 pm",
        body: (
          <p>
            Priya's redline on the pricing review came in this morning — can you record the change in <code>decisions.md</code>?
            Also Sam called out in the Q2 sync that we're <em>not</em> renewing Field &amp; Form. Please sweep both.
          </p>
        ),
      },
      {
        id: "m2",
        role: "assistant",
        who: "Advisor", when: "3:09 pm",
        reasoning: [
          { verb: "Read", token: "src · email_legal", meta: "Wed 9:14 am" },
          { verb: "Read", token: "src · meet_q2_kickoff", meta: "Tue · 47 min" },
          { verb: "Searched", token: '"discount", "Field & Form"', meta: "decisions.md" },
          { verb: "Drafted", token: "5 edits → decisions.md", meta: "0.6s" },
        ],
        body: (
          <>
            <p>
              I matched the two changes you flagged to existing items in <code>decisions.md</code>:
            </p>
            <ul>
              <li>
                Replace the annual-prepay number under Pricing — <strong>15% → 18%</strong>. Priya's redline says 15% would trip the
                MFN clause on two accounts<sup className="cite">2</sup>.
              </li>
              <li>
                Strike the existing <em>"continue with Field &amp; Form"</em> line under Vendors — Sam asked for it to be removed
                from the wiki<sup className="cite">1</sup>.
              </li>
            </ul>
            <p>
              While I was in there I queued <strong>three more proposals</strong> waiting on review — one from Marta in the same Q2 sync,
              one from Devon's brief uploaded Monday, and one from his chat note at 2:48. They're all on <code>decisions.md</code>.
            </p>
          </>
        ),
        proposal: {
          docTitle: "Decisions",
          docPath: "decisions.md",
          total: 5,
          breakdown: { insert: 2, replace: 2, delete: 1 },
          sources: 4,
          flags: [
            { kind: "drift", text: "1 anchor repositioned" },
            { kind: "conflict", text: "1 conflicts with a recent edit" },
          ],
        },
      },
    ];
  }

  // ---- sidebar -----------------------------------------------------------

  function Sidebar() {
    return (
      <nav className="csidebar">
        <div className="csb-brand">
          <div className="csb-brand-mark">{PROJECT.initial}</div>
          <div className="csb-brand-text">
            <div className="csb-brand-name">{PROJECT.name}</div>
            <div className="csb-brand-note">{PROJECT.note}</div>
          </div>
          <button className="csb-iconbtn" title="Project menu"><I.more /></button>
        </div>

        <button className="csb-search">
          <I.search />
          <span>Search</span>
          <span className="csb-kbd">⌘K</span>
        </button>

        <div className="csb-nav">
          {NAV.map((n) => {
            const Ic = I[n.icon];
            return (
              <a key={n.key} className={"csb-navitem" + (n.active ? " is-active" : "")}>
                <Ic /><span>{n.label}</span>
                {n.badge && <span className="csb-navbadge">{n.badge}</span>}
              </a>
            );
          })}
        </div>

        <div className="csb-section">
          <div className="csb-section-head">
            <span>Chats</span>
            <button className="csb-iconbtn" title="New chat"><I.plus /></button>
          </div>
          <div className="csb-list">
            {CONVERSATIONS.map((c) => (
              <a key={c.id} className={"csb-conv" + (c.active ? " is-active" : "")}>
                <span className="csb-conv-title">{c.title}</span>
                <span className="csb-conv-when">{c.when}</span>
                {c.dot && <span className="csb-conv-dot" />}
              </a>
            ))}
          </div>
        </div>

        <div className="csb-foot">
          <div className="csb-user">
            <div className="csb-avatar">{ME.initial}</div>
            <div className="csb-user-text">
              <div className="csb-user-name">{ME.name}</div>
              <div className="csb-user-handle">{ME.handle}</div>
            </div>
            <button className="csb-iconbtn" title="Settings"><I.more /></button>
          </div>
        </div>
      </nav>
    );
  }

  // ---- chat thread + composer -------------------------------------------

  function ReasoningTrace({ items }) {
    const [open, setOpen] = useState(true);
    return (
      <div className={"reasoning" + (open ? "" : " is-collapsed")}>
        <button className="reasoning-toggle" onClick={() => setOpen((v) => !v)}>
          <I.sparkles />
          <span>Reasoned across {items.length} steps</span>
          <span className="reasoning-toggle-state">{open ? "Hide" : "Show"}</span>
        </button>
        {open && (
          <ol className="reasoning-list">
            {items.map((it, i) => (
              <li key={i}>
                <span className="reasoning-verb">{it.verb}</span>
                <code className="reasoning-token">{it.token}</code>
                <span className="reasoning-meta">{it.meta}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    );
  }

  function ProposalCard({ proposal, onOpen, hasOpened }) {
    const { breakdown, total, sources, flags } = proposal;
    return (
      <div className="proposal">
        <div className="proposal-rule" />
        <div className="proposal-head">
          <div className="proposal-head-l">
            <I.doc />
            <div>
              <div className="proposal-title">
                Wiki review proposal
                <span className="proposal-doc">{proposal.docTitle} <span className="proposal-doc-mono">{proposal.docPath}</span></span>
              </div>
              <div className="proposal-sub">
                Drafted {total} edits across {sources} sources · grounded by quote
              </div>
            </div>
          </div>
          <div className="proposal-head-r">
            <span className="kbadge kbadge--accent"><I.inbox />{total} pending</span>
          </div>
        </div>

        <ul className="proposal-stats">
          <li><span className="kglyph kglyph--add">+</span><span>{breakdown.insert} inserts</span></li>
          <li><span className="kglyph kglyph--rep">↻</span><span>{breakdown.replace} replacements</span></li>
          <li><span className="kglyph kglyph--del">−</span><span>{breakdown.delete} deletion</span></li>
        </ul>

        {flags && flags.length > 0 && (
          <div className="proposal-flags">
            {flags.map((f, i) => (
              <span key={i} className="kbadge kbadge--neutral">
                {f.kind === "drift" ? <I.mapPin /> : <I.warn />}
                {f.text}
              </span>
            ))}
          </div>
        )}

        <div className="proposal-foot">
          <span className="proposal-foot-hint">
            <I.shield /> Each edit carries a verbatim quote and a confidence signal.
          </span>
          <button className={"rbtn rbtn--accent" + (hasOpened ? " is-secondary" : "")} onClick={onOpen}>
            {hasOpened ? <><I.panel />Reopen review</> : <><I.panel />Open review</>}
            <span className="rbtn-kbd">↵</span>
          </button>
        </div>
      </div>
    );
  }

  function Avatar({ initial, color }) {
    return <div className={"avatar avatar--" + (color || "iris")}>{initial}</div>;
  }

  function AdvisorMark() {
    return (
      <div className="avatar avatar--ai" aria-hidden="true">
        <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 2v4M10 14v4M2 10h4M14 10h4M4.5 4.5l2.5 2.5M13 13l2.5 2.5M15.5 4.5L13 7M7 13l-2.5 2.5" />
        </svg>
      </div>
    );
  }

  function Message({ m, onOpenReview, hasOpenedReview }) {
    return (
      <div className={"cmsg cmsg--" + m.role}>
        <div className="cmsg-meta">
          {m.role === "assistant" ? <AdvisorMark /> : <Avatar initial={m.initial} color={m.color} />}
          <span className="cmsg-who">{m.who}</span>
          <span className="cmsg-when">{m.when}</span>
        </div>
        <div className="cmsg-body">
          {m.role === "assistant" && m.reasoning && <ReasoningTrace items={m.reasoning} />}
          <div className="cmsg-prose">{m.body}</div>
          {m.proposal && (
            <ProposalCard proposal={m.proposal} onOpen={() => onOpenReview(m.proposal)} hasOpened={hasOpenedReview} />
          )}
        </div>
      </div>
    );
  }

  function Composer({ onSend, reviewOpen }) {
    const [v, setV] = useState("");
    const ref = useRef(null);
    function send() {
      const t = v.trim();
      if (!t) return;
      onSend(t); setV("");
    }
    return (
      <form
        className="composer"
        onSubmit={(e) => { e.preventDefault(); send(); }}
      >
        <div className="composer-meta">
          <I.shield />
          <span>Grounded in <strong>{Object.keys(SOURCES).length} sources</strong> · Aurora project memory</span>
          {reviewOpen && <span className="composer-meta-sep">·</span>}
          {reviewOpen && <span className="composer-meta-aside">Reviewing 5 proposed edits to <code>decisions.md</code></span>}
        </div>
        <div className="composer-shell">
          <textarea
            ref={ref}
            rows={1}
            value={v}
            onChange={(e) => setV(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
            }}
            placeholder="Ask the advisor, or describe a decision to record…"
          />
          <div className="composer-toolbar">
            <div className="composer-tools">
              <button type="button" className="composer-iconbtn" title="Attach"><I.file /></button>
              <button type="button" className="composer-iconbtn" title="Sources"><I.docs /></button>
              <button type="button" className="composer-pill"><I.sparkles />Suggest decisions</button>
            </div>
            <div className="composer-send">
              <span className="csb-kbd">↵</span>
              <button type="submit" className="rbtn rbtn--accent" disabled={!v.trim()}>
                <I.send />Send
              </button>
            </div>
          </div>
        </div>
      </form>
    );
  }

  function Suggestions({ onPick }) {
    const items = [
      "What changed in decisions.md this week?",
      "Show me everything that's still pending review.",
      "Compare Priya's redline against the current pricing decision.",
      "Draft a note explaining the Field & Form change to the team.",
    ];
    return (
      <div className="suggestions">
        {items.map((s) => (
          <button key={s} className="suggestion" onClick={() => onPick(s)}>
            <I.zap /><span>{s}</span>
          </button>
        ))}
      </div>
    );
  }

  function ChatThread({ onOpenReview, hasOpenedReview }) {
    const [messages, setMessages] = useState(makeInitial);
    const [pending, setPending] = useState(false);
    const threadRef = useRef(null);

    useEffect(() => {
      const el = threadRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }, [messages.length, pending]);

    function send(text) {
      const id = "u" + Date.now();
      setMessages((m) => [
        ...m,
        { id, role: "user", who: ME.name, initial: ME.initial, color: "iris", when: "now", body: <p>{text}</p> },
      ]);
      setPending(true);
      setTimeout(() => {
        setPending(false);
        setMessages((m) => [
          ...m,
          {
            id: id + "a",
            role: "assistant",
            who: "Advisor",
            when: "just now",
            reasoning: [
              { verb: "Searched", token: "decisions.md", meta: "8 hits" },
              { verb: "Read", token: "src · meet_q2_kickoff", meta: "0.4s" },
              { verb: "Synthesized", token: "answer + 2 cites", meta: "0.5s" },
            ],
            body: (
              <>
                <p>
                  Three things are still pending: the launch dependency note from Marta<sup className="cite">1</sup>,
                  the persona narrowing from Devon's brief<sup className="cite">3</sup>, and the mobile-scope flip
                  from your 2:48 chat note<sup className="cite">4</sup>. Open the review to walk through each.
                </p>
              </>
            ),
            proposal: {
              docTitle: "Decisions",
              docPath: "decisions.md",
              total: 5,
              breakdown: { insert: 2, replace: 2, delete: 1 },
              sources: 4,
              flags: [
                { kind: "drift", text: "1 anchor repositioned" },
                { kind: "conflict", text: "1 conflicts with a recent edit" },
              ],
            },
          },
        ]);
      }, 950);
    }

    return (
      <div className="chat-col">
        <header className="chat-head">
          <div className="chat-head-l">
            <h2>Pricing redline + Q2 sync recap</h2>
            <div className="chat-head-meta">
              <span><I.chat /> 3 messages</span>
              <span><I.docs /> 4 sources</span>
              <span><I.doc /> 5 proposed edits</span>
            </div>
          </div>
          <div className="chat-head-r">
            <button className="rbtn rbtn--sm rbtn--ghost"><I.history /></button>
            <button className="rbtn rbtn--sm rbtn--ghost"><I.more /></button>
          </div>
        </header>

        <div ref={threadRef} className="chat-thread scroll">
          {messages.map((m) => (
            <Message key={m.id} m={m} onOpenReview={onOpenReview} hasOpenedReview={hasOpenedReview} />
          ))}
          {pending && (
            <div className="cmsg cmsg--assistant cmsg--pending">
              <div className="cmsg-meta">
                <AdvisorMark />
                <span className="cmsg-who">Advisor</span>
                <span className="cmsg-when">thinking…</span>
              </div>
              <div className="cmsg-body">
                <div className="thinking">
                  <span /><span /><span />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="chat-foot">
          {messages.length <= 2 && <Suggestions onPick={send} />}
          <Composer onSend={send} reviewOpen={false} />
        </div>
      </div>
    );
  }

  // ---- right insights rail -----------------------------------------------

  function InsightsRail({ onOpenReview }) {
    const recent = [
      { ic: "doc", text: <>Drafted <strong>5 edits</strong> on <code>decisions.md</code>.</>, sub: "Awaiting your review", when: "3:09 pm" },
      { ic: "email", text: <><strong>Priya Anand</strong> uploaded <em>"Re: pricing review — legal redline"</em>.</>, sub: "Email · 4 chunks indexed", when: "9:14 am" },
      { ic: "meeting", text: <><strong>Q2 leadership sync</strong> transcript ingested.</>, sub: "Tue · 47 min · 3 speakers", when: "Tue" },
      { ic: "file", text: <><strong>Devon Cho</strong> uploaded <em>Aurora-brief-v4.pdf</em>.</>, sub: "Brand brief · 26 chunks indexed", when: "Mon" },
    ];

    return (
      <aside className="insights">
        <div className="insights-card insights-card--pending">
          <div className="insights-eyebrow">
            <span>Pending review</span>
            <span className="insights-eyebrow-pill">5 edits</span>
          </div>
          <h3>The advisor proposed changes to <code>decisions.md</code>.</h3>
          <p>Two from this conversation, three queued from earlier sources. Open the review to walk through each one.</p>
          <ul className="insights-mini">
            <li><span className="kglyph kglyph--add">+</span><span>Launch contingent on partner keynote</span></li>
            <li><span className="kglyph kglyph--rep">↻</span><span>Annual-prepay <em>15%</em> → <em>18%</em></span></li>
            <li><span className="kglyph kglyph--del">−</span><span>Field &amp; Form continued through Q3</span></li>
            <li className="insights-mini-more">+ 2 more</li>
          </ul>
          <button className="rbtn rbtn--accent insights-cta" onClick={onOpenReview}>
            <I.panel />Open review
          </button>
        </div>

        <div className="insights-card">
          <div className="insights-eyebrow">
            <span>Sources in this thread</span>
          </div>
          <ul className="insights-sources">
            {Object.values(SOURCES).map((s) => {
              const Ic = I[s.icon] || I.file;
              return (
                <li key={s.id}>
                  <span className="insights-source-ic"><Ic /></span>
                  <div className="insights-source-body">
                    <div className="insights-source-title">{s.title}</div>
                    <div className="insights-source-meta">{s.kind} · {s.when}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="insights-card">
          <div className="insights-eyebrow">
            <span>Recent activity</span>
          </div>
          <ul className="insights-feed">
            {recent.map((r, i) => {
              const Ic = I[r.ic] || I.file;
              return (
                <li key={i}>
                  <span className="insights-feed-ic"><Ic /></span>
                  <div>
                    <div className="insights-feed-text">{r.text}</div>
                    <div className="insights-feed-sub">{r.sub} · {r.when}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>
    );
  }

  // ---- root --------------------------------------------------------------

  function App() {
    const [reviewOpen, setReviewOpen] = useState(false);
    const [hasOpened, setHasOpened] = useState(false);

    const open = useCallback(() => {
      setReviewOpen(true);
      setHasOpened(true);
    }, []);
    const close = useCallback(() => setReviewOpen(false), []);

    // open the review panel by default to show the prototype's hero state
    useEffect(() => {
      const t = setTimeout(() => { setReviewOpen(true); setHasOpened(true); }, 380);
      return () => clearTimeout(t);
    }, []);

    return (
      <div className={"app-shell" + (reviewOpen ? " is-review-open" : "")}>
        <Sidebar />
        <main className="stage">
          <ChatThread onOpenReview={open} hasOpenedReview={hasOpened} />
          <InsightsRail onOpenReview={open} />
          <window.ReviewSidePanel open={reviewOpen} onClose={close} />
          <button
            className={"review-scrim" + (reviewOpen ? " is-shown" : "")}
            aria-label="Close review"
            onClick={close}
            tabIndex={reviewOpen ? 0 : -1}
          />
        </main>
      </div>
    );
  }

  ReactDOM.createRoot(document.getElementById("root")).render(<App />);
})();
