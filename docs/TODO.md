### Sources/wiki:
[ ] Rename sources to "Artifacts" or something similar like "Files"
[ ] Content preview for pptx, docx, excel (slideshow for pptx, table for excel), then open in (choose application) and download file button
[ ] sources/artifacts should also be where user creates new docs/markdowns, slides, etc in collaboration with the agent (like mike has but for pptx).
[ ] Wiki division. Wiki should be basically 100% hidden unless user really wants to go and see it by clicking around. Librarian should put the files inside the wiki unless specifically requested to surface them by the user. Choose stable, immutable project files, such as project.md, product.md, decisions.md, etc. These should be surfaced in the wiki view (name of the tab TBD).
[ ] Add assistant sidebar to (files, meetings, emails, etc) like mike has.

### Meetings:
[ ] Transcript ingestion pipeline api call:
    - 2 sentence summary
    - decisions
    - action items
    - risks
    - open questions

### Agent architecture:
[ ] rethink librarian vs advisor split. user does not want to see "librarian" term. his only talking parter is the main Agent. The librarian should be a background agent that is not visible to the user. Maybe use the librarian as a subagent of the main agent.
[ ] search sources is only vector, should be sql filtering as well. eg i ask for sources on a day, it filters by date. dedicated tools.ts file advisor agent.
[x] add citations in chat message (perplexity-style)

### Activity page:
[x] Fix design, make it more readable and attractive. -> add backlink to the source or artifact page. ("Recent activity")
[x] Make librarian activity clearer in backend and frontend (activity page)
[x] Document the librarian system and the advisor agents in a markdown doc to make it clearer. Also use mermaid diagrams and stuff.
[x] Add token and context count to chat page like codex or claude code

### Chat:
[ ] add tag files to chat messages (like mike has)
[ ] Incognito chat feature (memory not saved and other team members cannot see it)
[x] Scroll-to-bottom overlay (circular control) when the message list is scrolled away from the latest message; re-stick to bottom on send and while streaming unless the user scrolls up