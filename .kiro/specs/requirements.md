# Spec-Driven Development (SDD) Phase 1: Requirements Specification
## Syllabus Compliance Monitoring System (SCMS)

**Standard:** EARS (Easy Approach to Requirements Syntax)  
**Campus:** Polytechnic University of the Philippines Quezon City Campus (PUPQC)  
**Document Revision:** Rev. 6 (SCMS Streamlined Baseline)

---

### 1. Ubiquitous Requirements (System-Wide)
* **REQ-SYS-01:** THE SYSTEM SHALL execute all user actions, document views, and external queries under the constraints of Republic Act 10173 (Philippine Data Privacy Act of 2012).
* **REQ-SYS-02:** THE SYSTEM SHALL record every submission action, review decision, status change, and resubmission in an immutable audit trail capturing who acted, what was done, and the exact timestamp.
* **REQ-SYS-03:** THE SYSTEM SHALL maintain its own local user accounts independently, without single sign-on (SSO) or shared user session tokens with external systems (FMS or CCMS).
* **REQ-SYS-04:** THE SYSTEM SHALL reflect all submission actions and review decisions immediately in the live compliance view without requiring a manual page refresh.
* **REQ-SYS-05:** THE SYSTEM SHALL define compliance directly by the submission status itself (`Not Submitted`, `Submitted`, `Under Review`, `Returned`, `Resubmitted`, `Approved`, `Overdue`), and SHALL NOT compute a separate numerical compliance score or level.

---

### 2. Module A: Identity & Roles (Two Roles Only)
* **REQ-AUTH-01 (Event-Driven):** WHEN a user enters valid local credentials, THE SYSTEM SHALL authenticate the user, generate a secure HttpOnly session cookie, and enforce role-based access strictly as either `Academic Head` or `Faculty Staff`.
* **REQ-AUTH-02 (State-Driven):** WHILE a user holds the `Faculty Staff` role, THE SYSTEM SHALL restrict their access strictly to their own assigned subject requirements and submission records.
* **REQ-AUTH-03 (State-Driven):** WHILE the authenticated user is the single `Academic Head`, THE SYSTEM SHALL grant full access to view all academic program requirements, all faculty submissions, the live compliance view, and the audit trail.
* **REQ-AUTH-04 (Event-Driven):** WHEN an authenticated faculty member accesses the system, THE SYSTEM SHALL execute a read-only profile lookup against FMS to resolve their official name, college, and department.
* **REQ-AUTH-05 (State-Driven):** WHILE FMS is unreachable or unresponsive, THE SYSTEM SHALL fall back to the last cached profile in Redis/PostgreSQL and display a non-blocking informational notice.

---

### 3. Module B: Requirements & Per-Term Deadline Setup
* **REQ-REQ-01 (Event-Driven):** WHEN the Academic Head defines a term requirement, THE SYSTEM SHALL bind the requirement type, target academic program, and term deadline date to the active academic term.
* **REQ-REQ-02 (Event-Driven):** WHEN official term calendar synchronization is initiated with CCMS, THE SYSTEM SHALL read and update the official academic term dates and holidays.
* **REQ-REQ-03 (State-Driven):** WHILE a requirement is in `DRAFT` status, THE SYSTEM SHALL conceal it from Faculty Staff submission views until the Academic Head marks it as `PUBLISHED`.
* **REQ-REQ-04 (Event-Driven):** WHEN the Academic Head closes a requirement, THE SYSTEM SHALL transition its status to `CLOSED` and prevent new initial submissions.

---

### 4. Module C: Submission & Single-Level Review Lifecycle
* **REQ-SUB-01 (Event-Driven):** WHEN a Faculty Staff member submits a syllabus for an assigned subject (as an uploaded file or structured form), THE SYSTEM SHALL automatically record the submission timestamp, set the status to `SUBMITTED`, and broadcast the status change to the live compliance view.
* **REQ-REV-01 (Event-Driven):** WHEN the Academic Head opens a submission for review, THE SYSTEM SHALL update the status to `UNDER REVIEW` and record the transition.
* **REQ-REV-02 (Event-Driven):** WHEN the Academic Head accepts a submission, THE SYSTEM SHALL update the status to `APPROVED`, record the Academic Head's name and decision date, and broadcast the approved status to the live compliance view.
* **REQ-REV-03 (Event-Driven):** WHEN the Academic Head returns a submission for revision, THE SYSTEM SHALL update the status to `RETURNED`, record the feedback comments and date, and unlock the resubmission form for the faculty member.
* **REQ-RES-01 (Event-Driven):** WHEN a Faculty Staff member uploads a revised syllabus for a `RETURNED` item, THE SYSTEM SHALL update the status to `RESUBMITTED`, log the resubmission in the audit trail, and place the item back into the Academic Head's review queue.

---

### 5. Module D: Live Compliance Monitoring & External Feeds
* **REQ-MON-01 (State-Driven):** WHILE a submission status is NOT `APPROVED` and the current date/time exceeds the published requirement deadline, THE SYSTEM SHALL dynamically calculate its status as `OVERDUE` without manual updates.
* **REQ-MON-02 (Event-Driven):** WHEN the live compliance dashboard is active, THE SYSTEM SHALL display real-time status counts (`Not Submitted`, `Submitted`, `Under Review`, `Returned`, `Resubmitted`, `Approved`, `Overdue`) grouped by term, program, and faculty member.
* **REQ-MON-03 (Event-Driven):** WHEN any submission status change occurs, THE SYSTEM SHALL push real-time WebSocket events to update all connected compliance dashboard views instantly.
* **REQ-INT-01 (Event-Driven):** WHEN scheduled or triggered, THE SYSTEM SHALL compile and transmit an aggregate compliance status summary to CCMS for its consolidated dashboard.

---

### 6. Module E: Audit Trail Logging & Visibility
* **REQ-AUD-01 (Event-Driven):** WHEN any submission action occurs (creation, upload, status change, review decision, resubmission), THE SYSTEM SHALL immediately write an immutable audit entry containing actor identity, action type, description, and timestamp.
* **REQ-AUD-02 (State-Driven):** WHILE accessing the audit trail view, THE SYSTEM SHALL allow the Academic Head to view all audit records, and SHALL prohibit any user from modifying or deleting audit records.

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
