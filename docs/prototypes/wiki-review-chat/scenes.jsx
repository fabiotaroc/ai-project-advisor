// Home, Sources, Settings scenes

window.HomeScene = function HomeScene({ setScene, setActiveChat }) {
  return (
    <div className="home scroll">
      <div className="home-hero">
        <div>
          <div className="eyebrow" style={{marginBottom:12}}>{SAMPLE.project.code} · DACH 2026</div>
          <h1>Good morning, Taro.</h1>
          <p>You have <strong style={{color:"var(--ink-1)"}}>1 memory draft</strong> awaiting review and <strong style={{color:"var(--ink-1)"}}>2 new sources</strong> indexed since yesterday. Eun-ji is expecting a status snapshot before her Q3 kickoff next week.</p>
        </div>
        <div className="actions">
          <button className="btn btn-secondary"><Icon name="upload" size={14}/> Add source</button>
          <button className="btn btn-primary" onClick={() => { setScene("chat"); setActiveChat("c1"); }}>
            <Icon name="chat" size={14}/> Ask the advisor
          </button>
        </div>
      </div>

      <div className="home-grid">
        <div className="col gap-6">
          <div className="panel">
            <div className="panel-head">
              <h3>Awaiting your review</h3>
              <span className="meta">1 draft</span>
            </div>
            <div className="panel-body" style={{padding:20}}>
              <div className="mem-card">
                <div className="head">
                  <span>◐ Memory · proposed update</span>
                  <span className="pill pill-accent" style={{marginLeft:"auto"}}>Draft</span>
                  <span style={{fontFamily:"var(--font-mono)", fontSize:10.5, color:"var(--ink-3)"}}>2 min ago</span>
                </div>
                <div className="body">
                  Add to <strong>DECISIONS.md</strong>:<br/>
                  <em>"Hosting region for Samsung pilot will be Germany (eu-central-1). Reviewed by Tomas, 2026-04-25."</em>
                </div>
                <div style={{fontSize:12, color:"var(--ink-3)", fontFamily:"var(--font-mono)"}}>
                  Drafted from <span style={{color:"var(--ink-2)"}}>PRD.md</span>, <span style={{color:"var(--ink-2)"}}>Tomas — Samsung Legal review</span>
                </div>
                <div className="actions">
                  <button className="btn btn-primary btn-sm">Save to memory</button>
                  <button className="btn btn-secondary btn-sm">Edit draft</button>
                  <button className="btn btn-ghost btn-sm">Discard</button>
                </div>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h3>Activity</h3>
              <span className="meta">last 7 days</span>
            </div>
            <div className="panel-body" style={{padding:0}}>
              {SAMPLE.feed.map((f, i) => (
                <div key={i} className="feed-row">
                  <div className="when">{f.when}</div>
                  <div className={"who-glyph" + (f.who === "AI" ? " ai" : "")}>{f.glyph}</div>
                  <div className="what">{f.what}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="col gap-6">
          <div className="panel">
            <div className="panel-head">
              <h3>Project pulse</h3>
              <span className="meta">live</span>
            </div>
            <div className="kpi-grid">
              <div className="kpi"><div className="label">Sources</div><div className="value">{SAMPLE.sources.length}</div><div className="delta">+2 this week</div></div>
              <div className="kpi"><div className="label">Chunks indexed</div><div className="value">139</div><div className="delta">+34 this week</div></div>
              <div className="kpi"><div className="label">Conversations</div><div className="value">12</div><div className="delta">5 active</div></div>
              <div className="kpi"><div className="label">Memory entries</div><div className="value">28</div><div className="delta">1 pending</div></div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head"><h3>Quick starts</h3></div>
            <div className="panel-body" style={{padding:0}}>
              {[
                { icon:"sparkles", name:"Draft a status snapshot", desc:"For Eun-ji, Q3 kickoff" },
                { icon:"mail",     name:"Recap email from Tomas's note", desc:"With action items" },
                { icon:"file",     name:"What changed since last week?", desc:"Diff over memory + sources" },
              ].map((q,i) => (
                <div key={i} className="quick-row" onClick={() => alert(q.name)}>
                  <div className="glyph"><Icon name={q.icon} size={14}/></div>
                  <div className="text">
                    <div className="name">{q.name}</div>
                    <div className="desc">{q.desc}</div>
                  </div>
                  <Icon name="arrow" size={14}/>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h3>Members</h3>
              <span className="meta">{SAMPLE.members.length}</span>
            </div>
            <div className="panel-body" style={{padding:"8px 20px 14px"}}>
              <div className="row" style={{gap:6, flexWrap:"wrap"}}>
                {SAMPLE.members.map(m => (
                  <div key={m.email} title={m.name + " · " + m.role}
                       className="mt-avatar" style={{
                         background:"var(--accent-soft)",
                         color:"var(--accent-ink)",
                         border:"1px solid var(--accent-line)"
                       }}>
                    {m.initials}
                  </div>
                ))}
                <button className="btn btn-ghost btn-sm" style={{marginLeft:6}}><Icon name="plus" size={12}/> Invite</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

window.SourcesScene = function SourcesScene() {
  const [active, setActive] = React.useState("s1");
  const src = SAMPLE.sources.find(s => s.id === active) || SAMPLE.sources[0];

  return (
    <div className="sources-wrap">
      <div className="sources-list scroll">
        <div className="head">
          <div className="row gap-2" style={{justifyContent:"space-between"}}>
            <h3>Sources</h3>
            <button className="btn btn-secondary btn-sm"><Icon name="upload" size={12}/> Add</button>
          </div>
          <input className="input" style={{height:30}} placeholder="Filter sources…"/>
        </div>
        {SAMPLE.sources.map(s => (
          <div key={s.id} className={"source-row" + (s.id === active ? " active" : "")} onClick={() => setActive(s.id)}>
            <div className="top">
              <div className="glyph">{s.glyph}</div>
              <div className="name">{s.name}</div>
              <span className="pill" style={{fontSize:10}}>{s.kind}</span>
            </div>
            <div className="summary">{s.summary}</div>
            <div className="foot">
              <span>{s.chunks} chunks</span>
              <span>·</span>
              <span>{s.when}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="source-detail scroll">
        <div className="sd-head">
          <div className="meta-row">
            <span className="pill pill-accent">{src.kind}</span>
            <span className="pill pill-success">Indexed · {src.chunks} chunks</span>
            <span className="pill"><span style={{width:6, height:6, borderRadius:"50%", background:"var(--ink-3)"}}></span>v3</span>
          </div>
          <h2>{src.name}</h2>
          <div className="sub">
            <span>Added {src.when}</span>
            <span>·</span>
            <span>by Taro</span>
            <span>·</span>
            <span>4.1kb</span>
          </div>
        </div>

        <div className="sd-body">
          <div className="sd-content">
            <section>
              <h4>AI summary</h4>
              <p>{src.summary}</p>
              <p>The advisor extracted <strong>4 candidate decisions</strong>, <strong>2 follow-up tasks</strong>, and <strong>1 proposed memory update</strong> from this source. Decisions are listed below; tasks have been added to the work tray pending your review.</p>
            </section>

            <section>
              <h4>Key facts</h4>
              <ul>
                <li>Hosting commitment: support EU-hosted infrastructure where possible (§13).</li>
                <li>MVP trust baseline includes DPA, audit logs, retention controls.</li>
                <li>Risk areas flagged: emails, project files, wellness-adjacent data.</li>
                <li>Anti-target for MVP: highly regulated enterprises requiring deep day-1 compliance.</li>
              </ul>
            </section>

            <section>
              <h4>Mentioned in conversations</h4>
              <ul>
                <li><span className="src-mention">EU hosting position for Samsung Legal</span> — referenced 4 times</li>
                <li><span className="src-mention">Capex narrative — first pass</span> — referenced 2 times</li>
              </ul>
            </section>
          </div>

          <aside className="sd-aside">
            <div className="aside-block">
              <h5>File details</h5>
              <div className="fact-row"><span className="k">Type</span><span className="v">Markdown · spec</span></div>
              <div className="fact-row"><span className="k">Path</span><span className="v mono" style={{fontSize:12}}>docs/PRD.md</span></div>
              <div className="fact-row"><span className="k">Tokens</span><span className="v">~5,720</span></div>
              <div className="fact-row"><span className="k">Owner</span><span className="v">Taro Mizuno</span></div>
              <div className="fact-row"><span className="k">Last edited</span><span className="v">Apr 7, 2026</span></div>
            </div>
            <div className="aside-block">
              <h5>Linked artifacts</h5>
              <div className="linked-row"><span className="num">→</span><span className="text">DECISIONS.md · Adopt Supabase pgvector</span></div>
              <div className="linked-row"><span className="num">→</span><span className="text">WORK.md · Q3 onboarding flow</span></div>
              <div className="linked-row"><span className="num">→</span><span className="text">Memory · Hosting region (draft)</span></div>
            </div>
            <div className="aside-block">
              <h5>Actions</h5>
              <div className="col gap-2">
                <button className="btn btn-secondary btn-sm" style={{justifyContent:"flex-start"}}><Icon name="chat" size={12}/> Ask about this source</button>
                <button className="btn btn-ghost btn-sm" style={{justifyContent:"flex-start"}}><Icon name="file" size={12}/> Open original</button>
                <button className="btn btn-ghost btn-sm" style={{justifyContent:"flex-start"}}><Icon name="link" size={12}/> Copy link</button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

window.SettingsScene = function SettingsScene() {
  const [toggles, setToggles] = React.useState({
    autoMemory: false, citationsAlways: true, weeklyDigest: true,
  });
  return (
    <div className="settings scroll">
      <h1>Members & access</h1>
      <p className="lede">Decide who can read project memory, ask the advisor, and approve durable updates.</p>

      <div className="set-section">
        <h3>Project members</h3>
        <p className="desc">{SAMPLE.members.length} people have access to <strong>{SAMPLE.project.name}</strong>.</p>
        <div className="member-table">
          <div className="mt-head">
            <div>Person</div><div>Role</div><div>Access</div><div></div>
          </div>
          {SAMPLE.members.map(m => (
            <div className="mt-row" key={m.email}>
              <div className="mt-person">
                <div className="mt-avatar" style={{
                  background: m.color === "ember" ? "oklch(0.93 0.04 40)" :
                              m.color === "moss"  ? "oklch(0.93 0.03 160)" :
                              "var(--accent-soft)",
                  color: m.color === "ember" ? "oklch(0.42 0.14 40)" :
                         m.color === "moss"  ? "oklch(0.36 0.09 160)" :
                         "var(--accent-ink)",
                }}>{m.initials}</div>
                <div>
                  <div className="mt-name">{m.name}</div>
                  <div className="mt-email">{m.email}</div>
                </div>
              </div>
              <div><span className={"role-pill" + (m.role === "Owner" ? " owner" : "")}>{m.role}</span></div>
              <div style={{color:"var(--ink-2)", fontSize:13}}>{m.access}</div>
              <button className="icon-btn"><Icon name="more" size={14}/></button>
            </div>
          ))}
        </div>

        <div className="invite-row">
          <input className="input" placeholder="email@company.com — invite by email"/>
          <select className="input" style={{maxWidth:140}}>
            <option>Editor</option><option>Viewer</option><option>Admin</option>
          </select>
          <button className="btn btn-primary"><Icon name="plus" size={13}/> Invite</button>
        </div>
      </div>

      <div className="set-section">
        <h3>Advisor preferences</h3>
        <p className="desc">How the advisor behaves inside this project.</p>
        <div className="toggle-list">
          <div className="toggle-row">
            <div>
              <div className="label">Auto-save memory updates</div>
              <div className="desc">Skip the review step for low-risk updates. Off by default — your principle is "memory needs consent".</div>
            </div>
            <div className={"switch" + (toggles.autoMemory ? " on" : "")} onClick={() => setToggles(t => ({...t, autoMemory: !t.autoMemory}))}></div>
          </div>
          <div className="toggle-row">
            <div>
              <div className="label">Always cite sources</div>
              <div className="desc">Every claim carries a numbered footnote. Recommended.</div>
            </div>
            <div className={"switch" + (toggles.citationsAlways ? " on" : "")} onClick={() => setToggles(t => ({...t, citationsAlways: !t.citationsAlways}))}></div>
          </div>
          <div className="toggle-row">
            <div>
              <div className="label">Weekly digest email</div>
              <div className="desc">Friday 5pm local — a recap of decisions, drafts, and open questions.</div>
            </div>
            <div className={"switch" + (toggles.weeklyDigest ? " on" : "")} onClick={() => setToggles(t => ({...t, weeklyDigest: !t.weeklyDigest}))}></div>
          </div>
        </div>
      </div>

      <div className="set-section">
        <h3>Danger zone</h3>
        <p className="desc">Irreversible. Make sure you've exported memory first.</p>
        <div className="row gap-2">
          <button className="btn btn-secondary"><Icon name="upload" size={13}/> Export project memory</button>
          <button className="btn btn-secondary" style={{color:"var(--danger)", borderColor:"var(--danger-line)"}}>Delete project</button>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, {
  HomeScene: window.HomeScene,
  SourcesScene: window.SourcesScene,
  SettingsScene: window.SettingsScene,
});
