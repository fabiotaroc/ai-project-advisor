# Druso Feedback

Date: 2026-05-13

## Context

These notes summarize and extrapolate feedback from Druso about the current AI Project Advisor direction. The feedback challenges the breadth of the current target user and pushes the product toward a narrower vertical with standardized workflows, cleaner memory formation, and more deterministic value.

## Core Critique

The current target user, broadly framed as product managers or PM-like project managers, is too wide. Their workflows vary too much across companies, projects, teams, and seniority levels. If the product tries to support that whole surface area, complexity will grow quickly and hallucinations or weak memory updates will compound over time.

The risk is not only that the product gives a bad answer once. The deeper risk is that noisy inputs become noisy durable memory. In project work, not every meeting matters, not every stakeholder comment should become official context, and not every piece of evidence deserves the same weight. A good manager actively filters, rationalizes, and cleans decisions. If the system cannot distinguish signal from noise, memory gets dirtier over time instead of more valuable.

## Why The Current Local Workflow Works

The current repo-based workflow works for Taro because he understands the project, the structure, the context, and how to customize or correct the system. That creates a false sense of product fit.

For a normal user, the same workflow may break down because they do not know how to organize the context, prune the memory, correct mistakes, or decide what the agent should care about. If the product hides that complexity too much, it risks making memory formation easy but dirty. If it exposes the complexity, it becomes too hard for non-technical users.

This creates a hard product tension:

- Making the system powerful may require expert setup and judgment.
- Making the system simple may produce generic summaries and noisy memory.
- Without a well-defined workflow, the product cannot reliably self-correct.

## Need For A Narrower Vertical

The product should focus on a target persona with a well-defined, repeatable workflow that the application can standardize, accelerate, and partially self-heal.

The comparison point is Legora: legal workflows often contain standardized, tabular, reviewable processes. The workflow gives the AI a stronger shape. It is easier to know what good output looks like, what fields matter, what evidence is relevant, and how to detect mistakes.

By contrast, a generic product manager or consulting project manager can work across many different project types. Their workflows are often not standardized enough for a weak memory system to maintain clean context over time.

The key question should become:

> Which vertical has recurring workflows where messy evidence must become a standardized, reviewable artifact?

## Memory Needs A Schema

The strongest implication is that durable AI memory should not start as an open-ended wiki. It should start around a stable schema or repeated artifact.

Good early workflows likely have:

- Repeated inputs, such as meetings, emails, tickets, spreadsheets, documents, or transcripts.
- A recognizable output format, such as a table, tracker, status report, compliance matrix, account brief, or decision log.
- Clear criteria for what counts as correct, missing, stale, risky, or irrelevant.
- A user who already performs the workflow manually and can judge the output quickly.

In this framing, memory is useful because it supports a repeated business output. The output creates the value; the memory is the mechanism.

## Avoid Optimizing The Wrong Output

The product should not over-optimize a local maximum. For example, creating the best possible PowerPoint deck may not matter if PowerPoint is not the ideal output for the user's real job.

The right question is not:

> How do we make the product generate better documents, slides, or markdown?

The better question is:

> What user problem is painful enough that the output format should follow from it?

The product may eventually produce markdown, tables, slides, documents, dashboards, or emails. But the first principle should be solving a real workflow problem, not perfecting a preferred software artifact.

## Table-First Possibility

A user-facing table may be more valuable than markdown for many real workflows.

Markdown is flexible and founder-friendly, but many business workflows are structured around tables: trackers, matrices, status grids, risk logs, action lists, stakeholder maps, campaign reports, implementation plans, and issue registers. Tables make it easier for users to scan, correct, approve, and compare changes over time.

This suggests the product should explore structured, table-like memory surfaces where appropriate, not only narrative project briefs.

## Strategic Direction

The product should focus less on building a general AI project advisor and more on finding one painful, repeated workflow where project evidence needs to become a trusted artifact.

Possible stronger wedge patterns:

- Messy inputs to a recurring client status update.
- Meeting notes and emails to a decision/action/risk tracker.
- Campaign materials and performance exports to a structured learning report.
- Implementation calls and customer emails to an onboarding tracker.
- RFP documents and prior materials to a compliance matrix.
- Account history and support signals to a QBR or renewal brief.

The common pattern is:

> Messy evidence -> structured memory -> trusted recurring artifact.

## Practical Validation Assignment

The next validation step should not be another broad product build. It should be a workflow discovery exercise inside a real environment such as Alkemy.

Recommended assignment:

1. Sit with several colleagues who own recurring coordination, reporting, or delivery workflows.
2. Ask them to show the last artifact they manually produced.
3. Identify the messy inputs they used to produce it.
4. Find the part that is repetitive, risky, annoying, or easy to get wrong.
5. Recreate that artifact from the messy inputs using the current system or a manual prototype.
6. Put the output in front of the user and ask whether they would use it again next week.

The goal is to find the painful recurring artifact before optimizing the product interface.

## Product Implication

The current "living project brief" direction may still be useful, but it should be tested against a sharper standard:

- Does the target user have a repeated workflow?
- Is there a stable output format?
- Can the system tell signal from noise?
- Can the user easily approve, reject, or correct memory?
- Does memory improve the next output rather than merely accumulate?
- Would the user use this again on the next cycle of the same workflow?

If the answer is no, the product should narrow further before adding more workspace features.
