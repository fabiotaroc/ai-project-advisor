# AI Project Advisor Web App - PRD

## Document Status

- Status: Draft
- Author: Taro + Codex brainstorming
- Date: 2026-04-07
- Purpose: frame a possible productization path for the agent workspace at `/Users/taro/Projects/leadabeelity` and harness it as a standalone web app for non-technical users

## 1. Product Summary

### Working Title

AI Project Advisor

### One-Line Pitch

A collaborative web app that gives teams a persistent AI advisor grounded in their documents, emails, meeting notes, and operating memory, without requiring developer tools.

### Why This Exists

The current workflow is powerful because it combines:

- a persistent workspace
- structured memory
- source material ingestion
- an AI assistant that can reason across the project

However, it currently depends on technical tooling and file-based workflows that most PMs, consultants, founders, and operations teams will not use comfortably.

The opportunity is to turn that capability into a simple collaborative product:

- upload source material
- maintain living project memory
- ask questions and get cited answers
- keep decisions, tasks, and next actions current

### Initial Commercialization Path

The productization path should be explicit from the start:

- begin as an internal operating tool used by Alkemy teams
- validate value through a Samsung-centered pilot and concrete use cases
- abstract the architecture and workflows into a reusable product layer
- evolve toward a design-partner offering and then B2B SaaS if usage proves sticky

This matters because the near-term goal is not only to build a tool, but to create an internal asset that proves value on a live project and can later be generalized.

## 2. Problem Statement

Teams lose context constantly.

Project knowledge is fragmented across:

- meetings
- emails
- decks
- notes
- Slack or chat threads
- ad hoc documents

This creates recurring pain:

- new people take too long to ramp up
- decisions are forgotten or re-litigated
- next steps are unclear
- PM-quality thinking depends too much on a single strong operator
- AI chats are useful in the moment but do not become an enduring system of record

Existing tools partially solve storage, documentation, or chat, but often fail to combine:

- persistent memory
- structured project artifacts
- multi-source ingestion
- collaborative use
- non-technical usability

## 3. Target Users

### Primary User

High-agency knowledge workers managing ambiguous projects:

- consultants
- product managers
- founders
- delivery leads
- strategy / operations leads

### Secondary User

Small teams that need a shared project brain:

- agencies
- startup product teams
- internal innovation teams
- client-service teams

### Best-Fit Project Contexts

The earliest strong-fit environments are likely to be:

- long-running projects with high context loss
- projects with messy handovers or onboarding overhead
- engagements with many documents, emails, decks, and meeting notes
- teams that repeatedly revisit past decisions or prior deliverables

The product is likely to create less immediate value on very short or simple projects with limited documentation.

### Anti-Target for MVP

- broad consumer users
- highly technical coding-first users who already prefer local tools
- large regulated enterprises requiring deep compliance features on day 1

## 4. Jobs To Be Done

### Functional Jobs

- Help me centralize project context without manually reorganizing everything
- Help me understand what matters from uploaded materials
- Help me keep project memory, decisions, and next steps current
- Help me answer project questions quickly with source grounding
- Help my team work from the same understanding

### Emotional Jobs

- Help me feel in control of complexity
- Help me avoid missing important context
- Help me look sharp in meetings and follow-ups
- Help me operate more like a strong PM even if I do not have a formal PM role

## 5. Product Vision

The product should feel like:

- a shared project brain
- an AI PM/advisor
- a lightweight operating system for project work

It should not feel like:

- a code tool for developers
- a generic chatbot with uploads
- a document repository with an AI wrapper

The product should make the hidden "cloud agent workspace" concept more explicit in the architecture while keeping the user-facing experience framed as a standard SaaS app rather than a developer environment.

In practice, that means the underlying processes can remain agentic and file-backed, with persistent memory, project files, and background workflows, while the default interface stays centered on chat, folders, artifacts, and durable project memory instead of code, prompts, or internal tooling.

### Longer-Term Product Shape

The long-term direction may evolve beyond a single assistant into:

- one general advisor with modular skills
- or a small team of specialized agents that share project context
- easy-to-add integrations packaged like plugins rather than custom one-off implementations

Examples of future plugin / skill areas:

- Outlook or email ingestion
- calendar reading
- cloud folder and SharePoint access
- meeting note processing
- write actions such as drafting emails, creating summaries, or preparing documents

This modularity is not required for MVP, but the product and architecture should be designed so that this evolution is possible.

## 6. Product Principles

- Hide technical complexity by default
- Preserve traceability through sources and history
- Convert raw inputs into structured, useful artifacts
- Keep the user in control of what becomes durable project memory
- Support collaboration by default, not as an afterthought
- Make outputs practical: decisions, tasks, summaries, risks, recommendations
- Encourage a lightly standardized project structure so the product can generalize across projects
- Design integrations and capabilities as modular building blocks where possible

## 7. Core Product Objects

The system should treat project knowledge as structured objects, not only files.

Core objects:

- Workspace
- Project
- Conversation
- Source Material
- Document
- Email
- Meeting Note
- Memory Entry
- Decision
- Task / Follow-Up
- Insight / Risk / Open Question
- Operational Snapshot / Weekly Workboard
- Handover Summary
- Draft Output

Each object should support:

- ownership / permissions
- links to source evidence
- timestamps
- version history
- references to related objects

### Memory Layers

The system should distinguish between:

- **macro project memory**, such as scope, stakeholders, project phase, objectives, major decisions, and overall timeline
- **operational memory**, such as this week’s to-dos, upcoming meetings, current blockers, and active review items

That distinction is important because a stable project overview and a weekly working snapshot change at different speeds and serve different user needs.

### Output Artifact Types

The assistant should be able to produce practical outputs such as:

- meeting recap
- handover summary
- draft follow-up email
- status snapshot
- draft report or deliverable outline
- draft presentation or structured content based on predefined formats

## 8. MVP Scope

### MVP Goal

Prove that a small team can use the product as a shared AI project advisor and receive ongoing value from memory, ingestion, and grounded assistance.

### MVP User Promise

"Give me one place to upload project materials, ask questions, and keep a living project memory that my team can trust."

### In Scope

- Workspace creation
- Projects within a workspace
- Team members with basic roles
- Chat with project context
- Upload documents, markdown notes, and emails
- Basic ingestion and parsing pipeline
- Source-grounded answers with citations
- Structured project sections maintained by the assistant:
  - Overview
  - Product
  - Decisions
  - Work / Next Steps
  - Memory / Timeline
  - Operational Snapshot
- Preview changes before saving important updates to durable memory
- Search across uploaded materials and generated project artifacts
- Activity history
- Export project memory to Markdown

### Out of Scope for MVP

- autonomous multi-agent swarms
- advanced workflow automation
- full real-time multiplayer text editing
- deep Git-native collaboration for normal users
- broad external app integrations beyond a small number of inputs
- enterprise-grade compliance customization
- complex BI dashboards
- consumer/mobile-first product surface

## 9. Initial Use Cases To Validate

### Core Reusable Use Cases

- grounded Q&A over project history and source materials
- faster onboarding and handover support for long-running projects
- meeting note digestion and minute generation
- draft follow-up emails and recap messages
- weekly operational support: what is happening now, what needs to be done, and what is upcoming
- project-document mapping and traceability
- report or deliverable drafting from predefined structures
- historical pattern analysis across similar projects to surface correlations and insights

### Samsung-Applied Use Cases

- project knowledge base for the Samsung engagement
- digital marketing / reporting support
- support for recurring reporting and deliverable preparation
- historical analysis of campaign elements such as subject lines and pre-headers
- segmentation / persona support where relevant to the project context

### Productization Lens

The product should be validated through a small number of flagship use cases that are:

- valuable on Samsung now
- reusable across future projects
- simple enough to explain in a Capex / roadmap narrative
- concrete enough to test with real users and real source material

## 10. User Experience

### Main Screens

### 1. Workspace Home

- List of projects
- Recent activity
- Draft changes generated during user-requested workflows

### 2. Project Workspace

- Chat panel
- Source materials panel
- Project artifacts panel
- Activity / history panel

### 3. Source Material View

- Raw file preview when possible
- Extracted summary
- Key facts
- Linked decisions / tasks / memory entries

### 4. Change Preview

- Draft updates to durable project memory generated during the current user-requested flow
- Confirm / edit / discard before saving

### UX Rules

- Do not show code by default
- Do not show raw prompts by default
- Show sources, confidence, and change history
- Allow advanced inspection later, but keep default UX legible for non-technical users

## 11. Collaboration Model

Collaboration is a core part of the value proposition.

### MVP Collaboration Features

- Shared workspace access
- Project-level member roles
- Visible authorship and timestamps
- Activity feed
- Comments or mentions on key artifacts
- Version history on durable objects

### Design Stance

The product does not need Google Docs-level real-time editing in v1.

It does need clear ownership, safe edits, and transparency about what changed.

## 12. Business Model Hypothesis

### Recommended Starting Motion

Start as:

- internal tool
- then design-partner product
- then B2B SaaS if usage proves sticky

### Practical Entry Motion

A practical early path is:

- use the product internally on Samsung to create immediate value
- package the validated use cases and architecture as an internal asset
- reuse and adapt it on other Alkemy projects with similar knowledge-management pain
- explore externalization once repeatability and value are proven

### Best Initial Buyer

- small teams with messy project knowledge
- agencies / consultancies
- startup product teams
- founder-led teams

### Possible Pricing Shape

- per workspace subscription
- or per seat with usage tiers
- storage and AI usage limits included

### Value Drivers

- reduced ramp-up time
- reduced context loss
- faster follow-through after meetings
- clearer decisions and ownership
- higher leverage for PM / ops / consulting work

## 13. Compliance And Trust Requirements

This area is critical if the product stores client materials.

### MVP Trust Baseline

- tenant isolation
- encryption in transit
- encryption at rest
- role-based access control
- audit logs
- retention and deletion controls
- "customer data is not used to train foundation models" policy
- clear subprocessor documentation

### EU / GDPR Considerations

- support EU-hosted infrastructure where possible
- data processing agreement
- explicit handling of deletion requests
- clear classification of uploaded content and responsibilities

### Risk Areas

- emails may contain personal or confidential client data
- project files may contain commercial secrets
- wellness / health-adjacent data may trigger stricter handling expectations depending on usage

### Document Governance / Quality Opportunity

A future value area is support for document-governance workflows, including:

- versioning and history visibility
- edit traceability
- ownership visibility
- quality checks or signals on project documentation
- support for ISO-style documentation expectations where relevant

This is not required for MVP, but it is a potentially meaningful expansion area for teams with strong documentation and quality requirements.

### Product Implication

Avoid heavily regulated use cases in the first go-to-market motion unless compliance becomes a major investment area.

## 14. Technical Requirements

### Functional Requirements

- Users can create workspaces and projects
- Users can upload files and emails
- The system extracts text and metadata from supported inputs
- The system stores raw originals and parsed representations
- The system supports retrieval-augmented answering with citations
- The system can prepare structured updates to project artifacts during user-requested flows
- Users can preview, edit, confirm, or discard durable updates before saving
- Users can search across sources and artifacts
- Users can export project artifacts to Markdown
- The system should support normalization of messy real-world email inputs, including raw `.eml` files and HTML-heavy email bodies
- The system should preserve both the raw original and a cleaned human-readable / machine-readable representation when possible

### Non-Functional Requirements

- multi-tenant by design
- observable ingestion pipeline
- resilient background jobs
- permission-aware retrieval
- basic auditability
- low-friction onboarding
- extensible integration architecture

## 15. Technical Architecture - MVP

### Recommended Stack

- Frontend: Next.js + TypeScript
- Backend: TypeScript service layer
- Database: Postgres (supabase)
- Vector search: Supabase
- File storage: Supabase
- Queue / jobs: background worker for ingestion and summarization
- Auth: Supabase Auth
- LLM access: model gateway layer so providers can be swapped later (Verce AI SDK)

### High-Level Flow

1. User uploads a file or email
2. Raw asset is stored in object storage
3. Background job extracts text, metadata, and attachments
4. Content is chunked and indexed for retrieval
5. AI creates:
  - summary
    - key facts
    - candidate decisions
    - candidate tasks
    - candidate memory updates
6. User chats with the assistant against project context
7. Durable updates are shown as a preview before saving
8. Confirmed updates become part of the project's living memory

### Extensibility Direction

The architecture should leave room for future modular capabilities such as:

- email connectors
- calendar ingestion
- cloud drive / SharePoint ingestion
- meeting processing
- write-capable task or communication actions

Even if these are not all in MVP, the architecture should avoid locking the product into a single hard-coded workflow.

## 16. Data Model Sketch

### Core Tables / Collections

- `users`
- `workspaces`
- `workspace_members`
- `projects`
- `project_members`
- `conversations`
- `messages`
- `source_materials`
- `source_versions`
- `source_chunks`
- `artifacts`
- `artifact_versions`
- `decisions`
- `tasks`
- `memory_entries`
- `activity_events`

### Storage Pattern

### Structured Data in Postgres

- metadata
- permissions
- links
- statuses
- histories
- review states

### Binary Data in Object Storage

- PDFs
- DOCX files
- raw emails
- attachments
- exports

### Retrieval Data

- extracted text
- chunk metadata
- embeddings

## 17. Content And Storage Strategy

### Documents

Store:

- raw original
- extracted text
- normalized metadata
- chunked representations for retrieval

### Emails

Store:

- raw original email when available
- parsed sender / recipients / subject / date
- body
- attachments
- extracted summary and facts
- cleaned readable version for human review when the original is messy or HTML-heavy

### Standard Project Skeleton

The product should support a reusable project-information skeleton that can be adapted per engagement.

Common reusable categories may include:

- project overview / context
- stakeholders and interlocutors
- deliverables
- meetings
- current work / weekly snapshot
- decisions
- historical artifacts
- source systems and permissions

The product should not force rigid structure, but should reward teams that adopt a lightly standardized project setup.

### Future Input Roadmap

Likely future sources include:

- Outlook or email sync
- calendar
- SharePoint / cloud drives
- project repositories or structured folder systems
- task or project-management systems later

### Markdown

Markdown should be supported as:

- import format
- editable export format
- optional internal representation for some artifacts

But markdown should not be the only source of truth in the product.

## 18. Git Position

Git should be optional, not foundational.

### Recommendation

- Use Git internally if helpful for product development
- Offer Markdown export for portability
- Potentially add Git sync later for advanced users
- Do not require non-technical users to understand repositories, branches, or commits

## 19. Success Metrics

### Adoption

- number of active workspaces
- number of weekly active users
- number of projects with repeated usage after initial setup

### Engagement

- uploads per active project
- chats per project
- rate of previewed updates that users confirm or edit before saving
- percentage of projects with at least one durable artifact maintained over time

### Value

- time to answer project questions
- reduced time spent preparing for meetings
- faster onboarding for new collaborators
- qualitative trust in citations and memory quality

## 20. Key Risks

- The product may feel like a thin wrapper around existing AI chat tools
- Ingestion quality may be inconsistent across file types
- Users may not trust auto-generated memory without strong traceability
- Collaboration could become messy without review and version controls
- Compliance requirements may slow adoption in sensitive environments
- The product could become too generic if it tries to serve every knowledge-work use case at once

## 21. Strategic Recommendation

Do not start by building a generic AI workspace.

Start with a sharper wedge:

- AI project advisor for PMs, consultants, founders, and small teams

That wedge is attractive because it:

- matches the current workflow DNA
- has a concrete pain point
- benefits from persistent memory
- values grounded recommendations over novelty alone
- can expand later into a broader collaborative AI operating system

### Strategic Rollout Logic

The practical sequence should be:

- validate on Samsung with 3 to 4 concrete use cases
- package what works as a reusable internal asset
- define the generalized data architecture and operating model for future projects
- then decide whether to scale internally first, externally later, or both

## 22. Suggested Delivery Phases

### Phase 0 - Discovery

- interview internal teams or target users
- identify recurring project-memory pain points
- prioritize 3 to 4 flagship use cases
- estimate likely value / time-saving hypotheses
- define a reusable project skeleton and data architecture

### Phase 1 - Usable Solo Tool

- one workspace
- one project advisor
- file upload
- chat with citations
- structured artifacts
- markdown export
- Samsung pilot implementation

### Phase 2 - Small Team Collaboration

- shared workspace
- change preview flow
- comments
- activity feed
- role-based access
- reusable abstraction beyond the initial Samsung context

### Phase 3 - Commercial Hardening

- billing
- stronger admin controls
- audit logs
- retention policies
- more integrations
- improved compliance posture

## 23. Program Deliverables

The initiative should produce more than only the software artifact.

Expected deliverables include:

- a usable prototype or v1 product artifact
- a documented set of validated use cases
- an initial generalized architecture for project data and memory
- guidance on what project structure and source inputs are needed to get value
- a phased roadmap of releases and capabilities
- a lightweight value hypothesis or business case by major use case

## 24. Open Questions

- What is the narrowest user segment with strongest pain and willingness to pay?
- Should the first commercial version focus on agencies/consultants or internal product teams?
- Which durable updates should save directly within a user-requested workflow versus require a preview step before saving?
- What level of explainability is needed for users to trust project updates?
- Which file types matter most in practice for v1?
- Should email ingestion be manual upload only at first, or support inbox forwarding / sync?
- How much of the current file-based harness should become product logic versus internal tooling?
- What are the top 3 to 4 use cases to prioritize for the first release?
- Which of those use cases are Samsung-specific versus reusable across many projects?
- What minimum project structure is required for the product to work well?
- Should the first version remain a single advisor or evolve quickly into multiple specialized skills / agents?
- Which outputs create the clearest measurable value first: Q&A, minutes, email drafts, report drafts, handover support, or weekly operational tracking?
- Which compliance or document-governance capabilities are important enough to design for early?

## 25. Immediate Next Steps

- Validate the value proposition with 5 to 10 target users
- Collect examples of recurring project-memory pain
- Identify the minimum set of source inputs needed for useful answers
- Sketch the core UI for:
  - project workspace
  - chat
  - source panel
  - change preview flow
- Design the initial data model and permissions model
- Build a thin prototype around upload, retrieval, chat, and durable memory review
- Define the 3 to 4 flagship use cases to present in the Capex / roadmap narrative
- Prepare an abstraction pass that separates Samsung-specific logic from reusable product logic