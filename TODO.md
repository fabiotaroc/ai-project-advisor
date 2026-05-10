### Sources/wiki:
[x] Rename sources to "Artifacts" or something similar like "Files"
[x] Wiki division. Wiki is now canonical docs (project, decisions, people, work, glossary + pinned customs), reviewable via proposals instead of free-form librarian files.
[x] apply backend migration @inputs_backend_data_model.md to the database, then customise each of the three types of sources (files, meetings, emails) page UIs
[x] Rethink pending wiki edits: they should support true rich diffs against canonical docs (insertions, replacements, deletions) instead of append-only proposals, and the review UI should be a spacious side-panel/git-diff experience like Cursor/Codex/Mike rather than constrained cards in a small box (for source ingestion) or chat (for chat proposals)

### Files:
[ ] Files should be a new UI, it should be where user creates new docs/markdowns, slides, etc in collaboration with the agent (like mike has but for pptx) (maybe grid layout instead of boring scrollable listview on the left). Should be doable from chat as well. sidepanel on the right for preview and editing. Good content preview for pptx, docx, excel (slideshow for pptx, table for excel), then open in (choose application) and download file button

### Meetings:
[ ] editable sections (summary, decisions, action items, risks, open questions)
[x] Transcript ingestion pipeline api call:

### Agent memory:
[ ] Add tool for advisor to read activity log (table in supabase) as a proxy for the daily memory kind of thing that OpenClaw has. maybe push last few activity rows into the advisor context.
[ ] Add a new tool for the advisor to read chat history for that user only
[x] add date to the advisor prompt

### Chat:
[x] pending edits in the sidepanel instead of in chat.
[ ] add tag files to chat messages (like mike has)
[ ] citation pills for docs as well.
[ ] Incognito chat feature (memory not saved and other team members cannot see it)
[x] Scroll-to-bottom overlay (circular control) when the message list is scrolled away from the latest message; re-stick to bottom on send and while streaming unless the user scrolls up



### Agent architecture:
[x] rethink librarian vs advisor split. user does not want to see "librarian" term. his only talking parter is the main Agent. The librarian should be a background agent that is not visible to the user. Maybe use the librarian as a subagent of the main agent.
[x] search sources is only vector, should be sql filtering as well. eg i ask for sources on a day, it filters by date. dedicated tools.ts file advisor agent.
[x] add citations in chat message (perplexity-style)

### Activity page:
[x] Fix design, make it more readable and attractive. -> add backlink to the source or artifact page. ("Recent activity")
[x] Make librarian activity clearer in backend and frontend (activity page)
[x] Document the librarian system and the advisor agents in a markdown doc to make it clearer. Also use mermaid diagrams and stuff.
[x] Add token and context count to chat page like codex or claude code

