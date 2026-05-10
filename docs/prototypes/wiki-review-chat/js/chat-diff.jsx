/* Word-level inline diff.

   Given a `before` and `after` string, returns runs of {t: 'eq'|'add'|'del', s}
   computed via LCS over word tokens. The run granularity is the WORD: a single-
   word change between otherwise-equal sentences highlights only that word.

   Markdown bold (**text**) is stripped before diffing — surrounding doc prose
   keeps its bold via the doc renderer; the diff itself is plain so the eye reads
   color (red/green) without competing weight changes. */

(function () {
  // Tokens: words (incl. hyphens / apostrophes), punctuation, whitespace runs.
  function tokenize(text) {
    const re = /[A-Za-z0-9][A-Za-z0-9'_\u2019-]*|[^\sA-Za-z0-9]|\s+/g;
    return text.match(re) || [];
  }

  function stripBold(text) {
    return text.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/`([^`]+)`/g, "$1");
  }

  function wordDiff(beforeRaw, afterRaw) {
    const before = stripBold(beforeRaw || "");
    const after  = stripBold(afterRaw  || "");
    const A = tokenize(before);
    const B = tokenize(after);
    const m = A.length, n = B.length;

    // LCS length table
    const dp = Array.from({ length: m + 1 }, () => new Uint16Array(n + 1));
    for (let i = m - 1; i >= 0; i--) {
      for (let j = n - 1; j >= 0; j--) {
        if (A[i] === B[j]) dp[i][j] = dp[i + 1][j + 1] + 1;
        else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }

    const out = [];
    let i = 0, j = 0;
    while (i < m && j < n) {
      if (A[i] === B[j]) { out.push({ t: "eq", s: A[i] }); i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push({ t: "del", s: A[i] }); i++; }
      else { out.push({ t: "add", s: B[j] }); j++; }
    }
    while (i < m) out.push({ t: "del", s: A[i++] });
    while (j < n) out.push({ t: "add", s: B[j++] });

    // Merge adjacent same-type runs so we get nice contiguous spans
    const merged = [];
    for (const tok of out) {
      const last = merged[merged.length - 1];
      if (last && last.t === tok.t) last.s += tok.s;
      else merged.push({ ...tok });
    }

    // Trim leading / trailing whitespace inside add/del runs out into eq runs
    // so highlight bands don't extend past the actual changed words.
    return shrinkEdges(merged);
  }

  // Pull leading/trailing whitespace out of add/del runs and into eq runs;
  // produces tighter highlight bands.
  function shrinkEdges(runs) {
    const out = [];
    for (const r of runs) {
      if (r.t === "eq") { out.push(r); continue; }
      let s = r.s;
      const m1 = s.match(/^\s+/);
      const m2 = s.match(/\s+$/);
      if (m1) {
        const last = out[out.length - 1];
        if (last && last.t === "eq") last.s += m1[0];
        else out.push({ t: "eq", s: m1[0] });
        s = s.slice(m1[0].length);
      }
      let trail = "";
      if (m2 && s.endsWith(m2[0])) {
        trail = m2[0];
        s = s.slice(0, s.length - trail.length);
      }
      if (s) out.push({ t: r.t, s });
      if (trail) {
        const last = out[out.length - 1];
        if (last && last.t === "eq") last.s += trail;
        else out.push({ t: "eq", s: trail });
      }
    }
    // Re-merge eqs we may have created
    const merged = [];
    for (const tok of out) {
      const last = merged[merged.length - 1];
      if (last && last.t === tok.t) last.s += tok.s;
      else merged.push({ ...tok });
    }
    return merged;
  }

  // Render a diff as inline JSX. Pure inserts (before is empty/null) render
  // the whole string in a single <ins>; pure deletes do the same with <del>.
  function WordDiff({ before, after, kind }) {
    if (kind === "insert" || !before) {
      return <ins className="d-add">{stripBold(after || "")}</ins>;
    }
    if (kind === "delete" || !after) {
      return <del className="d-del">{stripBold(before || "")}</del>;
    }
    const runs = React.useMemo(() => wordDiff(before, after), [before, after]);
    return (
      <>
        {runs.map((r, i) => {
          if (r.t === "eq") return <React.Fragment key={i}>{r.s}</React.Fragment>;
          if (r.t === "add") return <ins key={i} className="d-add">{r.s}</ins>;
          return <del key={i} className="d-del">{r.s}</del>;
        })}
      </>
    );
  }

  window.ChatDiff = { wordDiff, stripBold, WordDiff };
})();
