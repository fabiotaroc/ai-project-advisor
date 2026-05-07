# 2 - Plan

Turn the delta spec(s) into a concrete implementation plan. One plan per change, even when the change spans multiple domains.

## Steps

1. **Re-read all delta spec(s)** - don't plan from memory. For multi-domain changes, read every file under `flow/changes/<name>/specs/` so the plan covers all domains.
2. **Map files** - list every file to create or modify and its single responsibility.
3. **Write tasks** - use `assets/plan-template.md`. Reference every delta spec in the header. Group related tasks, use hierarchical numbering (1.1, 1.2); for multi-domain changes, consider grouping top-level sections by domain. Describe what each step does, no implementation code. Include TDD test steps where there's meaningful logic; skip for config/scripts.
4. **Self-review** - every requirement from every delta spec maps to a task? vague steps? type/name consistency across domains? Fix inline.
5. **Save** - write to `flow/changes/<name>/plan.md` (single plan even when multi-domain). Tell the user the path.
6. **Branch check** - run `git branch --show-current`; if on main/master, suggest the user create a feature branch.
7. **Check in** - briefly summarize the plan created to the user. Iterate if the user has feedback. Ask to review before moving on to **3-execute** to execute the tasks.

## Principles

- **YAGNI** - plan only what the delta spec asks; no speculative tasks.
- **DRY** - shared behavior belongs in one place.
- **One responsibility per file** - follow existing patterns.
- **TDD where it matters** - meaningful logic, regression risk, behavior changes. Skip for config, scaffolding, wiring.
