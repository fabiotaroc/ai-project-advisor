/* Spec narrative sections + the smaller in-line mockups (entry-point flow, state gallery,
   accept/reject choreography, conflict tree, MVP scope). The hero ReviewPanel lives in
   mockup.jsx and is referenced from here. */

const { Icons: I, SpecData: D, ReviewPanel } = window;

/* ---------- shared bits ---------- */

function Section({ id, num, eyebrow, title, lede, children }) {
  return (
    <section id={id} className="section">
      <div className="section-head">
        <span className="section-num">{num}</span>
        <div>
          <div className="eyebrow">{eyebrow}</div>
          <h2 className="h2">{title}</h2>
        </div>
      </div>
      {lede && <p className="lede">{lede}</p>}
      {children}
    </section>
  );
}

function MiniDoc({ children, label, sublabel }) {
  return (
    <div className="frame">
      <div className="frame-cap">
        <div className="frame-cap-l">
          <span className="dots"><i></i><i></i><i></i></span>
          <em>{label}</em>
        </div>
        <span className="mono">{sublabel}</span>
      </div>
      <div style={{ padding: 22, background: "var(--paper)" }}>
        {children}
      </div>
    </div>
  );
}

/* ---------- 1. Problem ---------- */

function Problem() {
  return (
    <Section id="problem" num="01" eyebrow="Problem" title="Pending edits feel like loose receipts, not a review surface."
      lede="Today, edits proposed by source ingestion are append-only and cramped into a side card on the source page. Edits proposed from chat live as cards inside the conversation. Both feel like notifications. Neither feels like the place where you decide what becomes canonical project memory.">
      <div className="gallery" style={{ marginTop: 8 }}>
        <div className="state">
          <div className="state-cap"><h4>Where they live today</h4><p>Two narrow rails, two very different tones</p></div>
          <div className="state-body col" style={{ gap: 12 }}>
            <div className="row small muted"><I.file /> Source detail · 320px right rail · "Proposed changes"</div>
            <div className="row small muted"><I.chat /> Chat thread · inline draft card mid-conversation</div>
            <div className="row small muted"><I.warn style={{ color: "var(--warning)" }} /> Append-only · no replacements, no deletions</div>
            <div className="row small muted"><I.warn style={{ color: "var(--warning)" }} /> Each is reviewed in isolation — no cross-source view</div>
          </div>
        </div>
        <div className="state">
          <div className="state-cap"><h4>What the team needs</h4><p>One trustworthy place</p></div>
          <div className="state-body col" style={{ gap: 12 }}>
            <div className="row small"><I.check style={{ color: "var(--success)" }} /> A single review surface that spans every source &amp; chat</div>
            <div className="row small"><I.check style={{ color: "var(--success)" }} /> Real diffs — including replacements and deletions, when evidence is strong</div>
            <div className="row small"><I.check style={{ color: "var(--success)" }} /> Source quote always one glance away</div>
            <div className="row small"><I.check style={{ color: "var(--success)" }} /> Calm enough that a non-technical PM trusts the Accept button</div>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ---------- 2. Recommendation TL;DR ---------- */

function Recommendation() {
  return (
    <Section id="recommendation" num="02" eyebrow="Recommendation" title="Promote review to a first-class workspace, not a side card."
      lede="A unified Review inbox at the project level, also slide-overable from sources and chat. Three panes when there's room — pending edits, the canonical doc with tracked-changes prose, and the source evidence. Append-only constraint relaxes to support replacements and deletions, but only when the proposal carries a verbatim quote.">
      <dl className="kvs">
        <dt>Surface</dt>
        <dd>Project-level <span className="mono">/review</span> route + 720–960px slide-over invocation. Same component, two presentations.</dd>
        <dt>Layout</dt>
        <dd>Three panes when ≥ 1100px: <strong>edits rail</strong> · <strong>doc with tracked changes</strong> · <strong>source evidence</strong>. Below that, evidence collapses into a tab.</dd>
        <dt>Diff vocabulary</dt>
        <dd>Tracked-changes prose — green underline for additions, red strikethrough for deletions — <em>in the doc's own typography</em>. No monospace +/− blocks.</dd>
        <dt>Provenance</dt>
        <dd>Every hunk carries a kind pill (Insert / Replace / Delete) and, when needed, a state pill (Repositioned / Doc changed). Verbatim quote sits in the right rail, never more than a glance away.</dd>
        <dt>Acceptance</dt>
        <dd>Per-hunk. Atomic. Keyboard-first (J/K, A, R). 6-second undo toast for every action. Bulk by source <em>or</em> by doc.</dd>
        <dt>Tone</dt>
        <dd>Reads like a tracked-changes Word doc, not a pull request. No line numbers, no patch hashes, no terminal-green walls.</dd>
      </dl>
    </Section>
  );
}

/* ---------- 3. Entry points & flow ---------- */

function Flow() {
  return (
    <Section id="flow" num="03" eyebrow="Flow" title="One review surface, three doors in."
      lede="Wherever the user notices a pending edit, the same surface opens. Deep-linkable, dismissable, never modal-blocking.">
      <div className="flow">
        <div className="flow-card">
          <span className="pill pill--soft"><I.inbox />Door A</span>
          <h5>Review badge in the top nav</h5>
          <p>Always-visible count of pending edits. Default door for the team's daily triage. Clicking opens <span className="mono">/project/_/review</span>.</p>
        </div>
        <div className="flow-card">
          <span className="pill pill--soft"><I.file />Door B</span>
          <h5>From a source</h5>
          <p>Source detail page shows a count chip ("3 proposed changes from this meeting"). Clicking slides over the same review panel, pre-filtered to that source.</p>
        </div>
        <div className="flow-card">
          <span className="pill pill--soft"><I.chat />Door C</span>
          <h5>From chat</h5>
          <p>Chat keeps a one-line "{D.SOURCES.chat_devon.title.toLowerCase()} proposed an edit" stub; the rich review opens to the side, never inside the message stream.</p>
        </div>
        <div className="arrow"><I.arrow /></div>
        <div className="flow-card terminal">
          <span className="pill pill--accent"><I.panel />Review</span>
          <h5>Unified review panel</h5>
          <p>Three panes. The doc with tracked changes is the centerpiece. Accept / Reject are atomic and keyboard-first.</p>
        </div>
      </div>

      <div className="callout" style={{ marginTop: 22 }}>
        <div className="callout-head"><I.zap />Why all three doors and not one</div>
        <p>The team triages in three contexts: a daily inbox sweep (Door A), inspecting a single artifact they just imported (Door B), and reacting to something the agent just said in chat (Door C). Forcing them into a single entry-point would make at least two of those flows feel wrong. The work is the same; the doors are different.</p>
      </div>
    </Section>
  );
}

/* ---------- 4. Layout (the hero) ---------- */

function Layout() {
  return (
    <Section id="layout" num="04" eyebrow="Layout" title="The review panel itself."
      lede="A live mockup. Click a hunk in the doc — or an item in the rail — to focus it. Accept / Reject any pending edit. The right rail always shows the source evidence for what's focused.">
      <ReviewPanel />

      <div className="gallery" style={{ marginTop: 28 }}>
        <div className="state">
          <div className="state-cap"><h4>Why three panes, not two</h4><p>Trust comes from evidence at a glance</p></div>
          <div className="state-body col" style={{ gap: 8 }}>
            <p className="small">In the current source-detail design, the source quote and the proposed change are visually disconnected — the user has to remember the meeting context to evaluate the proposal. By <strong>parking the verbatim quote next to the diff</strong>, we eliminate that memory tax. Accept / Reject becomes a single comparison, not a recall task.</p>
          </div>
        </div>
        <div className="state">
          <div className="state-cap"><h4>Why a doc-shaped center pane</h4><p>The proposal is judged in context</p></div>
          <div className="state-body col" style={{ gap: 8 }}>
            <p className="small">Showing the change as a card (today) hides the surrounding paragraphs. Reviewers can't tell whether a "decision" is already implied two bullets up. By rendering all pending hunks <em>inline in the canonical doc</em>, the user sees both <strong>what's proposed</strong> and <strong>what's already there</strong>, in one read.</p>
          </div>
        </div>
        <div className="state">
          <div className="state-cap"><h4>Density choices</h4><p>Spacious where it counts</p></div>
          <div className="state-body col" style={{ gap: 6 }}>
            <p className="small">Doc reading width is held to <strong>64ch</strong>; the line-height is loose (1.75). The rail is denser; the evidence rail is calm. Reading the diff should feel like reading a memo — which is exactly what's being created.</p>
          </div>
        </div>
        <div className="state">
          <div className="state-cap"><h4>Responsive collapse</h4><p>≤1100px loses the evidence rail</p></div>
          <div className="state-body col" style={{ gap: 6 }}>
            <p className="small">On narrower viewports the evidence rail tucks into a tab on the right edge of the focused hunk; tap to peek. The rail and the doc remain side-by-side until ≤780px, then the rail becomes a top sheet.</p>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ---------- 5. Diff anatomy / states ---------- */

function StateCard({ title, blurb, kindPill, children }) {
  return (
    <div className="state">
      <div className="state-cap">
        <div>
          <h4>{title}</h4>
          <p>{blurb}</p>
        </div>
        {kindPill}
      </div>
      <div className="state-body">{children}</div>
    </div>
  );
}

function States() {
  return (
    <Section id="states" num="05" eyebrow="Diff vocabulary" title="Five states the user has to be able to read at a glance."
      lede="Each state is the same shape — left-margin marker, kind pill, prose mark, optional location pill. The vocabulary is small on purpose. A non-technical reader should be able to learn it in one sitting.">
      <div className="gallery">

        <StateCard title="Insertion" blurb="New paragraph or bullet, no prior text"
          kindPill={<span className="pill pill--success"><I.plus />Insert</span>}>
          <div className="hunk hunk--add">
            <div className="hunk-tag"><span className="pill pill--success"><I.plus />Insert</span></div>
            <p style={{ margin: 0 }}><ins className="add">Launch is contingent on the partner keynote slot — if it slips, the August window slips with it.</ins></p>
          </div>
          <p className="small muted" style={{ marginTop: 14 }}>Green underline highlight, prose color shifts to a deep desaturated green. The left bar is the only chrome that survives at rest.</p>
        </StateCard>

        <StateCard title="Replacement" blurb="Existing text changed in place"
          kindPill={<span className="pill pill--warn"><I.swap />Replace</span>}>
          <div className="hunk hunk--rep">
            <div className="hunk-tag"><span className="pill pill--warn"><I.swap />Replace</span></div>
            <p style={{ margin: 0 }}>The annual-prepay discount drops from 20% to <del className="del"><strong>15%</strong></del> <ins className="add"><strong>18%</strong></ins> to protect margin during the launch quarter.</p>
          </div>
          <p className="small muted" style={{ marginTop: 14 }}>Old text struck inline, new text appears immediately after. Reads as one sentence — the tracked-changes Word convention people already understand.</p>
        </StateCard>

        <StateCard title="Deletion" blurb="A bullet or paragraph being struck out"
          kindPill={<span className="pill pill--danger"><I.minus />Delete</span>}>
          <div className="hunk hunk--del">
            <div className="hunk-tag"><span className="pill pill--danger"><I.minus />Delete</span></div>
            <p style={{ margin: 0 }}><del className="del">Continue with <strong>Field &amp; Form</strong> for motion design through Q3. Decision to revisit at the post-launch retro.</del></p>
          </div>
          <p className="small muted" style={{ marginTop: 14 }}>Reserved for high-confidence, source-quoted reversals. The librarian must cite the moment the prior decision was overturned. No silent deletes.</p>
        </StateCard>

        <StateCard title="Anchor drift" blurb="Section was renamed since the proposal was extracted"
          kindPill={<span className="pill pill--warn"><I.mapPin />Repositioned</span>}>
          <div className="hunk hunk--add">
            <div className="hunk-tag">
              <span className="pill pill--success"><I.plus />Insert</span>
              <span className="pill pill--warn"><I.mapPin />Repositioned</span>
            </div>
            <p style={{ margin: 0 }}><ins className="add">Stop targeting agency operators in the next research wave; the brand-director cohort tested 2.4× higher on intent.</ins></p>
          </div>
          <p className="small muted" style={{ marginTop: 14 }}>An amber pill spells out where the librarian moved the hunk to. The user can drag the hunk to a different anchor, or accept where it is.</p>
        </StateCard>

        <StateCard title="Conflict (doc edited mid-review)" blurb="Target text moved or changed under the proposal"
          kindPill={<span className="pill pill--warn"><I.warn />Doc changed</span>}>
          <div className="hunk hunk--rep hunk--conflict">
            <div className="hunk-tag">
              <span className="pill pill--warn"><I.swap />Replace</span>
              <span className="pill pill--warn"><I.warn />Doc changed</span>
            </div>
            <p style={{ margin: 0 }}><del className="del">Mobile app refresh is tracked separately under <code>mobile.md</code>.</del> <ins className="add">Mobile app refresh <strong>moves into scope</strong> for a phase 2 starting October.</ins></p>
            <div className="row" style={{ marginTop: 10 }}>
              <button className="btn btn--xs"><I.rotate />Re-anchor against current</button>
              <button className="btn btn--xs btn--ghost">Reject &amp; reauthor in chat</button>
            </div>
          </div>
          <p className="small muted" style={{ marginTop: 14 }}>The doc changed since the proposal was drafted. The user is shown both, plus actions to re-anchor or send the proposal back to the advisor for a redraft against the current text.</p>
        </StateCard>

        <StateCard title="Resolved" blurb="Auditable, collapsed, never deleted"
          kindPill={<span className="pill pill--soft"><I.history />Resolved</span>}>
          <div className="hunk hunk--resolved-accept" style={{ marginTop: 0 }}>
            <div className="row small muted" style={{ marginBottom: 4 }}><I.check /> Saved to decisions.md · from Q2 leadership sync</div>
            <p style={{ margin: 0 }}>Launch is contingent on the partner keynote slot — if it slips, the August window slips with it.</p>
          </div>
          <div className="hunk hunk--resolved-reject" style={{ marginTop: 8 }}>
            <div className="row small muted"><I.x /> Rejected · replacement from email · pricing review</div>
          </div>
          <p className="small muted" style={{ marginTop: 14 }}>Accepted edits dissolve into the doc but keep a small provenance line; rejected edits collapse to a faded one-liner. Both stay in scrollback under "Resolved" so the team can audit.</p>
        </StateCard>
      </div>
    </Section>
  );
}

/* ---------- 6. Source evidence ---------- */

function Evidence() {
  return (
    <Section id="evidence" num="06" eyebrow="Source evidence" title="The right rail is the trust layer."
      lede="The single biggest reason a non-technical reviewer hesitates on Accept is not knowing where the proposed text came from. The evidence rail is calibrated to answer that in three glances.">

      <MiniDoc label="Source evidence rail · focused hunk" sublabel="evidence-rail.tsx">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, alignItems: "start" }}>
          <div className="col" style={{ gap: 12 }}>
            <div className="evidence-card">
              <h5><I.meeting />Meeting</h5>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Q2 leadership sync</div>
              <div className="evidence-meta" style={{ marginTop: 4 }}>
                <span className="who">Marta Reyes, Devon Cho, Sam Patel</span>
                <span>·</span>
                <span>Tue · May 6 · 47 min</span>
              </div>
              <div className="row" style={{ marginTop: 10 }}>
                <button className="btn btn--xs"><I.link />Open source</button>
                <button className="btn btn--xs btn--ghost"><I.history />See thread</button>
              </div>
            </div>

            <div className="evidence-card">
              <h5><I.sparkles />Verbatim quote</h5>
              <div className="evidence-quote">
                "If we don't get the keynote slot, there's no point shipping that week. Aurora ships when the keynote does. Mark it down."
                <div><span className="ts">— Marta Reyes · 12:08</span></div>
              </div>
            </div>

            <div className="evidence-card">
              <h5><I.shield />Why this proposal</h5>
              <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6 }}>The decision wasn't yet recorded under <strong>Q2 strategy</strong>. The phrasing matches Marta's wording closely.</p>
              <div className="evidence-meta" style={{ marginTop: 10 }}>
                <span className="confidence high"><i></i><i></i><i></i><span style={{ marginLeft: 4 }}>Confidence: high</span></span>
              </div>
            </div>
          </div>

          <div className="col" style={{ gap: 16 }}>
            <h3 className="h3">Three glances, in order</h3>
            <div className="row" style={{ gap: 12, alignItems: "flex-start" }}>
              <span className="pill pill--accent" style={{ minWidth: 24, justifyContent: "center" }}>1</span>
              <div className="small"><strong>Where</strong> the proposal came from. Source kind, title, time, who was in the room. One line of attribution; no rummaging.</div>
            </div>
            <div className="row" style={{ gap: 12, alignItems: "flex-start" }}>
              <span className="pill pill--accent" style={{ minWidth: 24, justifyContent: "center" }}>2</span>
              <div className="small"><strong>What</strong> was actually said. A verbatim quote with timestamp or page number. Never paraphrased, never inferred. This is the litmus test for trust.</div>
            </div>
            <div className="row" style={{ gap: 12, alignItems: "flex-start" }}>
              <span className="pill pill--accent" style={{ minWidth: 24, justifyContent: "center" }}>3</span>
              <div className="small"><strong>Why</strong> the librarian thinks this is new and worth recording. Plain English. Plus a confidence dot — calm three-segment, not a percent score.</div>
            </div>

            <div className="callout callout--neutral">
              <div className="callout-head"><I.shield />A non-negotiable</div>
              <p>If the librarian can't produce a verbatim quote, the extraction is dropped before it ever reaches the user. The evidence rail must always have a quote — never an "AI summary" of one.</p>
            </div>
          </div>
        </div>
      </MiniDoc>
    </Section>
  );
}

/* ---------- 7. Accept / Reject interactions ---------- */

function AcceptReject() {
  return (
    <Section id="actions" num="07" eyebrow="Interactions" title="Accept and reject should feel like reading email, not approving code."
      lede="Tight loops, keyboard-first, always reversible for a few seconds. Bulk operations are available but never the default.">

      <div className="gallery">
        <div className="state">
          <div className="state-cap"><h4>Per-hunk choreography</h4><p>The atomic unit of review</p></div>
          <div className="state-body">
            <ol style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
              <li><strong>Focus</strong> a hunk by clicking it, by selecting the rail row, or with <span className="kbd">J</span>/<span className="kbd">K</span>.</li>
              <li><strong>Read</strong> the doc in context plus the source quote — both are already on screen.</li>
              <li><strong>Resolve</strong> with <span className="kbd">A</span> (accept) or <span className="kbd">R</span> (reject), or click the inline buttons.</li>
              <li><strong>Auto-advance</strong> to the next pending hunk. The just-resolved hunk fades into the doc (accept) or collapses (reject).</li>
              <li><strong>Undo</strong> is available for 6 seconds via the toast at the bottom of the panel.</li>
            </ol>
          </div>
        </div>

        <div className="state">
          <div className="state-cap"><h4>Bulk operations</h4><p>Available, but never primary</p></div>
          <div className="state-body col" style={{ gap: 12 }}>
            <p className="small" style={{ margin: 0 }}>Two bulk axes match how teams actually work:</p>
            <div className="row"><span className="pill pill--soft">By source</span><span className="small">"Accept all from this meeting" — for trusted, well-attended sessions.</span></div>
            <div className="row"><span className="pill pill--soft">By doc</span><span className="small">"Reject all in glossary.md" — when a low-signal source spammed glossary terms.</span></div>
            <div className="callout callout--warn" style={{ maxWidth: "none" }}>
              <div className="callout-head"><I.shield />Friction by design</div>
              <p>Bulk Accept across all sources is intentionally <em>not</em> offered. The team should never accept everything in one click — that's exactly the opacity the new flow is built to fix.</p>
            </div>
          </div>
        </div>

        <div className="state">
          <div className="state-cap"><h4>Keyboard map</h4><p>Mouse-optional</p></div>
          <div className="state-body">
            <table className="matrix">
              <tbody>
                <tr><td><span className="kbd">J</span> / <span className="kbd">K</span></td><td>Next / previous hunk</td></tr>
                <tr><td><span className="kbd">A</span></td><td>Accept focused hunk</td></tr>
                <tr><td><span className="kbd">R</span></td><td>Reject focused hunk</td></tr>
                <tr><td><span className="kbd">E</span></td><td>Open source in side drawer</td></tr>
                <tr><td><span className="kbd">⌘</span><span className="kbd">Z</span></td><td>Undo the last resolution</td></tr>
                <tr><td><span className="kbd">G</span> <span className="kbd">D</span></td><td>Jump to next pending in <em>doc</em> view</td></tr>
                <tr><td><span className="kbd">Esc</span></td><td>Close the panel (state survives — re-open and you're where you left off)</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="state">
          <div className="state-cap"><h4>What &quot;accepting&quot; actually does</h4><p>Spec contract, plain English</p></div>
          <div className="state-body col" style={{ gap: 8 }}>
            <p className="small"><strong>1.</strong> The hunk is applied atomically to the canonical doc at the resolved anchor.</p>
            <p className="small"><strong>2.</strong> The inserted text is appended with a tiny provenance footnote — slug + source link — so canonical content stays traceable.</p>
            <p className="small"><strong>3.</strong> The pending edit transitions to <span className="mono">accepted</span>; the activity feed gets a row.</p>
            <p className="small"><strong>4.</strong> The doc updates everywhere — the wiki page, the advisor's run context, search.</p>
            <p className="small"><strong>5.</strong> If a sibling pending edit anchored to the same paragraph just moved, it is <strong>re-anchored</strong> immediately and the user is told.</p>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ---------- 8. Conflict handling ---------- */

function Conflict() {
  return (
    <Section id="conflict" num="08" eyebrow="Conflict handling" title="Three failure modes, three calm answers."
      lede="The system never silently re-targets, force-applies, or drops a proposal. Every conflict surfaces in the panel with a labeled state and an obvious next step.">

      <div className="gallery">
        <div className="state">
          <div className="state-cap"><h4>1 · Anchor drift</h4><p>Heading was renamed</p></div>
          <div className="state-body col" style={{ gap: 8 }}>
            <p className="small"><strong>What happens.</strong> The librarian's heading anchor doesn't match. Best-effort fuzzy match locates the closest current heading and the hunk renders there with an amber <em>Repositioned</em> pill.</p>
            <p className="small"><strong>What the user sees.</strong> The amber pill spells out the move: <span className="mono">"Q2 actions" → "Q2 strategy"</span>. The Accept button stays enabled.</p>
            <p className="small"><strong>What the user can do.</strong> Drag the hunk to another section, accept where it is, or reject.</p>
          </div>
        </div>

        <div className="state">
          <div className="state-cap"><h4>2 · Anchor lost</h4><p>Heading no longer exists</p></div>
          <div className="state-body col" style={{ gap: 8 }}>
            <p className="small"><strong>What happens.</strong> No usable match. The hunk renders at the end of the doc with a stronger <em>Appended at end</em> pill.</p>
            <p className="small"><strong>What the user sees.</strong> The pill warns "section deleted; placed at end". The doc itself shows the hunk in its fallback location.</p>
            <p className="small"><strong>What the user can do.</strong> Drag the hunk to a real section, send it back to the advisor for a redraft, or reject.</p>
          </div>
        </div>

        <div className="state">
          <div className="state-cap"><h4>3 · Doc edited mid-review</h4><p>Surrounding paragraph changed</p></div>
          <div className="state-body col" style={{ gap: 8 }}>
            <p className="small"><strong>What happens.</strong> Server returns a 409 on Accept because <span className="mono">updated_at</span> doesn't match. The hunk flips to <em>Doc changed</em> state.</p>
            <p className="small"><strong>What the user sees.</strong> A warm callout above the hunk: "this section was edited 4 minutes ago by Devon. Review before accepting." Plus two actions: <em>Re-anchor against current</em> and <em>Reject &amp; reauthor in chat</em>.</p>
            <p className="small"><strong>What the user can do.</strong> Re-anchor reruns the librarian's anchor logic against the new doc; reauthor sends a chat turn that asks the advisor to redraft.</p>
          </div>
        </div>

        <div className="state">
          <div className="state-cap"><h4>4 · Two proposals, one paragraph</h4><p>Sibling collisions</p></div>
          <div className="state-body col" style={{ gap: 8 }}>
            <p className="small"><strong>What happens.</strong> Two pending edits target the same line. Both render in the doc, stacked, in the order their sources arrived.</p>
            <p className="small"><strong>What the user sees.</strong> A subtle stack indicator on the left bar, with both kind pills visible. Reading order matches resolution order.</p>
            <p className="small"><strong>What the user can do.</strong> Accept one and the other auto-rebases against the new text (with an amber <em>Re-anchored</em> pill). Reject one and the other stays as-is.</p>
          </div>
        </div>
      </div>

      <div className="callout callout--warn" style={{ marginTop: 22 }}>
        <div className="callout-head"><I.warn />Hard rule — no auto-apply</div>
        <p>The system never silently applies an edit, even on a clean accept of the only pending hunk. Every state in the matrix above either succeeds atomically with explicit user action, or surfaces visibly as a labeled conflict. The wiki spec requires this; the UX makes it real.</p>
      </div>
    </Section>
  );
}

/* ---------- 9. MVP scope ---------- */

function Scope() {
  const rows = [
    ["IN", "Project-level /review route + slide-over invocation from sources, chat, top nav"],
    ["IN", "Three-pane layout (rail · doc with tracked changes · evidence) responsive to two-pane below 1100px"],
    ["IN", "Tracked-changes prose for insertions, replacements, deletions"],
    ["IN", "Per-hunk Accept / Reject (atomic) plus 6s undo toast"],
    ["IN", "Bulk Accept / Reject scoped to a single source or a single doc"],
    ["IN", "Source evidence rail: source attribution · verbatim quote · plain-English reason · confidence dot"],
    ["IN", "Anchor drift indicator + best-effort relocation; lost-anchor fallback to end-of-doc with pill"],
    ["IN", "Optimistic concurrency on Accept (409 → Doc changed state)"],
    ["IN", "Keyboard map (J/K, A, R, E, ⌘Z, Esc) + persistent panel state across re-opens"],
    ["IN", "Activity feed rows for accept / reject events with target doc + source link"],
    ["IN", "Backend: librarian relaxed to emit replace + delete proposals when accompanied by a verbatim quote"],
    ["LATER", "Drag-to-reanchor a drifted hunk to a different heading"],
    ["LATER", "Multi-doc atomic accept (\"accept this whole meeting in one transaction\")"],
    ["LATER", "Inline editing of proposed text from the review panel (today: edit-from-chat-card only)"],
    ["LATER", "Per-hunk comments / @mentions for team review"],
    ["LATER", "Mobile-first compact mode (top sheet for the rail)"],
    ["OUT", "Word-level character diffs inside replacements (sentence-level is enough)"],
    ["OUT", "Branching / forked review states — every project has one canonical doc set"],
    ["OUT", "Approver roles or sign-off workflows — out of band for the MVP audience"],
    ["OUT", "Suggested auto-merge for hard conflicts — manual reject + reauthor instead"],
  ];
  return (
    <Section id="scope" num="09" eyebrow="MVP scope" title="What ships, what waits, what we are choosing not to do."
      lede="The line is drawn so the v1 is delightful for one user reviewing one project's daily inbox, and good enough for two-person team triage. Fan-out to many-doc, many-reviewer flows is deliberately deferred.">
      <table className="matrix">
        <thead><tr><th style={{ width: 120 }}>Scope</th><th>Item</th></tr></thead>
        <tbody>
          {rows.map(([scope, item], i) => (
            <tr key={i}>
              <td>
                {scope === "IN" && <span className="pill pill--success scope-in">In MVP</span>}
                {scope === "LATER" && <span className="pill pill--warn scope-later">Phase 2</span>}
                {scope === "OUT" && <span className="pill pill--soft scope-out">Out of scope</span>}
              </td>
              <td>{item}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="callout" style={{ marginTop: 22 }}>
        <div className="callout-head"><I.zap />The one schema change required</div>
        <p>The current pending-edit schema already captures inserted text, deleted text, and an anchor — so replacements and deletions are backwards-compatible. The only librarian-side change is permission: extraction may now propose <span className="mono">deleted_text</span> when (and only when) accompanied by an explicit verbatim quote that signals reversal or correction. Append-only emission stays the default.</p>
      </div>
    </Section>
  );
}

/* ---------- 10. Risks & open questions ---------- */

function Risks() {
  return (
    <Section id="risks" num="10" eyebrow="Risks &amp; open questions" title="Where this design might bite us."
      lede="Worth raising before we cut tickets.">
      <div className="col" style={{ gap: 14 }}>
        <div className="callout callout--warn">
          <div className="callout-head"><I.triangle />Replacements increase the trust burden</div>
          <p>Allowing librarian-proposed replacements is the single biggest behavior change. Mitigation: gate replacements behind a verbatim quote that explicitly signals reversal ("strike", "we're not", "instead"). No quote, no replace.</p>
        </div>
        <div className="callout callout--neutral">
          <div className="callout-head"><I.triangle />Sibling collisions are rare but messy</div>
          <p>Open question: should we de-duplicate at extraction time when two sources propose near-identical text within an hour? Cheap to implement (cosine similarity threshold) but risks dropping a valid second corroboration.</p>
        </div>
        <div className="callout callout--neutral">
          <div className="callout-head"><I.triangle />The chat card stays — for now</div>
          <p>The chat <em>proposal card</em> for user-requested updates remains; we don't remove it in MVP. Door C above just opens the same review surface for a deeper read. We can collapse the chat card to a one-line stub later, once the team is comfortable with the inbox.</p>
        </div>
        <div className="callout callout--neutral">
          <div className="callout-head"><I.triangle />Activity-feed noise</div>
          <p>If a meeting drops 14 pending edits and the user accepts all 14, the activity feed gets 14 rows. Open question: roll up bulk accepts to a single feed entry with an expandable list, or keep them atomic for auditability.</p>
        </div>
      </div>
    </Section>
  );
}

window.SpecSections = { Problem, Recommendation, Flow, Layout, States, Evidence, AcceptReject, Conflict, Scope, Risks };
