# Frontend Refinement, Security Hardening & Human Workflow Roadmap
## Syllabus Compliance Monitoring System (SCMS) — PUP Quezon City Campus

**Target Audience:** Academic Head, Faculty Staff, Capstone Evaluation Panel  
**Document Status:** Comprehensive Blueprint for Review (Pre-Implementation)  
**Date:** November 2026

---

## Executive Summary
This document outlines the systematic transformation of SCMS from a feature-complete developer prototype into an **institutional, human-centered, and enterprise-grade university portal**. 

Based on the full-screen visual audit across all pages, this roadmap targets:
1. **Security Vulnerability Eradication (Information Disclosure / OWASP CWE-200)**: Removing internal database schemas, physical table names, and raw UUIDs from the UI.
2. **Elimination of Developer Testbenches**: Deleting the simulated `/fms-sync` and `/ccms-feed` simulator pages in favor of seamless background machine-to-machine services.
3. **Interactive & Human-Friendly Table Redesign**: Adding row hover states, search/filter bars, batch approvals, quick-preview drawers, and zero-state empty views.
4. **Mandatory Confirmation Modals across all CRUD Operations**: Preventing accidental destruction or unintended lifecycle transitions.
5. **Authentic Institutional Branding**: Standardizing on **PUP Quezon City (PUPQC)** and purging all internal user story tags (`SMS-021`, `SMS-004`, `AC1`, etc.).

---

## 1. Security Hardening & Information Disclosure Fixes (OWASP CWE-200)

| Page / Component | Exposed Vulnerability | Security Risk | Human-Friendly Institutional Replacement |
| :--- | :--- | :--- | :--- |
| **Global Sidebar Header** | Displays *"PUP Caloocan SCMS"* | Campus confusion; institutional discrepancy | **"PUP Quezon City Campus"** (PUPQC) |
| **Login Screen (`/login`)** | Subtitle: *"POLYTECHNIC UNIVERSITY OF THE PHILIPPINES - CALOOCAN CAMPUS"* | Campus mismatch across initial landing page | **"QUEZON CITY CAMPUS"** (PUPQC) |
| **Login Screen (`/login`)** | Displays *"Sprint 1 Demo Accounts (Argon2id Encrypted)"* | Leaks internal sprint numbers and algorithm names on public login card | Replace with clean institutional collapsible pill or *"Authorized Institutional Portals"* |
| **Login Screen (`/login`)** | Missing PUP QC AAIP Clerk Shared SSO button | Fails to visually highlight the Tri-System shared authentication bridge | Add primary button: **"Sign In with PUP QC AAIP SSO"** with local Argon2id as fallback |

| **Review Queue (`/reviews`)** | Subtitle: *"stored in PostgreSQL (sms_submissions)"* | **High (CWE-200):** Reveals internal database engine and physical schema name | *"Evaluate, approve, or return syllabus submissions under the PUPQC OBTL framework."* |
| **Review Queue (`/reviews`)** | Table column `SUBMISSION UUID`: displays `27402b81...3ec1` | Leaks internal primary keys and database sequence schemes | Replace with clean **Reference No.** (`REF-2026-001`) or remove column and use **Course Code & Section** as primary identifier |
| **Review Queue (`/reviews`)** | Table column `FACULTY ID`: displays `22222222-2222-2222-222222222222` | Leaks internal database foreign key; unusable for human deans | Display **Faculty Full Name** (e.g., `Prof. Juan Donayre`) with department pill (`IT Dept`) |
| **Live Compliance (`/live-compliance`)** | Live badge: *"Live Sync Active (PostgreSQL sms_submissions)"* | Leaks database table name | Green pulsing dot with clean text: **"Live Sync Active"** |
| **Live Compliance (`/live-compliance`)** | Table subtitle: *"Fetched directly from PostgreSQL /api/v1/submissions"* | Leaks internal REST endpoint and database technology | *"Official term compliance roster for accredited campus programs"* |
| **Audit Trail (`/audit-trail`)** | Header badge: *"SCMS-015 Immutable Log Viewer"* | Leaks internal backlog sprint story code | **"Tamper-Evident Security Log"** |
| **All Page Headers & Modals** | Tags like `(SMS-021)`, `(SMS-022) SSOT`, `(SMS-031)`, `(SMS-021 AC1)` | Makes the UI look like an unfinished AI prototype | Clean academic titles (*"Academic Degree Programs"*, *"Curriculum Course Master"*, *"Cohort Block Sections"*) |
| **Requirements Page (`/requirements`)** | Faculty Staff sees `"Close"` button on deadline card | **Critical RBAC Flaw:** Faculty should never have permission to close requirement deadlines | Replace `"Close"` button with **"Submit Syllabus"** (or hide if not Academic Head) |
| **Submission Evaluation (`/submissions/:id/review`)** | Faculty Staff sees `"Approve (Complied)"` & `"Return for Revision"` buttons | **Critical RBAC Flaw:** Faculty member can approve their own syllabus submission | Hide review decision buttons for `FACULTY_STAFF`. Display read-only review status badge with reviewer feedback |
| **Submission Evaluation (`/submissions/:id/review`)** | Faculty Staff sees `"Configure"` on 4-Line Signatory Block | **RBAC Leak:** Only Academic Head can configure campus signatories | Hide `"Configure"` button for `FACULTY_STAFF` |
| **4-Line Signatory Block** | Box 1 shows `22222222-2222-2222-222222222222` | Leaks internal UUID into official university signatory block | Display instructor's official name: **`Prof. Juan Donayre`** |
| **Faculty Compliance View (`/live-compliance`)** | Displays *"0% Approved Syllabi Compliance Rate"* | **Steering Violation:** Violates Direct Compliance Model constraint (no arbitrary percentages) | Display direct status pill (**"Under Review"** / **"Approved"**) instead of 0% calculation |


---

## 2. Removing Simulated FMS & CCMS Testbench Pages

> [!IMPORTANT]
> **Architectural Realignment:**
> In a production university system, **FMS (Faculty Management System)** and **CCMS (Citizen's Charter Compliance System)** are external backend integrations running through machine-to-machine (M2M) APIs and automated webhooks. An Academic Head or Professor should never see simulator buttons like *"Trigger Webhook"* or *"Simulate Outage"*.

### Actions Planned:
1. **Remove from Sidebar Navigation:**
   * Remove `FMS Profile Lookup` (`/fms-sync`).
   * Remove `CCMS Status Summary` (`/ccms-feed`).
2. **Move Integration Data to Where Humans Actually Need It:**
   * **FMS Teaching Assignments & Profiles:** Automatically populated directly into the **Review Queue**, **Cohort Block Sections**, and **Faculty Submission Form**.
   * **CCMS Academic Calendar:** Holidays and suspensions automatically adjust deadlines on the **Program Requirements & Deadlines** page (`/requirements`) without needing a standalone simulator.
   * **CCMS Outbound Compliance Feed:** Runs in the background on weekly automated schedules and on Academic Head approval milestones.

---

## 3. Mandatory CRUD Confirmations & Protective Workflows

Every create, update, delete, or lifecycle transition must feature an interactive confirmation dialog with clear context and a reminder of previous values:

```
┌────────────────────────────────────────────────────────┐
│ ⚠ Confirm Action: Phase Out Academic Program           │
├────────────────────────────────────────────────────────┤
│ Are you sure you want to phase out BSIT?               │
│                                                        │
│ • Existing active cohorts will remain accessible.      │
│ • No new submission requirements can be scheduled.     │
│                                                        │
│ [ Cancel ]                       [ Confirm Phase Out ] │
└────────────────────────────────────────────────────────┘
```

### Confirmation Matrix per Screen:

| Screen | Action Button | Confirmation Dialog Content & Safety Reminder |
| :--- | :--- | :--- |
| **Academic Programs (`/programs`)** | `Phase out` | **Title:** *"Phase Out Academic Program?"*<br>**Body:** *"Are you sure you want to phase out {Program Code}? Active enrolled cohorts will finish their curricula, but no new term requirements can be defined."* |
| **Academic Programs (`/programs`)** | `Reactivate` | **Title:** *"Reactivate Academic Program?"*<br>**Body:** *"Reactivating {Program Code} will make it eligible for new term syllabus requirement definitions."* |
| **Course Master (`/courses`)** | `Retire` | **Title:** *"Retire Course from Master Catalog?"*<br>**Body:** *"Retiring {Course Code} preserves all historical syllabi for AACCUP QA audits, but FMS will no longer be able to assign instructors to this course."* |
| **Course Master (`/courses`)** | `Revise` | **Title:** *"Create New Course Version?"*<br>**Body:** *"This will increment {Course Code} to v2. Current syllabus submissions will remain valid under v1 until v2 is officially published."* |
| **Cohort Block Sections (`/block-sections`)** | `Dissolve Section` | **Title:** *"Dissolve Block Section?"*<br>**Body:** *"Dissolving {Section Label} cancels active teaching loads and cleanly transitions assigned syllabi to 'Unassigned' status without faculty penalty."* |
| **Requirements (`/requirements`)** | `Close Deadline` | **Title:** *"Close Requirement Submissions?"*<br>**Body:** *"Closing this requirement locks submissions. Any faculty who has not submitted will be finalized as 'Overdue'."* |
| **Review Queue (`/reviews`)** | `Approve Syllabus` | **Title:** *"Approve Course Syllabus?"*<br>**Body:** *"Approve syllabus for {Course Code} ({Section Label})? This records your approval in the immutable audit trail."* |
| **Review Queue (`/reviews`)** | `Return for Revision` | **Title:** *"Return Syllabus for Mandatory Revision"*<br>**Body:** Requires a mandatory text area for feedback: *"Please specify the revisions required before notifying the instructor."* |
| **Submit Syllabus (`/submit`)** | `Confirm & Submit` | **Title:** *"Confirm Syllabus Submission?"*<br>**Body:** *"Submit {File Name} for {Course Code} ({Section Label}) for A.Y. 2026-2027 First Semester? Once submitted, your syllabus status will transition to 'Submitted' and notify the Academic Head."* |


---

## 4. Interactive Table Redesign (Per Page)

To ensure the tables feel responsive, modern, and human-friendly:

### 1. Unified Interactive Table Features:
* **Row Hover & Highlight:** Smooth background highlight (`hover:bg-amber-50/40`) on hovered rows with cursor pointer.
* **Instant Text Search:** Fast search bar filtering by Course Code, Section, or Faculty Name across all pages.
* **Status Filter Tabs / Dropdown:** Clean segmented chips for active filter states (`All`, `Under Review`, `Approved`, `Overdue`).
* **Empty State Illustrations:** When a filter has 0 records, replace blank space with an illustrated icon, descriptive title (*"No Submissions Match Filter"*), and a quick reset button.
* **Sortable Column Headers:** Clickable column headers (Course Code, Date, Status) with chevron sort indicators (`▲`/`▼`).

### 2. Review Queue Quick-Preview Drawer:
* Instead of navigating away to a new page, clicking **"Inspect / Review"** opens a **Right-Side Slide-Over Drawer**:
  * Top bar: Course Title, Section, Instructor Name, Status Badge.
  * PDF Viewer: Embedded scrollable syllabus preview.
  * Bottom action panel: Approval button, Rejection feedback box, and Signatory history.

---

## 5. Justification of the Two User Roles

To ensure the defense panel sees genuine institutional utility:

### 1. Academic Head (The Campus Reviewer & Accreditation Authority)
* **Institutional Justification:** PUPQC operates with a centralized Academic Head who validates syllabus compliance against CHED Memorandum Orders and university OBTL standards.
* **Value-Adding Features:**
  * **Batch Approvals:** Approve standard identical general education syllabi across multiple sections with 1 click.
  * **Pre-Saved / Canned Feedback:** Fast dropdown of common feedback notes (*"Missing 2026 Textbook References"*, *"Course outcomes do not match Bloom's taxonomy"*).
  * **Accreditation Export:** One-click PDF/CSV export formatted with official PUPQC signatory blocks for CHED/AACCUP inspectors.

### 2. Faculty Staff (The Syllabus Author & Course Instructor)
* **Institutional Justification:** Professors are focused on teaching; software must reduce their administrative overhead.
* **Value-Adding Features:**
  * **Adopt Previous Term Syllabus:** One-click cloning of their previously approved syllabus when assigned to teach the same course again.
  * **Clear Compliance Status & Feedback Alert:** Instant notification with reviewer comments if returned for revision.
  * **Automatic Calendar Awareness:** Live countdown reflecting statutory extensions granted due to typhoon suspensions or campus holidays.

---

## 6. Recommended Implementation Phases

```
┌─────────────────────────────────────────────────────────────┐
│ Phase 1: Security Hardening & Information Scrubbing         │
│ • Remove database schemas (PostgreSQL / sms_submissions)    │
│ • Replace raw UUIDs with human-friendly reference labels    │
│ • Standardize branding to PUP Quezon City (PUPQC)           │
│ • Strip all (SMS-xxx) backlog engineering tags              │
├─────────────────────────────────────────────────────────────┤
│ Phase 2: Navigation & Debug Screen Cleanup                  │
│ • Remove /fms-sync and /ccms-feed from sidebar navigation   │
│ • Keep background sync and M2M integrations seamless        │
├─────────────────────────────────────────────────────────────┤
│ Phase 3: Interactive Table Enhancements & Slide-Over Drawer │
│ • Add row hover, sortable columns, and search filters       │
│ • Implement slide-over review drawer on /reviews            │
├─────────────────────────────────────────────────────────────┤
│ Phase 4: Confirmation Dialogs on all CRUD Actions           │
│ • Add double-check modal on Phase Out, Retire, Dissolve,    │
│   Close Deadline, and Syllabus Decisions                    │
└─────────────────────────────────────────────────────────────┘
```

