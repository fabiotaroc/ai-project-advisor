// Chat scene with right rail
const { useState: useStateChat, useRef: useRefChat, useEffect: useEffectChat } = React;

window.ChatScene = function ChatScene({ activeChat }) {
  const [messages, setMessages] = useStateChat([
    {
      role: "user",
      who: "Taro",
      when: "2:14 PM",
      text: <p>What's our position on EU hosting for the Samsung pilot? I keep getting asked, and I want to make sure I'm being consistent.</p>,
    },
    {
      role: "ai",
      who: "Advisor",
      when: "grounded in 3 sources",
      text: (
        <>
          <p>The PRD commits to supporting <strong>EU-hosted infrastructure where possible</strong><CitePill n={1}/>, and lists a data processing agreement and explicit handling of deletion requests as MVP-trust baseline items<CitePill n={1}/>. The most recent stakeholder note from Tomas adds that <strong>Samsung Legal flagged Germany specifically</strong> — they want German-region hosting for any production rollout<CitePill n={2}/>.</p>
          <p>You don't yet have a written hosting plan. A one-pager covering region, subprocessors, and DPA template would close this — I can draft it from the PRD and Tomas's note<CitePill n={2}/><CitePill n={3}/>.</p>
        </>
      ),
      tools: [
        { name: "search_sources", arg: '"EU hosting"', meta: "8 hits" },
        { name: "read_file",      arg: "docs/PRD.md", meta: "22ms" },
        { name: "read_source",    arg: "Tomas — Samsung Legal review", meta: "10ms" },
      ],
    },
  ]);
  const [draft, setDraft] = useStateChat("");
  const [pending, setPending] = useStateChat(false);
  const threadRef = useRefChat(null);

  useEffectChat(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [messages, pending]);

  function send(text) {
    const t = (text ?? draft).trim();
    if (!t) return;
    setDraft("");
    setMessages(m => [...m, { role: "user", who: "Taro", when: "now", text: <p>{t}</p> }]);
    setPending(true);
    setTimeout(() => {
      setMessages(m => [...m, {
        role: "ai", who: "Advisor", when: "grounded in 2 sources",
        text: (<>
          <p>Pulling from the Q2 recap and your stakeholder map<CitePill n={3}/>: the segments with the strongest opens were <strong>"Galaxy Buds repeat buyers"</strong> and <strong>"foldable upgraders"</strong>. Pre-headers that named a benefit (battery life, screen) outperformed brand-led ones by ~14%.</p>
          <p>Open question for Eun-ji: do we want to repeat the foldable angle in Q3 or rotate to wearables<CitePill n={2}/>?</p>
        </>),
        tools: [
          { name: "search_sources", arg: '"subject line"', meta: "12 hits" },
          { name: "read_source",    arg: "samsung-q2-recap.pdf", meta: "18ms" },
        ],
      }]);
      setPending(false);
    }, 1100);
  }

  return (
    <div className="chat-wrap">
      <div className="chat-col">
        <div className="chat-thread scroll" ref={threadRef}>
          {messages.map((m, i) => (
            <div key={i} className={"chat-msg " + m.role}>
              <div className="avatar">{m.role === "ai" ? "◐" : "T"}</div>
              <div className="body-wrap">
                <div className="who">
                  <span>{m.who}</span>
                  <span className="who-meta">· {m.when}</span>
                </div>
                <div className="bubble">{m.text}</div>
                {m.tools && (
                  <div className="tool-row">
                    {m.tools.map((t, j) => (
                      <span key={j} className="tool-trace">
                        <span className="dot"></span>
                        {t.name} <span style={{color:"var(--ink-3)"}}>·</span> {t.arg} <span style={{color:"var(--ink-3)"}}>· {t.meta}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {pending && (
            <div className="chat-msg ai">
              <div className="avatar">◐</div>
              <div className="body-wrap">
                <div className="who"><span>Advisor</span><span className="who-meta">· thinking</span></div>
                <div className="bubble" style={{display:"flex", alignItems:"center", gap:14}}>
                  <span style={{display:"inline-flex", gap:4}}>
                    <span className="dot-stream" style={{"--i":0}}></span>
                    <span className="dot-stream" style={{"--i":1}}></span>
                    <span className="dot-stream" style={{"--i":2}}></span>
                  </span>
                  <span style={{fontSize:13, color:"var(--ink-2)"}}>Reading 3 sources…</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="composer-wrap">
          {messages.length <= 2 && (
            <div className="suggestions">
              {[
                "Summarize the current project direction and any open risks.",
                "What did Samsung Legal say about hosting?",
                "Draft a status snapshot for Eun-ji.",
                "What changed since last week?",
              ].map(s => (
                <button key={s} className="suggestion" onClick={() => send(s)}>{s}</button>
              ))}
            </div>
          )}
          <form className="composer" onSubmit={e => { e.preventDefault(); send(); }}>
            <textarea
              rows={1}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Ask about this project, or describe what you need…"
            />
            <div className="composer-foot">
              <div className="left">
                <button type="button" className="icon-btn" title="Attach"><Icon name="paperclip"/></button>
                <button type="button" className="icon-btn" title="Sources"><Icon name="book"/></button>
                <span style={{fontSize:11, color:"var(--ink-3)", fontFamily:"var(--font-mono)", marginLeft:6}}>
                  Grounded in <strong style={{color:"var(--ink-2)"}}>{SAMPLE.sources.length} sources</strong>
                </span>
              </div>
              <div className="spacer"></div>
              <div className="right">
                <span className="kbd">↵</span>
                <button type="submit" className="send-btn" disabled={!draft.trim()}>
                  Send <Icon name="arrow" size={13}/>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <ChatRail/>
    </div>
  );
};

function CitePill({ n }) {
  return <span className="cite" onClick={e => e.stopPropagation()}>{n}</span>;
}

function ChatRail() {
  return (
    <aside className="rail scroll">
      <div className="rail-section">
        <div className="rail-eyebrow">
          <span className="label">Citations</span>
          <span className="meta">3 sources</span>
        </div>
        <div className="col gap-2">
          {SAMPLE.citations.map(c => (
            <div className="cite-card" key={c.num}>
              <div className="num">{c.num}</div>
              <div className="info">
                <div className="name">{c.source}</div>
                <div className="quote">"{c.quote}"</div>
                <div className="ref">{c.ref}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rail-section">
        <div className="rail-eyebrow">
          <span className="label">Memory drafts</span>
          <span className="meta">1 awaiting</span>
        </div>
        <div className="memory-stack">
          <div className="mem-card">
            <div className="head">
              <span>◐ Proposed update</span>
              <span className="pill pill-accent" style={{marginLeft:"auto"}}>Draft</span>
            </div>
            <div className="body">
              Add to <strong>DECISIONS.md</strong>:<br/>
              <em>"Hosting region for Samsung pilot will be Germany (eu-central-1). Reviewed by Tomas, 2026-04-25."</em>
            </div>
            <div className="actions">
              <button className="btn btn-primary btn-sm">Save</button>
              <button className="btn btn-secondary btn-sm">Edit</button>
              <button className="btn btn-ghost btn-sm">Discard</button>
            </div>
          </div>
        </div>
      </div>

      <div className="rail-section">
        <div className="rail-eyebrow">
          <span className="label">In this conversation</span>
        </div>
        <div className="col gap-1" style={{fontSize:12.5, color:"var(--ink-2)"}}>
          <div className="row gap-2"><Icon name="chat" size={12}/><span>2 messages</span></div>
          <div className="row gap-2"><Icon name="book" size={12}/><span>3 sources referenced</span></div>
          <div className="row gap-2"><Icon name="sparkles" size={12}/><span>1 memory draft pending</span></div>
        </div>
      </div>
    </aside>
  );
}

Object.assign(window, { ChatScene: window.ChatScene });
