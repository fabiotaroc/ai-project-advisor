# Product Brief

## Purpose

This is the strategic source of truth for AI Project Advisor. Read this first when the product direction feels noisy.

Other docs are subordinate to this brief:

- `docs/PRD.md` defines product requirements and user-facing scope.
- `docs/MARKET_POSITIONING.md` stress-tests competitors and differentiation.
- `docs/ROADMAP.md` sequences what to build next.
- `docs/2026-05-10-living-project-brief-startup-design.md` preserves the approved office-hours diagnostic that produced this direction.

## Thesis

AI Project Advisor keeps a living project brief updated from meetings, emails, notes, and files, with human approval.

The product should not be a generic project management agent, AI file search tool, or ClickUp/Notion clone. Its wedge is controlled project memory formation: messy project evidence becomes official, reviewable memory that the team can trust.

## Target User

The first user is a PM-like consultant, engagement manager, delivery lead, or project coordinator who owns coordination across messy multi-stakeholder projects.

They are responsible for remembering client context, workshop outcomes, decisions, priorities, analysis needs, country or workstream differences, and follow-ups while switching across multiple projects.

## Status Quo

Today, these users recover project context by searching meeting transcripts, reading notes, checking emails, asking colleagues on Teams, and copying material into ChatGPT or Claude.

The real competitor is not only manual search. It is ChatGPT or Claude plus a human who remembers the project.

ClickUp Brain and Notion AI are also relevant, but they are workspace-first: AI sits on top of the structure a team maintains. AI Project Advisor should be memory-formation-first: it actively proposes updates to the team's official understanding after new evidence arrives.

## Wedge

The narrowest sellable promise is:

> Keep a living project brief updated after every meeting.

After every meeting, source drop, or important email, the product proposes updates to the official project brief. The user approves, edits, or rejects those updates. Later, the team can ask what happened, what was decided, and what exists, with source-grounded answers.

## Product Boundary

Build toward:

- Reviewable updates to official project memory.
- Source-grounded decisions, requirements, risks, people, actions, and open questions.
- A clear activity trail showing what changed and why.
- Practical outputs generated from accepted memory, such as handovers, meeting recaps, status updates, and PRDs.

Do not drift into:

- Generic task management.
- Generic document storage.
- AI search over files as the core product.
- A broad consulting workspace before the memory loop is proven.
- A workflow that requires users to understand repositories, folders, prompts, or agent plumbing.

## Current Assignment

Do not build a broader workspace next.

Validate the wedge directly:

1. Pick one real recent Leadabeelity meeting transcript.
2. Run it through the current POC.
3. Produce proposed updates to a simple project brief.
4. Put Leo or Alessio in front of the output without Taro acting as proxy.
5. Ask them to accept, edit, reject, or challenge the updates.
6. Watch where they hesitate, what they trust, and what they ask next.

## Success Criteria

The next validation round succeeds if:

- At least 2 non-founder users use the product or POC directly.
- A user accepts at least one proposed project brief update from a real source.
- A user asks a project-memory question and says the answer saved meaningful time.
- A user trusts at least one source-backed answer more than they would trust plain ChatGPT.
- A user asks to use it again on another meeting or project.

## Kill Criteria

Narrow or pivot if:

- Users only use it for one-off summarization.
- Users do not care about accepting or rejecting memory updates.
- Users do not trust canonical project memory more than source search or generic chat.
- Generated artifacts do not save meaningful time.
- Users mainly ask for task boards, dashboards, or generic document management.
