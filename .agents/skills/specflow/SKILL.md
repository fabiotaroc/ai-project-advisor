---
name: specflow
description: Spec-driven development workflow that produces living documentation. Every feature creates delta specs that merge into a persistent source of truth and archive as history. Covers bootstrap, brainstorm, plan, execute, and merge/archive.
allowed-tools: Read Write Edit Bash Glob Grep
---

A fluid development workflow where every change produces a **delta spec** (ADDED/MODIFIED/REMOVED) that merges into persistent project specs after implementation. The result: your specs are always up-to-date documentation.

**Always announce which phase you're in** (e.g., "We're in Brainstorm") so the user knows where we are.

## Workflow

```
[bootstrap] -> brainstorm <-> plan <-> execute -> merge/archive
```

- **0 - Bootstrap**: `references/0-bootstrap.md` - one-time: set up `flow/` and capture existing codebase into domain specs (skip if `flow/specs/` already exists)
- **1 - Brainstorm**: `references/1-brainstorm.md` - explore, clarify, write proposal + delta spec
- **2 - Plan**: `references/2-plan.md` - turn delta spec into implementation tasks
- **3 - Execute**: `references/3-execute.md` - implement and verify against the spec
- **4 - Merge + Archive**: `references/4-merge.md` - merge delta into persistent specs, then archive the completed change folder

**Read the reference file before starting each phase.**

## Principles

- **Fluid, not rigid** - work on what makes sense. There are no hard phase gates - move between brainstorm, plan, and execute as the work demands. Always announce which phase you're entering and check in with the user before major transitions (e.g., starting implementation).
- **Progressive rigor is natural** - small fix = short delta + flat checklist. Big feature = full spec + detailed plan. Scale to the task, don't force ceremony.
- **Delta specs are the core** - every change describes what's ADDED, MODIFIED, or REMOVED relative to persistent specs. This is how documentation stays alive.
- **Update as you learn** - if execution reveals the spec or plan was wrong, pause, discuss with the user, update the artifacts, get approval, then resume.
- **Merge after approval** - propose merging the delta into main specs only after the user approves the implementation.
- **Verify before merge** - cross-check implementation against the delta spec before merging. Tests verify code works; verification checks that what was built matches what was spec'd.
- **RFC 2119 keywords** - use MUST/SHALL for hard requirements, SHOULD for recommended, MAY for optional in all specs.
- **Best practices always apply** - YAGNI, DRY, TDD when there's meaningful logic, root-cause debugging, one responsibility per file, explore before proposing.
- **No completion claims without verification** - run tests, show output, evidence before claims.
- **Git boundary** - git is the user's responsibility.

### Resulting folder structure

```
flow/
├── specs/<domain>.md         # Persistent source of truth (one file per domain)
├── changes/<name>/           # Active work
│   ├── proposal.md           # Concise change summary + out of scope (always created)
│   ├── spec.md               # Delta spec (single domain)
│   ├── specs/<domain>.md     # Delta specs (multi-domain, ≥2 domains)
│   └── plan.md               # Implementation plan
├── archive/YYYY-MM-DD-<name>/ # Completed changes retained as historical context
```

Organize specs by domain - one spec file per domain. If a domain grows too large, split it: create new domain files and update any active delta specs in `flow/changes/` to reference the new domains.
