# 3 - Execute

Implement the plan, then verify against the spec.

## Steps

1. **Load plan and spec(s)** - re-read `plan.md` and every referenced delta spec (single `spec.md` or all files under `specs/<domain>.md`); flag gaps or contradictions before starting.
2. **For each task:**
   - Apply TDD cycle (red → green → refactor) if the task has meaningful logic. Skip for config/wiring.
   - Run verification; do not mark done without it.
3. **If reality diverges from the plan** - stop, describe what you found, discuss with the user, update the relevant delta spec(s) and/or plan as agreed, then resume.
4. **Final verification** - run the full test suite; show raw output.
5. **Cross-check** - re-read every delta spec for the change (single `spec.md` or all files under `specs/<domain>.md`). Does every ADDED/MODIFIED requirement across all domains have corresponding working code? Flag any drift to the user.
6. **Check in** - briefly summarize what was implemented and verified. Ask the user if they're ready to move to **4-merge** to close up the task.

## Principles

- **No git operations** - never `git commit`, `git push`, or open PRs.
- **Verification** - evidence before claims. Never say "should pass" without running it.
- **Blockers** - stop immediately when stuck; describe precisely and ask the user.

### Debugging

- **Root cause first** - read the full error, reproduce, trace back before touching code.
- **One change at a time** - apply one fix, run verification, read output.
- **After 3 failed fixes** - stop, the design is probably wrong. Discuss with the user.
