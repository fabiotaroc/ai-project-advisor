# SCAR V1 Product Spec And Roadmap

Date: 2026-05-16

## Product Thesis

Supplier Quality Engineers are a sharper first user than broad manufacturing quality teams.

The V1 wedge should be:

> AI copilot for Supplier Quality Engineers that turns supplier nonconformities, audit findings, incoming inspection records, and supplier emails into SCAR drafts, recurrence history, and closure-ready evidence packs.

Long-term, this can expand into CAPA, customer claims, audit findings, and a broader system of intelligence for manufacturing quality. But V1 should stay anchored on SCAR.

## Why SCAR Before CAPA

CAPA is the larger category, but it is too broad for a first product. CAPA can involve internal process failures, customer complaints, audit findings, safety issues, regulatory issues, supplier defects, and recurring production problems. Ownership varies by company.

SCAR is narrower:

- User: Supplier Quality Engineer.
- Trigger: supplier defect, supplier audit finding, incoming inspection failure, repeated supplier nonconformance.
- Artifact: Supplier Corrective Action Request package.
- Counterparty: supplier.
- Evidence: supplier emails, inspection records, defect photos, purchase/order/part data, audit findings, prior supplier issues.
- Value: faster closure, stronger evidence, fewer repeat supplier defects.

SCAR is a better wedge because it has a specific user, specific artifact, fragmented evidence, external collaboration, clear ROI, and a natural expansion path into CAPA.

## First User

Primary user:

- Supplier Quality Engineer

Secondary users:

- Quality Manager
- Incoming Inspection Lead
- Procurement / Sourcing Manager
- R&D or Technical Documentation owner
- Regulatory / Compliance Manager
- Supplier contact

Likely buyer:

- Head of Quality
- Director of Quality Systems
- VP Operations / Quality
- Quality and Regulatory leadership in regulated manufacturing

## First Workflow

V1 workflow:

1. Supplier issue is detected.
2. User creates or uploads a case packet.
3. Product extracts structured facts.
4. Product finds related prior supplier issues.
5. Product drafts the SCAR package.
6. User reviews, edits, and approves.
7. Product tracks closure readiness and missing evidence.
8. User exports or copies the final package into the existing QMS.

V1 should not attempt to replace QMS. It should prepare the investigation and evidence package that goes into the customer's system of record.

## Inputs

Initial supported inputs:

- Supplier emails
- Incoming inspection nonconformance records
- Defect photos
- Supplier audit findings
- Purchase orders
- Part numbers
- Lot or batch information
- Supplier responses
- Prior SCARs or supplier issues
- Technical drawings or specifications
- Quality procedures or work instructions

## V1 Output

The first artifact is a SCAR / supplier corrective action package.

Suggested sections:

- Supplier
- Part number / product / material
- Purchase order / lot / batch / shipment
- Issue description
- Defect category / failure mode
- Detection source
- Severity / risk
- Affected quantity
- Containment actions
- Evidence links
- Similar prior issues
- Required supplier response
- Root cause summary
- Corrective action summary
- Preventive action summary
- Owner and due date
- Closure readiness checklist
- Open evidence gaps

## V1 Product Capabilities

Must have:

- Case packet upload/import.
- Structured extraction of supplier, part, lot, defect, dates, quantities, and source evidence.
- SCAR draft generation with cited evidence.
- Similar prior issue search by supplier, part, defect, process, or failure mode.
- Missing evidence checklist.
- Closure readiness status.
- Export/copy-ready SCAR output.

Should have:

- Supplier response review.
- Timeline of issue detection, containment, supplier response, and actions.
- Recurrence summary by supplier, part, or defect mode.
- Action owner and due-date tracking.
- Customer/internal summary view.

Not V1:

- Full QMS replacement.
- Electronic signatures.
- Formal regulated workflow engine.
- Deep ERP/MES/PLM integrations.
- Automatic root-cause approval.
- Broad manufacturing quality dashboard.

## Core Product Promise

For the user:

> Cut the time needed to assemble a defensible SCAR draft and evidence pack.

For the buyer:

> Reduce supplier issue cycle time, overdue SCARs, repeat supplier defects, and audit-readiness gaps without replacing existing QMS.

## KPIs

Buyer KPIs:

- SCAR cycle time.
- Overdue SCARs.
- Repeat supplier nonconformances.
- Evidence completeness at closure.
- SCAR rework/rejection rate.
- Supplier response time.
- Cost of poor supplier quality.

User KPIs:

- Time to draft SCAR package.
- Time spent collecting evidence.
- Percentage of fields prefilled correctly.
- Percentage of AI evidence links accepted.
- Number of related prior issues found.
- Time spent reviewing supplier responses.
- Closure checklist completion rate.

Initial proof metric:

> Reduce time to assemble a defensible SCAR draft and evidence pack by 50% without increasing review burden.

## Roadmap

### Phase 0: Validation Prototype

Goal: prove the artifact is valuable before building a platform.

Build or manually simulate:

- Upload a supplier issue packet.
- Extract key fields.
- Draft SCAR sections.
- Link evidence.
- Find similar prior issues from a small dataset.
- Produce missing evidence checklist.

Validation test:

- Sit with 5-10 Supplier Quality Engineers.
- Ask for a recently closed SCAR or supplier issue.
- Recreate the SCAR package from messy inputs.
- Measure time saved, edits required, and trust in evidence links.

### Phase 1: SCAR Copilot MVP

Goal: usable case workspace for supplier quality investigations.

Scope:

- Case intake.
- Source library per case.
- Structured SCAR draft.
- Evidence-linked fields.
- Related issue search.
- Closure readiness checklist.
- Export to Word/PDF/clipboard or QMS-friendly format.

Success:

- Users reuse it on the next supplier issue.
- Drafts are accepted with minor edits.
- Evidence links reduce review time.
- Missing evidence checklist catches real gaps.

### Phase 2: Supplier Quality Memory

Goal: make memory compound across suppliers, parts, and defect modes.

Scope:

- Supplier history.
- Part/failure mode history.
- Recurrence detection.
- Supplier risk summaries.
- Open SCAR dashboard.
- Supplier response quality tracking.

Expansion artifact:

- Supplier quality brief.
- Supplier audit prep packet.
- Supplier performance review.

### Phase 3: Manufacturing Quality Expansion

Goal: expand from supplier quality into broader quality investigations.

Expansion workflows:

- Customer complaint -> CAPA draft.
- Internal nonconformance -> CAPA draft.
- Audit finding -> corrective action plan.
- Product industrialization quality dossier.
- PFMEA/control-plan evidence support.

Long-term positioning:

> System of intelligence for manufacturing quality investigations.

## Key Risks

- Incumbent QMS vendors add enough AI to reduce urgency.
- Buyers ask for integrations before V1 value is proven.
- Supplier data is messy, inconsistent, or hard to access.
- Regulated customers resist AI-generated quality content.
- Root-cause suggestions create liability if positioned incorrectly.
- SCAR workflows vary by industry more than expected.

Mitigation:

- Position as human-reviewed evidence preparation, not automated quality judgment.
- Start with export/copy workflows before deep integrations.
- Focus on one artifact and one user.
- Use citations and source links everywhere.
- Validate with real closed SCARs before building broad workflows.

## Discovery Questions

Ask Supplier Quality Engineers:

- Show me the last SCAR you closed.
- What triggered it?
- What inputs did you use?
- Where did the evidence live?
- What took longest?
- What usually delays supplier response or closure?
- What makes a supplier response unacceptable?
- Do you search prior supplier issues before opening a SCAR?
- How do you detect recurrence by supplier, part, or defect mode?
- What system is the official record?
- What work happens outside that system?
- What would you trust AI to draft?
- What would you never trust AI to decide?
- Would a cited draft and evidence checklist save enough time to use again?
