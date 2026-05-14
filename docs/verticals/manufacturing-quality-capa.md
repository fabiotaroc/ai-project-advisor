# Manufacturing Quality / CAPA Vertical Exploration

Date: 2026-05-14

## Summary

Manufacturing quality and CAPA is a promising vertical because it has a recurring, evidence-heavy workflow where messy inputs become a structured, reviewable artifact.

CAPA stands for Corrective and Preventive Action. It is the formal quality-management process used when something goes wrong, nearly goes wrong, or might repeatedly go wrong in manufacturing or regulated operations.

At a simple level:

> Something bad happened -> investigate why -> fix the immediate issue -> prevent recurrence -> prove the fix worked -> keep an audit trail.

This workflow appears in industries such as medical devices, pharma, aerospace, automotive, electronics, industrial equipment, chemicals, food, packaging, and advanced manufacturing.

For a mechanical engineering intuition, CAPA is the organizational version of root-cause failure analysis plus controlled remediation.

## Why CAPA Exists

Manufacturing companies do not only need to fix defects. They need to show that they understand defects, can control their process, and can prove to customers, auditors, and regulators that problems will not repeat.

A weak informal response is:

> We found the issue and told the operator to be more careful.

A stronger CAPA response is:

> We identified the defect pattern, traced it to fixture wear and ambiguous work instructions, quarantined affected lots, revised the fixture maintenance schedule, updated the inspection plan, retrained operators, verified yield improvement over 30 days, and linked all evidence.

The second version is what customers, auditors, and regulated quality systems care about.

## Typical CAPA Triggers

CAPAs usually start from one of these:

- Customer complaint: delivered parts fail fit check or performance expectations.
- Internal nonconformance: a batch, lot, or part is outside tolerance.
- Supplier quality issue: incoming material has porosity, incorrect dimensions, missing documentation, or other defects.
- Audit finding: calibration records, training records, or procedures are incomplete.
- Process deviation: a line runs outside validated parameters.
- Recurring scrap or rework: the same failure mode appears repeatedly.
- Field failure or warranty claim: product fails after release.
- Safety or regulatory issue: potential risk to users, operators, or compliance status.

Not every issue becomes a CAPA. Companies often triage issues first. Small one-off nonconformances may be contained and closed. Repeated, severe, customer-facing, safety-critical, or systemic problems are more likely to become CAPAs.

## Core Workflow

1. Detection / Intake

   Someone records the issue. It may come from inspection, production, a customer, an audit, a supplier report, or field service.

2. Containment

   Stop the immediate problem. Quarantine suspect inventory, pause shipment, notify customers, add temporary inspection, block supplier lots, or issue temporary instructions.

3. Problem Definition

   Describe the issue clearly: what happened, where, when, how often, affected lots, affected products, affected customers, severity, and supporting evidence.

4. Root Cause Analysis

   Determine why it happened. Common methods include 5 Whys, fishbone/Ishikawa, fault tree, Pareto analysis, process mapping, FMEA review, and measurement-system analysis.

5. Corrective Action Plan

   Define actions that eliminate the root cause. Examples include revising work instructions, changing a fixture, updating a supplier specification, adding poka-yoke, changing inspection frequency, retraining staff, updating software, or revising a maintenance schedule.

6. Preventive Action

   Ask whether the same failure mode could appear elsewhere. Apply learnings to similar products, lines, suppliers, plants, or processes.

7. Implementation

   Assign owners and due dates. Execute changes and attach evidence.

8. Effectiveness Check

   Prove the fix worked. For example: no repeat defects for three production runs, reduced scrap rate, successful audit sampling, stable Cp/Cpk, or eliminated complaint trend.

9. Closure / Approval

   Quality reviews and approves closure. In regulated environments, closure requires evidence, signatures, dates, and traceability.

## Common Artifacts

CAPA is artifact-heavy, which makes it a strong candidate for a structured-memory product.

Common artifacts include:

- CAPA report
- Nonconformance report
- Customer complaint record
- Root cause analysis worksheet
- 5 Whys or fishbone diagram
- Containment action log
- Corrective action tracker
- Effectiveness verification record
- Supplier corrective action request, often called SCAR
- Audit finding response
- Evidence pack
- Training record
- Revised SOP or work instruction
- Inspection report
- Lot traceability record
- Risk assessment or FMEA update

A CAPA is not just a task. It is a case file.

## Personas

Likely users and buyers:

- Quality Engineer: runs investigations, analyzes defects, writes CAPAs.
- Quality Manager: approves CAPAs and owns quality system performance.
- Manufacturing Engineer: fixes process, tooling, fixtures, and work instructions.
- Production Supervisor: implements changes on the floor.
- Supplier Quality Engineer: handles supplier-caused defects and SCARs.
- Regulatory or Compliance Manager: ensures audit readiness.
- Operations Manager: cares about cost, downtime, delivery impact, and repeat defects.
- Customer Quality Engineer / Account Quality Lead: interfaces with customers on complaints.

The best initial persona likely depends on company size. In a mid-sized manufacturer, the Quality Manager may own the whole process. In larger companies, Quality Engineers and Supplier Quality Engineers may feel the daily pain most directly.

## Why The Workflow Is Painful

CAPA work is cross-functional, evidence-heavy, and repetitive.

The quality owner often has to pull information from:

- Inspection records
- Production logs
- ERP, MES, and QMS systems
- Emails
- Customer complaints
- Supplier messages
- Meeting notes
- Photos
- Test reports
- Drawings and specifications
- SOPs
- Training records
- Previous CAPAs
- Audit findings

Then they need to turn that messy evidence into a clean, defensible narrative:

- What happened?
- Why did it happen?
- What did we do immediately?
- What is the true root cause?
- What action prevents recurrence?
- Who owns it?
- What evidence proves completion?
- How do we know it worked?
- Is this issue related to previous issues?
- Should other products, processes, lines, suppliers, or plants be checked?

This matches the strategic pattern from `docs/druso-feedback.md`:

> Messy evidence -> structured memory -> trusted recurring artifact.

## Possible AI Wedge

The product should not claim to fully automate quality judgment or root-cause engineering. A safer wedge is:

> Help the quality team collect, structure, trace, and review the CAPA case file faster.

Possible capabilities:

- Draft the initial CAPA summary from a complaint and inspection records.
- Extract affected part numbers, lots, dates, customers, failure modes, and severity.
- Build a timeline of events from emails, meetings, and logs.
- Suggest similar prior CAPAs or recurring failure patterns.
- Pre-fill a 5 Whys worksheet from available evidence.
- Identify missing evidence before closure.
- Maintain an action and evidence tracker.
- Generate customer-facing response drafts.
- Compare a proposed root cause against available evidence.
- Flag weak CAPAs, such as "operator error" with no systemic fix.
- Prepare audit-ready evidence packs.
- Remind users when effectiveness checks are due.
- Summarize open CAPAs by risk, age, owner, product line, supplier, or plant.

## Narrow Product Concepts

Possible positioning:

> Turn quality incidents, complaints, and internal notes into a reviewable CAPA draft with evidence links.

Sharper version:

> AI assistant for drafting and maintaining CAPA reports from messy quality evidence.

Another possible angle:

> Living quality case files for CAPA investigations, SCARs, and audit findings.

The product should work alongside existing QMS tools, not claim to replace them.

## Stable Schema

A CAPA-specific memory model could include:

- CAPA ID
- Source or trigger
- Product, part, line, supplier, and plant
- Issue description
- Severity and risk
- Affected lots, shipments, or customers
- Containment actions
- Root cause hypothesis
- Supporting evidence
- Corrective actions
- Preventive actions
- Owners
- Due dates
- Effectiveness check
- Closure status
- Related CAPAs, complaints, suppliers, or audit findings
- Audit trail

This is much more structured than a general project brief. That structure could help the system distinguish signal from noise.

## Example Scenario

A customer reports that a bracket assembly failed incoming inspection because a hole pattern is misaligned.

Inputs:

- Customer complaint email
- Inspection photos
- Drawing revision
- Shipment lot numbers
- Internal inspection records
- Production traveler
- Fixture maintenance log
- Teams messages from manufacturing engineering
- Previous nonconformance from two months ago

AI-assisted output:

- Draft problem statement
- Affected lots and shipments
- Event timeline
- Immediate containment actions
- Similar prior issue found
- Suggested evidence gaps, such as missing fixture calibration record or operator training record
- Draft 5 Whys
- Proposed corrective actions for review:
  - Inspect fixture wear.
  - Update maintenance interval.
  - Add first-article check after fixture changeover.
  - Revise work instruction.
- Effectiveness check for review:
  - Verify next three lots pass dimensional inspection.
  - Monitor for no repeat complaints for 60 days.

The human quality engineer reviews, corrects, approves, and exports or copies the final record into the QMS.

## Why This Vertical Is Attractive

Manufacturing quality / CAPA has several strong properties:

- Recurring: CAPAs, SCARs, and quality investigations happen continuously.
- Standardized: the workflow is similar across companies and regulated standards.
- High pain: documentation burden is real.
- High consequence: bad CAPAs cause audit findings, repeat defects, customer escalations, and compliance risk.
- Evidence-heavy: source grounding matters.
- Table-first: trackers, matrices, logs, status fields, and checklists are natural.
- Human approval required: reviewable memory is essential.
- Memory compounds: prior CAPAs help detect recurrence and reuse lessons.
- Clear artifact: the CAPA report or case file is the output.

Compared with a broad project advisor, this is sharper:

> Living quality case file for each investigation.

The system knows what memory should look like, can ask better questions, can detect missing fields, and can support an existing approval process.

## Risks And Hard Parts

Important risks:

- Manufacturing data often lives in old systems: ERP, MES, QMS, Excel, shared drives, and email.
- Regulated companies are conservative with AI.
- CAPA language varies by industry and quality standard.
- Root cause analysis requires real domain judgment.
- Bad AI suggestions could create compliance risk.
- Integrations may matter quickly.
- Buyers may already have QMS tools such as MasterControl, ETQ, TrackWise, Greenlight Guru, Arena, or Qualio.

The product should avoid positioning itself as a QMS replacement. A better framing:

> AI layer for CAPA investigation and evidence preparation, working alongside your existing QMS.

## Difference From A Generic QMS

A QMS stores records and manages formal workflows.

An AI CAPA assistant would sit before and around the official record:

- Gather messy evidence.
- Draft structured fields.
- Find related history.
- Flag missing support.
- Prepare evidence packets.
- Help write customer-facing and audit-facing narratives.
- Keep the investigation memory clean.

The value is not:

> We store CAPAs.

The value is:

> We reduce the painful investigation and documentation work required to close a defensible CAPA.

## Validation Questions

The next validation step should be workflow discovery, not product building.

Questions to ask Quality Engineers, Supplier Quality Engineers, and Quality Managers:

- Show me the last CAPA or SCAR you closed.
- What triggered it?
- What inputs did you use to complete it?
- Where did the evidence live?
- Which parts were copy/paste, judgment, chasing, or reconstruction?
- What part was most painful or risky?
- How long did it take from opening to closure?
- What usually delays closure?
- What makes a CAPA get rejected by quality, customers, or auditors?
- Do you search prior CAPAs when investigating a new issue?
- What patterns are hard to spot across CAPAs?
- What do you currently use: QMS, Excel, email, SharePoint, ERP, MES, Teams?
- Would a draft CAPA with evidence links save time, or would review burden erase the benefit?
- What would you never trust AI to do in this workflow?
- What output would you reuse next week?

The strongest validation signal would be a user handing over a recent complaint, nonconformance, or SCAR packet and asking for a draft CAPA, timeline, evidence checklist, or customer response they can use immediately.
