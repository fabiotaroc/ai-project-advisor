# 0 - Bootstrap

Capture the current state of an existing codebase as persistent domain specs. This is a one-time step for brownfield projects - run it before your first change.

**Greenfield projects:** skip steps 2–8. Just create the `flow/` folder structure (step 1) with empty `specs/` and `changes/`, then jump to **1-brainstorm**. Domain specs will accumulate as changes are merged.

## Steps

0. **Check existing** - if `flow/specs/` exists and has files, STOP. Bootstrap is already done.
1. **Set up `flow/`** - create the folder structure at the project root:
   ```
   flow/
   ├── specs/       # Persistent domain specs (e.g. auth.md, api.md)
   └── changes/     # Active work (one folder per change)
   ```
2. **Explore the codebase** - read project structure, entry points, config files, READMEs, key modules. Build a mental map of what exists.
3. **Identify domains** - propose a list of logical domains to the user (e.g., `auth`, `api`, `data`, `ui`, `infra`). Each domain should map to a cohesive area of behavior. Discuss and agree.
4. **For each domain, interview the user:**
   - What does this area do today?
   - What are the key behaviors / contracts / invariants?
   - What are the boundaries - what does it depend on, what depends on it?
   - Any known constraints, limitations, or tech debt?
5. **Cross-reference with code** - verify the user's answers against the actual codebase. Flag discrepancies.
6. **Write domain specs** - use `assets/domain-spec-template.md`. One spec per domain at `flow/specs/<domain>.md`. Include only observable behavior and contracts - no implementation details.
7. **Self-review** - are domains overlapping? any behavior falling between cracks? requirements ambiguous or untestable? Fix inline.
8. **Present to user** - walk through each domain spec. Adjust based on feedback.
9. **Check in** - briefly summarize the artifacts created to the user. Ask to review before moving on to **1-brainstorm** for a new delta spec.

## Principles

- **Behavior, not implementation** - specs describe what the system does, not how. Class names, frameworks, and internal structure don't belong here.
- **One domain = one cohesive area** - if a domain spec is getting long and covers unrelated things, split it.
- **Interview thoroughly** - the user knows things the code doesn't show (intent, constraints, history). Ask all clarifications needed.

### Question Format

```markdown
1. ...
   - A) ...
   - B) ...
   - C) ...
2. ...
```
