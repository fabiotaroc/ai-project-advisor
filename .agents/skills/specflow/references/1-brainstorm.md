# 1 - Brainstorm

Turn an idea into a proposal and delta spec: WHY and HOW (proposal) + WHAT changes (delta spec).

## Steps

1. **Explore context** - read relevant files, existing specs in `flow/specs/`, recent commits. Understand the current state before proposing changes.
2. **Scope check** - identify which domain(s) the change touches. For ≥2 domains, use per-domain delta spec files at `flow/changes/<name>/specs/<domain>.md`. For single-domain, use `flow/changes/<name>/spec.md`.
3. **Clarify** - ask questions before writing anything. Aim for at least 3–5 questions covering: purpose/motivation, scope boundaries, constraints, success criteria, and open design decisions. Use numbered multiple-choice (2–3 options with trade-offs, lead with recommendation). Do not assume answers — if something is unclear, ask. Only proceed once you have explicit answers.
4. **Write proposal** - use `assets/proposal-template.md`. Concise summary (2–4 sentences) + out of scope. Design does NOT live here. Save to `flow/changes/<name>/proposal.md`.
5. **Write delta spec(s)** - use `assets/delta-spec-template.md`. Capture the `Design` (stack/architecture of the change, no code-level detail) and ADDED/MODIFIED/REMOVED requirements. Requirements MUST be code-agnostic — no file names, function names, or code snippets; describe observable behavior only.
   - Single domain → `flow/changes/<name>/spec.md`
   - ≥2 domains → `flow/changes/<name>/specs/<domain>.md` per domain
6. **Self-review** - any TBDs? contradictions? scope creep? ambiguous requirements? Fix inline.
7. **Check in** - briefly summarize the artifacts created to the user. Ask to review before moving on to **2-plan** to plan the tasks for this delta spec.

### Determining the Domain

- Check existing domains in `flow/specs/`. Reuse if the change fits.
- If no specs exist yet, create a domain that matches the logical area (e.g., `auth`, `api`, `data`, `ui`).
- One delta spec can touch multiple domains - use per-domain files when ≥2 domains are affected.

## Principles

- **Code-agnostic specs** - requirements and scenarios describe WHAT, not HOW. Keep file names, function names, and code snippets out of specs. Stack/architecture belongs in the `Design` section.
- **Explore before proposing** - understand the codebase and existing specs before suggesting anything.
- **Ask a lot of questions** - group by topic, always propose options. Never assume when you can ask. A skipped question is a hidden assumption.
- **YAGNI** - strip unrequested features from every proposal.
- **Scale to complexity** - a one-line bugfix needs a 3-line delta. A new subsystem needs full requirements. Don't force ceremony.

### Question Format

```markdown
1. ...
   - A) ...
   - B) ...
   - C) ...
2. ...
```
