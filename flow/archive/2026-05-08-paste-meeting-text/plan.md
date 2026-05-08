# Paste Meeting Text - Implementation Plan

**Goal:** Let users import a meeting by pasting transcript or notes text directly.
**Proposal:** `flow/changes/paste-meeting-text/proposal.md`
**Delta spec(s):**
- `flow/changes/paste-meeting-text/spec.md`

---

## 1. Meeting Import UI

### 1.1 Add Paste Option

**Files:**
- Modify: `src/components/sources/source-add-dialog.tsx`
- Modify: `src/components/sources/sources-panel.tsx`

- [x] Add a meetings-only import mode that presents file upload and pasted text as peer options.
- [x] Keep non-meeting source dialogs on the existing file-upload-only flow.
- [x] Run: `npm run lint` -> PASS

### 1.2 Validate Pasted Meeting Input

**Files:**
- Modify: `src/components/sources/source-add-dialog.tsx`

- [x] Add title and transcript/notes fields for pasted meetings.
- [x] Disable submission until both title and pasted text are non-empty after trimming.
- [x] Run: `npm run lint` -> PASS

## 2. Ingestion Reuse

### 2.1 Submit Pasted Text Through Existing Meeting Ingestion

**Files:**
- Modify: `src/components/sources/source-add-dialog.tsx`

- [x] Convert pasted content to a text file payload and submit it with the meeting category.
- [x] Reuse the existing upload status, success, and failure handling patterns.
- [x] Run: `npm run lint` -> PASS

## 3. Specflow Verification

### 3.1 Cross-check Against Delta Spec

**Files:**
- Read: `flow/changes/paste-meeting-text/spec.md`

- [x] Confirm pasted meeting import is present in the meeting import dialog.
- [x] Confirm required pasted title and text are enforced before submission.
- [x] Confirm upload-file behavior remains available and unchanged for meetings.
- [x] Confirm pasted imports remain out of scope for files, emails, and notes.
