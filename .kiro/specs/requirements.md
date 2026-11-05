# Spec-Driven Development (SDD) Phase 1: Requirements Specification
## Syllabus Compliance Monitoring System (SCMS)

**Standard:** EARS (Easy Approach to Requirements Syntax)  
**Campus:** Polytechnic University of the Philippines Quezon City Campus (PUPQC)  
**Traceability:** Mapped to 24 Product Backlog User Stories (`SCMS-001` to `SCMS-025`, harmonizing institutional backlog `AUD-001` to `AUD-025`) across Sprints 1 to 8

---

### 1. Ubiquitous Requirements (System-Wide)
* **REQ-SYS-01 [SCMS-003 / AUD-003]:** THE SYSTEM SHALL execute all user actions, document views, and external queries under the constraints of Republic Act 10173 (Philippine Data Privacy Act of 2012).
* **REQ-SYS-02 [SCMS-014 / AUD-019]:** THE SYSTEM SHALL record every requirement change, submission action, review decision, status change, and resubmission in an immutable, append-only audit trail capturing who acted, what was done, and the exact timestamp.
* **REQ-SYS-03 [SCMS-001 / AUD-001]:** THE SYSTEM SHALL integrate with the PUP QC AAIP Clerk Shared SSO for authentication via OIDC under an Invite-Only policy (unregistered users rejected with HTTP 403 Forbidden), while maintaining a Local Argon2id authentication emergency fallback to guarantee zero downtime.
* **REQ-SYS-04 [SCMS-013 / AUD-014]:** THE SYSTEM SHALL reflect all submission actions and review decisions immediately in the live compliance view without requiring a manual page refresh.
* **REQ-SYS-05 [SCMS-009 / AUD-010]:** THE SYSTEM SHALL define compliance directly by the submission status itself (`Not Submitted`, `Submitted`, `Under Review`, `Returned`, `Resubmitted`, `Approved`, `Overdue`), and SHALL NOT compute an unverified numerical compliance score without formal stakeholder definition.
* **REQ-SYS-06 [SSOT Architecture]:** THE SYSTEM SHALL maintain authoritative Single Source of Truth (SSOT) ownership over Academic Programs, Curriculum Versions, Courses (credit units, lecture/lab hours, facility tags), Academic Terms, and Stable Block Sections (`block_sections`). FMS SHALL consume these entities by ID and revision without creating competing local master records.

---

### 2. Module A: Identity & Roles (Two Roles Only)
* **REQ-AUTH-01A [SCMS-001 AC1 / AUD-001]:** WHEN a user signs in, THE SYSTEM SHALL authenticate the user via the PUP QC AAIP Clerk Shared SSO (or the emergency Local Argon2id fallback if Clerk is offline/unconfigured), and SHALL NEVER store passwords in plain text.
* **REQ-AUTH-01B [SCMS-001 AC2 / AUD-001]:** IF a user submits invalid credentials, THEN THE SYSTEM SHALL reject the login attempt with a clear error message that does not reveal which field was incorrect, and SHALL NOT create a session.
* **REQ-AUTH-01C [SCMS-001 AC3 / AUD-001]:** THE SYSTEM SHALL manage role authorization strictly within SCMS; while Clerk provides shared authentication across the campus ecosystem, SMS enforces an Invite-Only policy. Unregistered Clerk users are rejected with HTTP 403 Forbidden, and authorized users must already exist in the local PostgreSQL database mapped strictly to the two authorized roles (`Academic Head` and `Faculty Staff`). Auto-JIT user creation is strictly prohibited.
* **REQ-AUTH-02A [SCMS-002 AC1 / AUD-002]:** ON EVERY incoming request, THE SYSTEM SHALL identify the caller's role as either `Academic Head` or `Faculty Staff`; IF the session token is missing, expired, or invalid, THEN THE SYSTEM SHALL return HTTP 401 Unauthorized; no other roles SHALL exist.
* **REQ-AUTH-02B [SCMS-002 AC2 / AUD-002]:** ON READ endpoints, THE SYSTEM SHALL restrict Faculty Staff to view only their own assigned courses and submissions, and SHALL grant the Academic Head access to view all campus requirements, submissions, the live compliance view, and the audit trail.
* **REQ-AUTH-02C [SCMS-002 AC3 / AUD-002]:** IF a user attempts to invoke a write endpoint not permitted for their role, THEN THE SYSTEM SHALL reject the request with HTTP 403 Forbidden, persist no data changes, and return a descriptive user-facing error message.
* **REQ-PRIV-01 [SCMS-003 AC1 / AUD-003]:** THE SYSTEM SHALL limit faculty fields read, stored, and displayed strictly to the minimal agreed identity attributes (`faculty_id`, `display_name`, `institutional_email`, and conditional `academic_rank`, `consultation_hours`), compliant with Republic Act 10173 (Data Privacy Act of 2012). Salary, personal mobile numbers, home addresses, and HR evaluations are strictly excluded.
* **REQ-PRIV-02 [SCMS-003 AC2 / AUD-003]:** THE SYSTEM SHALL restrict access to a faculty member's uploaded syllabus documents strictly to that faculty member and the Academic Head, prohibiting access by any other user.
* **REQ-AUTH-04 [SCMS-016 / AUD-021]:** WHEN an authenticated faculty member accesses the system or profile lookups occur, THE SYSTEM SHALL execute a read-only profile lookup against FMS to resolve their verified `display_name`, `institutional_email`, and conditional consultation metadata. Identity linking SHALL bind to immutable `fms_faculty_id` so email changes never sever historical records.
* **REQ-AUTH-05 [SCMS-017 / AUD-022]:** WHEN a human-approved Teaching Assignment is received from FMS (`teaching_assignment.approved`), THE SYSTEM SHALL validate that it references valid SMS-owned `course_id`, `academic_term_id`, and `block_section_id`, and immediately provision a syllabus compliance tracking ticket (`NOT_SUBMITTED`) before timetable finalization. WHEN `teaching_assignment.schedule_finalized` arrives, THE SYSTEM SHALL update timetable/room details without duplicating items or resetting deadlines.

---

### 3. Module B: Requirements, Deadlines & Notifications
* **REQ-REQ-01A [SCMS-004 AC1 / AUD-004]:** WHEN the Academic Head defines a requirement, THE SYSTEM SHALL allow requirements to be created per program and per term, each with a name and description.
* **REQ-REQ-01B [SCMS-004 AC2 / AUD-004]:** WHILE a requirement is in `DRAFT` status, THE SYSTEM SHALL allow the Academic Head to edit its details, and the saved changes SHALL appear immediately.
* **REQ-REQ-01C [SCMS-004 AC3 / AUD-004]:** IF a Faculty Staff member attempts to create or edit a requirement, THEN THE SYSTEM SHALL reject the request with HTTP 403 Forbidden.
* **REQ-REQ-03A [SCMS-005 AC1 / AUD-005]:** IF the Academic Head attempts to publish a requirement without a deadline for the term, THEN THE SYSTEM SHALL reject the publication action.
* **REQ-REQ-03B [SCMS-005 AC2 / AUD-005]:** THE SYSTEM SHALL hide draft requirements from Faculty Staff views, display published requirements as visible, and mark closed requirements as closed.
* **REQ-REQ-03C [SCMS-005 AC3 / AUD-005]:** WHEN a requirement's deadline is modified, THE SYSTEM SHALL record the deadline change (previous value, new value, actor, timestamp) in the audit trail.
* **REQ-REQ-02 [SCMS-018 / AUD-023]:** WHEN official term calendar synchronization is initiated with CCMS, THE SYSTEM SHALL ingest official semester start/end dates, statutory holidays, and intraday class suspensions (Asia/Manila timezone). CCMS office working hours SHALL NOT overwrite academic class timetables.
* **REQ-REQ-04 [SCMS-005 AC2 / AUD-005]:** WHEN the Academic Head closes a published requirement, THE SYSTEM SHALL transition its status to `CLOSED` and block all new submissions.
* **REQ-NOTIF-01 [SCMS-025 / AUD-018]:** WHEN scheduled evaluation runs execute, THE SYSTEM SHALL trigger automated reminders for items that are due soon, returned for revision, approved, or overdue, routing notifications to the verified institutional email in the FMS profile and displaying in-app alerts.

---

### 4. Module C: Submission, Single-Level Review & Version History
* **REQ-SUB-01 [SCMS-007 / AUD-008]:** WHILE a Faculty Staff member views their portal, THE SYSTEM SHALL display the full checklist of required submissions for their assigned courses, indicating deadlines and current compliance status badges.
* **REQ-SUB-02 [SCMS-008 / AUD-009]:** WHEN a Faculty Staff member submits a syllabus for an assigned course (via uploaded PDF/DOCX or PUPQC OBE form), THE SYSTEM SHALL automatically record the submission timestamp, set the status to `SUBMITTED`, and broadcast the status change to the live compliance view.
* **REQ-REV-01 [SCMS-009 / AUD-010]:** WHEN the Academic Head opens a submission for review, THE SYSTEM SHALL update the status to `UNDER REVIEW` and record the transition.
* **REQ-REV-02 [SCMS-010 / AUD-011]:** WHEN the Academic Head accepts a submission, THE SYSTEM SHALL update the status to `APPROVED`, record the Academic Head's name and decision date, and broadcast the approved status to the live compliance view.
* **REQ-REV-03 [SCMS-010 / AUD-011]:** WHEN the Academic Head returns a submission for revision, THE SYSTEM SHALL require a feedback comment, update the status to `RETURNED`, record the feedback comments and date, and unlock the resubmission form for the faculty member.
* **REQ-RES-01 [SCMS-011 / AUD-012]:** WHEN a Faculty Staff member uploads a revised syllabus for a `RETURNED` item, THE SYSTEM SHALL update the status to `RESUBMITTED`, log the resubmission in the audit trail, and place the item back into the Academic Head's review queue.
* **REQ-SUB-03 [SCMS-021 / AUD-013]:** WHILE inspecting a submission with multiple revisions, THE SYSTEM SHALL retain every uploaded file and form draft version without overwriting, and SHALL provide a read-only version list (upload date, submitter, status) enabling side-by-side comparison of revisions.

---

### 5. Module D: Live Compliance Monitoring, Dashboard, Export & External Feeds
* **REQ-MON-01 [SCMS-006 / AUD-007]:** WHILE a submission status is NOT `APPROVED` and the current date/time exceeds the published requirement deadline, THE SYSTEM SHALL dynamically calculate its status as `OVERDUE` without manual updates or edit endpoints.
* **REQ-MON-02 [SCMS-012 / AUD-014]:** WHEN the live compliance matrix is active, THE SYSTEM SHALL display real-time status counts (`Not Submitted`, `Submitted`, `Under Review`, `Returned`, `Resubmitted`, `Approved`, `Overdue`) filterable by term, college, academic program, and faculty member.
* **REQ-MON-03 [SCMS-013 / AUD-014]:** WHEN any submission status change occurs, THE SYSTEM SHALL push real-time WebSocket events to update all connected compliance dashboard views instantly.
* **REQ-REP-01 [SCMS-022 / AUD-015]:** WHILE viewing the compliance dashboard, THE SYSTEM SHALL render summary counts and percentage distributions per status for the selected academic term, restricted to read-only access with no edit controls.
* **REQ-REP-02 [SCMS-023 / AUD-016]:** WHEN an authorized Academic Head user initiates an export, THE SYSTEM SHALL generate official monitoring summaries in PDF and CSV format applying the currently active term, program, and status filters, and SHALL record the export event (actor, timestamp, filters, format) in the immutable audit log.
* **REQ-MON-04 [SCMS-024 / AUD-017]:** THE SYSTEM SHALL reserve a dedicated data model field and UI badge placeholder for `compliance_level` in the monitoring view, and SHALL NOT calculate or display arbitrary numerical scores or percentage tiers until institutional stakeholders formally confirm definition, formula, and thresholds.
* **REQ-INT-01 [SCMS-019 / AUD-024]:** WHEN scheduled or triggered, THE SYSTEM SHALL compile and transmit an aggregate compliance status summary to CCMS using mutual machine token/HMAC so the CCMS dashboard displays academic compliance.
* **REQ-INT-02 [SCMS-020 / AUD-025]:** WHILE FMS or CCMS is unreachable, THE SYSTEM SHALL maintain continuous operation across 4 explicit cache states: (1) Warm Cache serving active cached profiles, (2) Expired Cache serving stale-while-revalidate data with `[CACHED SNAPSHOT - STALE]` amber banner, (3) Cold-Start / Empty Cache falling back to certified synthetic fixtures (`[FIXTURE DATA: FMS UNCONNECTED]`), and (4) Missing Field Fallback rendering default consultation hours (`"By appointment via MS Teams"`). Outage alone SHALL NOT cancel classes or disrupt syllabus authoring.
* **REQ-INT-03 [Joint Acceptance Gate J1–J16]:** THE SYSTEM SHALL satisfy and demonstrate compliance across all sixteen (16) Joint Acceptance Test Scenarios (J1 to J16) across two complete rehearsals prior to the final capstone defense.

---

### 6. Module E: Audit Trail Logging & Visibility
* **REQ-AUD-01A [SCMS-014 AC1 / AUD-019]:** WHEN any create, deadline change, submission, review decision, status change, or export occurs, THE SYSTEM SHALL record what was done, who acted, when, and the previous and new values in the audit log.
* **REQ-AUD-01B [SCMS-014 AC2 / AUD-019]:** THE SYSTEM SHALL reject any update or delete attempts on audit records at the database level by withholding update and delete permissions.
* **REQ-AUD-01C [SCMS-014 AC3 / AUD-019]:** THE SYSTEM SHALL provide one reusable logging function allowing submissions, decisions, resubmissions, and new action types to write to the same log without changing the log structure.
* **REQ-AUD-02 [SCMS-015 / AUD-020]:** WHILE accessing the audit trail view, THE SYSTEM SHALL allow the Academic Head to view all audit records filtered by date range, user, and action type, and SHALL prohibit any user from modifying or deleting audit records.

---

### 7. Explicit Out-of-Scope Boundaries
* **REQ-OOS-01:** THE SYSTEM SHALL NOT define, manage, or assign any user role other than the Academic Head and Faculty Staff (no Dean, Department Chair, or QA Staff roles; any QA views are read-only under Academic Head scoping).
* **REQ-OOS-02:** THE SYSTEM SHALL NOT restrict data access by college or unit, because a single Academic Head oversees all PUPQC campus academic programs.
* **REQ-OOS-03:** THE SYSTEM SHALL NOT compute arbitrary numerical compliance percentages or tiers without formal institutional stakeholder sign-off (a dedicated placeholder is reserved under REQ-MON-04).
* **REQ-OOS-04:** THE SYSTEM SHALL NOT handle faculty profile creation, HR contracts, workload calculations, student enrolment management, or class size tracking (enrolment management is removed from FMS contract; owned by Central SIS/Registrar).
* **REQ-OOS-05:** THE SYSTEM SHALL NOT manage term calendars or holiday dates directly (owned by CCMS).
* **REQ-OOS-06:** THE SYSTEM SHALL NOT perform automated AI grading or scoring of syllabus instructional contents.
* **REQ-OOS-07:** THE SYSTEM SHALL NOT provide public-facing or student-facing portals.
