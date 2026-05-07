# 4 - Merge + Archive

Merge the delta into persistent specs, then archive the completed change.

## Steps

1. **Enumerate deltas** - collect every delta spec in the change: either `spec.md` (single-domain) or all files under `specs/<domain>.md` (multi-domain).
2. **Propose merge** - show the user the full list of delta → target domain spec mappings before writing anything.
3. **Merge each delta into its persistent domain spec:**
   - **ADDED** requirements → append to the `Requirements` list in `flow/specs/<domain>.md`
   - **MODIFIED** requirements → replace the corresponding bullet
   - **REMOVED** requirements → delete the corresponding bullet
   - **Design** → fold the delta's `Design` into the domain spec's `Design` section (append or refine; keep stack/architecture-level, no code). Update when the change alters architectural choices.
   - If a domain spec doesn't exist yet, create it using `assets/domain-spec-template.md`. Derive `Purpose` from the proposal's `Summary`; seed `Design` from the delta's `Design`. Confirm with the user before writing.
   - Repeat for every delta spec in the change — do not stop after the first domain.
4. **User confirms** every merged domain spec looks correct.
5. **Archive** the change folder by moving `flow/changes/<name>/` to `flow/archive/YYYY-MM-DD-<name>/`.
   - If the archive path already exists, append `-2`, `-3`, etc.
   - The merged domain specs remain the source of truth; the archive is historical context only.
6. **Check in** - announce the change is complete, archived, and persistent specs are up to date. Summarize what was merged into each domain.
