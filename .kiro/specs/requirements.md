# Spec-Driven Development (SDD) Phase 1: Requirements Specification
## Syllabus Compliance Monitoring System (SCMS)

**Standard:** EARS (Easy Approach to Requirements Syntax)  
**Campus:** Polytechnic University of the Philippines Quezon City Campus (PUPQC)  
**Traceability:** Mapped to Product Backlog User Stories (`SCMS-001` to `SCMS-020`) across Sprints 1 to 8

---

### 1. Ubiquitous Requirements (System-Wide)
* **REQ-SYS-01 [SCMS-003]:** THE SYSTEM SHALL execute all user actions, document views, and external queries under the constraints of Republic Act 10173 (Philippine Data Privacy Act of 2012).
* **REQ-SYS-02 [SCMS-014]:** THE SYSTEM SHALL record every submission action, review decision, status change, and resubmission in an immutable audit trail capturing who acted, what was done, and the exact timestamp.
* **REQ-SYS-03 [SCMS-001]:** THE SYSTEM SHALL maintain its own local user accounts independently, without single sign-on (SSO) or shared user session tokens with external systems (FMS or CCMS).
* **REQ-SYS-04 [SCMS-013]:** THE SYSTEM SHALL reflect all submission actions and review decisions immediately in the live compliance view without requiring a manual page refresh.
* **REQ-SYS-05 [SCMS-009]:** THE SYSTEM SHALL define compliance directly by the submission status itself (`Not Submitted`, `Submitted`, `Under Review`, `Returned`, `Resubmitted`, `Approved`, `Overdue`), and SHALL NOT compute a separate numerical compliance score or level.

---

### 2. Module A: Identity & Roles (Two Roles Only)
* **REQ-AUTH-01A [SCMS-001 AC1] (Event-Driven):** WHEN a user signs in, THE SYSTEM SHALL authenticate the user using SCMS's own user accounts and Argon2id hash verification, and SHALL NEVER store passwords in plain text.
* **REQ-AUTH-01B [SCMS-001 AC2] (Unwanted Behavior):** IF a user submits invalid credentials, THEN THE SYSTEM SHALL reject the login attempt with a clear error message that does not reveal which field was incorrect, and SHALL NOT create a session.
* **REQ-AUTH-01C [SCMS-001 AC3] (Ubiquitous):** THE SYSTEM SHALL issue sessions independently within SCMS; signing in to CCMS or FMS SHALL NOT grant access to SCMS, and signing in to SCMS SHALL NOT grant access to CCMS or FMS.
* **REQ-AUTH-02A [SCMS-002 AC1] (State-Driven):** ON EVERY incoming request, THE SYSTEM SHALL identify the caller's role as either `Academic Head` or `Faculty Staff`; IF the session token is missing, expired, or invalid, THEN THE SYSTEM SHALL return HTTP 401 Unauthorized; no other roles SHALL exist.
* **REQ-AUTH-02B [SCMS-002 AC2] (State-Driven):** ON READ endpoints, THE SYSTEM SHALL restrict Faculty Staff to view only their own submissions, and SHALL grant the Academic Head access to view all requirements, all submissions, the live compliance view, and the audit trail.
* **REQ-AUTH-02C [SCMS-002 AC3] (Unwanted Behavior):** IF a user attempts to invoke a write endpoint not permitted for their role, THEN THE SYSTEM SHALL reject the request with HTTP 403 Forbidden, persist no data changes, and return a descriptive user-facing error message.
* **REQ-PRIV-01 [SCMS-003 AC1] (Ubiquitous):** THE SYSTEM SHALL limit faculty fields read, stored, and displayed strictly to necessary identity attributes (`name`, `college`, `unit`), reviewed against their use in compliance with Republic Act 10173.
* **REQ-PRIV-02 [SCMS-003 AC2] (State-Driven):** THE SYSTEM SHALL restrict access to a faculty member's uploaded syllabus documents strictly to that faculty member and the Academic Head, prohibiting access by any other user.
* **REQ-AUTH-04 [SCMS-016] (Event-Driven):** WHEN an authenticated faculty member accesses the system, THE SYSTEM SHALL execute a read-only profile lookup against FMS to resolve their official name, college, and unit so that identity data is not duplicated.
* **REQ-AUTH-05 [SCMS-017] (Event-Driven):** WHEN requirements are initialized, THE SYSTEM SHALL query FMS Subject Tagging to read which subjects each faculty member teaches so that required submissions are automatically generated.

---

### 3. Module B: Requirements & Per-Term Deadline Setup
* **REQ-REQ-01A [SCMS-004 AC1] (Event-Driven):** WHEN the Academic Head defines a requirement, THE SYSTEM SHALL allow requirements to be created per program and per term, each with a name and description.
* **REQ-REQ-01B [SCMS-004 AC2] (State-Driven):** WHILE a requirement is in `DRAFT` status, THE SYSTEM SHALL allow the Academic Head to edit its details, and the saved changes SHALL appear immediately.
* **REQ-REQ-01C [SCMS-004 AC3] (Unwanted Behavior):** IF a Faculty Staff member attempts to create or edit a requirement, THEN THE SYSTEM SHALL reject the request with HTTP 403 Forbidden.
* **REQ-REQ-03A [SCMS-005 AC1] (Unwanted Behavior):** IF the Academic Head attempts to publish a requirement without a deadline for the term, THEN THE SYSTEM SHALL reject the publication action.
* **REQ-REQ-03B [SCMS-005 AC2] (State-Driven):** THE SYSTEM SHALL hide draft requirements from Faculty Staff views, display published requirements as visible, and mark closed requirements as closed.
* **REQ-REQ-03C [SCMS-005 AC3] (Event-Driven):** WHEN a requirement's deadline is modified, THE SYSTEM SHALL record the deadline change (previous value, new value, actor, timestamp) in the audit trail.
* **REQ-REQ-02 [SCMS-018] (Event-Driven):** WHEN official term calendar synchronization is initiated with CCMS, THE SYSTEM SHALL read and update the official academic term dates and holidays so deadlines follow one official calendar.
* **REQ-REQ-04 [SCMS-005 AC2] (Event-Driven):** WHEN the Academic Head closes a published requirement, THE SYSTEM SHALL transition its status to `CLOSED` and mark it closed.

---

### 4. Module C: Submission & Single-Level Review Lifecycle
* **REQ-SUB-01 [SCMS-007] (State-Driven):** WHILE a Faculty Staff member views their portal, THE SYSTEM SHALL display the full list of required submissions for their taught subjects, indicating deadlines and current compliance statuses.
* **REQ-SUB-02 [SCMS-008] (Event-Driven):** WHEN a Faculty Staff member submits a syllabus for an assigned subject (as an uploaded file or structured form), THE SYSTEM SHALL automatically record the submission timestamp, set the status to `SUBMITTED`, and broadcast the status change to the live compliance view.
* **REQ-REV-01 [SCMS-009] (Event-Driven):** WHEN the Academic Head opens a submission for review, THE SYSTEM SHALL update the status to `UNDER REVIEW` and record the transition.
* **REQ-REV-02 [SCMS-010] (Event-Driven):** WHEN the Academic Head accepts a submission, THE SYSTEM SHALL update the status to `APPROVED`, record the Academic Head's name and decision date, and broadcast the approved status to the live compliance view.
* **REQ-REV-03 [SCMS-010] (Event-Driven):** WHEN the Academic Head returns a submission for revision, THE SYSTEM SHALL update the status to `RETURNED`, record the feedback comments and date, and unlock the resubmission form for the faculty member.
* **REQ-RES-01 [SCMS-011] (Event-Driven):** WHEN a Faculty Staff member uploads a revised syllabus for a `RETURNED` item, THE SYSTEM SHALL update the status to `RESUBMITTED`, log the resubmission in the audit trail, and place the item back into the Academic Head's review queue.

---

### 5. Module D: Live Compliance Monitoring & External Feeds
* **REQ-MON-01 [SCMS-006] (State-Driven):** WHILE a submission status is NOT `APPROVED` and the current date/time exceeds the published requirement deadline, THE SYSTEM SHALL dynamically calculate its status as `OVERDUE` without manual updates.
* **REQ-MON-02 [SCMS-012] (Event-Driven):** WHEN the live compliance dashboard is active, THE SYSTEM SHALL display real-time status counts (`Not Submitted`, `Submitted`, `Under Review`, `Returned`, `Resubmitted`, `Approved`, `Overdue`) grouped by term, program, and faculty member.
* **REQ-MON-03 [SCMS-013] (Event-Driven):** WHEN any submission status change occurs, THE SYSTEM SHALL push real-time WebSocket events to update all connected compliance dashboard views instantly.
* **REQ-INT-01 [SCMS-019] (Event-Driven):** WHEN scheduled or triggered, THE SYSTEM SHALL compile and transmit an aggregate compliance status summary to CCMS so the CCMS dashboard displays academic compliance.
* **REQ-INT-02 [SCMS-020] (State-Driven):** WHILE FMS or CCMS is unreachable, THE SYSTEM SHALL continue recording submissions and reviews using the last stored reference data, display an informational notice, and retry external links once connectivity is restored.

---

### 6. Module E: Audit Trail Logging & Visibility
* **REQ-AUD-01A [SCMS-014 AC1] (Event-Driven):** WHEN any create, deadline change, submission, review decision, or status-change action occurs, THE SYSTEM SHALL record what was done, who acted, when, and the previous and new values in the audit log.
* **REQ-AUD-01B [SCMS-014 AC2] (Ubiquitous):** THE SYSTEM SHALL reject any update or delete attempts on audit records at the database level by withholding update and delete permissions.
* **REQ-AUD-01C [SCMS-014 AC3] (Ubiquitous):** THE SYSTEM SHALL provide one reusable logging function allowing submissions, decisions, resubmissions, and new action types to write to the same log without changing the log structure.
* **REQ-AUD-02 [SCMS-015] (State-Driven):** WHILE accessing the audit trail view, THE SYSTEM SHALL allow the Academic Head to view all audit records, and SHALL prohibit any user from modifying or deleting audit records.

---

### 7. Explicit Out-of-Scope Boundaries
* **REQ-OOS-01:** THE SYSTEM SHALL NOT define, manage, or assign any user role other than the Academic Head and Faculty Staff (no Dean, Department Chair, or QA Staff roles).
* **REQ-OOS-02:** THE SYSTEM SHALL NOT restrict or filter data access by college or unit, because a single Academic Head oversees all campus academic programs.
* **REQ-OOS-03:** THE SYSTEM SHALL NOT generate or export compliance reports to PDF or CSV format for the current release.
* **REQ-OOS-04:** THE SYSTEM SHALL NOT maintain a multi-draft version history archive of past syllabus revisions; the current revised file replaces the active draft.
* **REQ-OOS-05:** THE SYSTEM SHALL NOT calculate separate compliance scores or percentage levels; compliance is strictly represented by the submission status itself.
* **REQ-OOS-06:** THE SYSTEM SHALL NOT handle faculty profile creation, editing, scheduling, attendance, or workload functions (owned by FMS).
* **REQ-OOS-07:** THE SYSTEM SHALL NOT manage term calendars or holiday dates directly (owned by CCMS).
* **REQ-OOS-08:** THE SYSTEM SHALL NOT perform automated AI grading or scoring of syllabus instructional contents.
* **REQ-OOS-09:** THE SYSTEM SHALL NOT provide public-facing or student-facing portals.
