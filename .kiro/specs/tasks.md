# Spec-Driven Development (SDD) Phase 3: Task Execution Plan
## Syllabus Compliance Monitoring System (SCMS)

**Institution:** Polytechnic University of the Philippines – Quezon City Campus (PUPQC)  
**Total User Stories:** 24 User Stories (`AUD-001` through `AUD-025` mapped to `SCMS-001` through `SCMS-025`)  
**Total Story Points:** 86 Story Points  
**Cadence:** 8 Sprints  
**Status Baseline:** Sprint 1 Completed ✅ | Sprint 2 In Progress 🔄 | Sprints 3–8 Paused for Fundamental Multi-System Alignment ⏸️

---

## Sprint 1: Identity, Role Scoping & Data Privacy (10 Story Points)
*Module A: Identity and Roles*  
**Sprint Goal:** Establish SCMS's own sign-in, role-based access scoping for the Academic Head and Faculty Staff, and data privacy controls.

- **SCMS-001 (AUD-001): Local Sign-in & Authentication (3 pts)** — *Assignee: Developers*
  - [x] **TASK-101.1 (Task 1)**: Build the sign-in page and an authentication service that uses SCMS's own user accounts, with passwords stored securely using Argon2id/Bcrypt.
    - *Acceptance Criteria (AC 1)*: Users sign in with their SCMS credentials; no password is stored in plain text.
  - [x] **TASK-101.2 (Task 2)**: Reject invalid credentials with a generic error message that does not reveal which field was wrong.
    - *Acceptance Criteria (AC 2)*: Invalid credentials are rejected and no session is created.
  - [x] **TASK-101.3 (Task 3)**: Issue sessions only from SCMS, with no single sign-on or shared session with CCMS or FMS.
    - *Acceptance Criteria (AC 3)*: Signing in to CCMS or FMS does not grant access to SCMS, and the reverse is also true.

- **SCMS-002 (AUD-002): Role-Based Access Scoping for Two Roles (5 pts)** — *Assignee: Developers*
  - [x] **TASK-102.1 (Task 1)**: Define the two roles (Academic Head and Faculty Staff) and attach the role to the session on every authenticated request.
    - *Acceptance Criteria (AC 1)*: The role is correctly identified on every request; a missing or invalid session returns 401; no other role exists.
  - [x] **TASK-102.2 (Task 2)**: Enforce role scoping on read endpoints: Faculty Staff see only their own assigned courses and submissions, and the Academic Head sees campus-wide requirements, submissions, compliance views, and the audit trail.
    - *Acceptance Criteria (AC 2)*: Each role sees only the data within its authorized scope (`WHERE faculty_id = current_user.id` for Faculty Staff).
  - [x] **TASK-102.3 (Task 3)**: Block write endpoints a role is not allowed to use and return 403, with a descriptive message on screen.
    - *Acceptance Criteria (AC 3)*: Unauthorized requests return 403, no data is changed, and the user sees a descriptive message.

- **SCMS-003 (AUD-003): Faculty Personal Data Privacy Controls (2 pts)** — *Assignee: Developers*
  - [x] **TASK-103.1 (Task 1)**: Limit the faculty fields SCMS reads, stores and displays to those needed (display name, college, department/unit, institutional email), compliant with RA 10173.
    - *Acceptance Criteria (AC 1)*: Only the required faculty fields are read and stored; private phone numbers and personal emails are excluded.
  - [x] **TASK-103.2 (Task 2)**: Restrict a faculty member's documents and syllabus submissions to that faculty member and the Academic Head.
    - *Acceptance Criteria (AC 2)*: No other user can open a faculty member's documents.

---

## Sprint 2: Requirement Definition & Term Deadlines (8 Story Points)
*Module B: Requirements and Deadlines*  
**Sprint Goal:** Implement requirement definition per program and term, deadlines with publish and close, and append-only audit trail logging baseline.

- **SCMS-004 (AUD-004): Requirement Definition per Program & Term (5 pts)** — *Assignee: Developers*
  - [/] **TASK-204.1 (Task 1)**: Build the requirements setup page where the Academic Head creates a requirement type with a name and description for a program and term.
    - *Acceptance Criteria (AC 1)*: Requirements can be created per program and per term, each with a name and description.
  - [/] **TASK-204.2 (Task 2)**: Allow draft requirements to be edited before they are published.
    - *Acceptance Criteria (AC 2)*: Draft requirements can be edited and the saved changes appear immediately.
  - [/] **TASK-204.3 (Task 3)**: Restrict creating and editing requirements to the Academic Head.
    - *Acceptance Criteria (AC 3)*: Faculty Staff cannot create or edit requirements; attempts return 403.

- **SCMS-005 (AUD-005): Term Deadlines, Publishing & Close Actions (3 pts)** — *Assignee: Developers*
  - [/] **TASK-205.1 (Task 1)**: Add a deadline field to each requirement and require it before the requirement can be published.
    - *Acceptance Criteria (AC 1)*: A requirement cannot be published without a deadline for the term.
  - [/] **TASK-205.2 (Task 2)**: Add Publish and Close actions; show Faculty Staff only published requirements and mark closed ones as closed.
    - *Acceptance Criteria (AC 2)*: Draft requirements are hidden from Faculty Staff; published requirements are visible; closed requirements are marked closed.
  - [/] **TASK-205.3 (Task 3)**: Record every deadline change (previous value, new value, actor, timestamp) through the audit logger.
    - *Acceptance Criteria (AC 3)*: Each deadline change appears in the audit trail with the actor and timestamp.

*(Note: Shared audit logging middleware and PostgreSQL table for SCMS-014 / AUD-019 pre-seeded during Sprint 2).*

---

## Sprint 3: Dynamic Overdue Calculation & Append-Only Action Logging (11 Story Points)
*Module B: Requirements and Deadlines + Module C: Submission and Review (Audit Trail)*  
**Sprint Goal:** Implement automatic overdue calculation, the faculty view of required submissions, and append-only action logging.

- **SCMS-006 (AUD-007): Server-Side Dynamic Overdue Calculation (3 pts)** — *Assignee: Developers*
  - [ ] **TASK-306.1 (Task 1)**: Implement a server-side overdue calculation that compares each requirement's deadline with the current date/time and submission status (`status != APPROVED && now > deadline`).
    - *Acceptance Criteria (AC 1)*: Overdue is calculated automatically from the deadline, with no manual input.
  - [ ] **TASK-306.2 (Task 2)**: Remove any manual overdue control from the UI and API.
    - *Acceptance Criteria (AC 2)*: No UI control or endpoint allows overdue to be manually set or edited.

- **SCMS-007 (AUD-008): Faculty Requirements Checklist & Status Badges (3 pts)** — *Assignee: Developers*
  - [ ] **TASK-307.1 (Task 1)**: Build the faculty requirements page listing published requirements for the courses they teach, with deadlines.
    - *Acceptance Criteria (AC 1)*: Faculty see the published requirements for their courses, with deadlines.
  - [ ] **TASK-307.2 (Task 2)**: Show each item's current status with a status badge.
    - *Acceptance Criteria (AC 2)*: Each item shows its current status with the signature status badge.

- **SCMS-014 (AUD-019): Append-Only Audit Trail Logging Middleware & Table (5 pts)** — *Assignee: Developers*
  - [x] **TASK-314.1 (Task 1)**: Implement audit logger middleware that records create, update, and status-change actions (action type, acting user, timestamp, previous and new value) to an append-only table.
    - *Acceptance Criteria (AC 1)*: Every logged action stores action type, actor, timestamp, previous and new values.
  - [x] **TASK-314.2 (Task 2)**: Enforce append-only at the database level by withholding update and delete permissions on the audit table.
    - *Acceptance Criteria (AC 2)*: Update and delete attempts on audit records are rejected at database level.
  - [x] **TASK-314.3 (Task 3)**: Provide one reusable logging call so submissions, decisions and resubmissions in later sprints write to the same log.
    - *Acceptance Criteria (AC 3)*: New action types can be logged without changing the log structure.

---

## Sprint 4: Syllabus Submission, Status Lifecycle & Audit Log Viewer (11 Story Points)
*Module C: Submission and Review + Module D: Monitoring and Reports*  
**Sprint Goal:** Implement syllabus submission, the submission status lifecycle, and read-only audit log viewing.

- **SCMS-008 (AUD-009): Syllabus Submission File/Form (5 pts)** — *Assignee: Developers*
  - [ ] **TASK-408.1 (Task 1)**: Build the submission interface where faculty upload a file (PDF/DOCX) or complete the PUPQC OBE syllabus form for each required course.
    - *Acceptance Criteria (AC 1)*: Faculty can upload a file or complete the form for each required course.
  - [ ] **TASK-408.2 (Task 2)**: Validate file type (PDF/DOCX), size (max 25MB), and required form fields before submission is accepted.
    - *Acceptance Criteria (AC 2)*: Invalid files and missing fields are rejected with a clear message.
  - [ ] **TASK-408.3 (Task 3)**: Record the submission timestamp server-side, set the status to Submitted, and block submissions to closed requirements.
    - *Acceptance Criteria (AC 3)*: The timestamp is recorded automatically, the status becomes Submitted, and closed requirements cannot receive submissions.

- **SCMS-009 (AUD-010): Submission Status Lifecycle Management (3 pts)** — *Assignee: Developers*
  - [ ] **TASK-409.1 (Task 1)**: Implement the status model with the six statuses (Not Submitted, Submitted, Under Review, Returned, Resubmitted, Approved) and allowed transitions.
    - *Acceptance Criteria (AC 1)*: Only the defined transitions are allowed; no status can be skipped.
  - [ ] **TASK-409.2 (Task 2)**: Record each status change with the acting user and a server-side timestamp, and write it to the audit log.
    - *Acceptance Criteria (AC 2)*: Every status change is timestamped, attributed to the acting user, and logged.

- **SCMS-015 (AUD-020): Read-Only Audit Log Viewer & Filter Scoping (3 pts)** — *Assignee: Developers*
  - [x] **TASK-415.1 (Task 1)**: Build the audit log viewer for the Academic Head, covering campus-wide academic operations, with filters by date, user, and action type.
    - *Acceptance Criteria (AC 1)*: Authorized users can view and filter the audit log within their scope.
  - [x] **TASK-415.2 (Task 2)**: Make the viewer read-only, with no edit or delete controls in UI and no update or delete endpoints in API.
    - *Acceptance Criteria (AC 2)*: No edit or delete control or endpoint exists for audit records.

---

## Sprint 5: Review Decisions, Resubmission Cycle & Version History (9 Story Points)
*Module C: Submission and Review*  
**Sprint Goal:** Implement review decisions, the revise and resubmit cycle, and version history of submissions.

- **SCMS-010 (AUD-011): Review Decisions Approve or Return (3 pts)** — *Assignee: Developers*
  - [ ] **TASK-510.1 (Task 1)**: Build the review screen where a reviewer opens a submission, which moves it to Under Review, and chooses Approve or Return.
    - *Acceptance Criteria (AC 1)*: Reviewers can approve or return a submission that is Under Review.
  - [ ] **TASK-510.2 (Task 2)**: Record the reviewer's name, the date and the comment on each decision.
    - *Acceptance Criteria (AC 2)*: Each decision stores the reviewer, date, and comment.
  - [ ] **TASK-510.3 (Task 3)**: Require a comment before a submission can be returned.
    - *Acceptance Criteria (AC 3)*: A return cannot be saved without an explanatory comment.

- **SCMS-011 (AUD-012): Revise and Resubmit Feedback Cycle (3 pts)** — *Assignee: Developers*
  - [ ] **TASK-511.1 (Task 1)**: Show the reviewer's comment on returned submissions in the faculty view.
    - *Acceptance Criteria (AC 1)*: A returned submission shows the reviewer's comment to the faculty member.
  - [ ] **TASK-511.2 (Task 2)**: Add Upload Revised Version and Resubmit actions that set the status to Resubmitted and send the item back to the review queue.
    - *Acceptance Criteria (AC 2)*: Faculty can upload a revised version and resubmit; the status becomes Resubmitted.
  - [ ] **TASK-511.3 (Task 3)**: Allow the cycle to repeat until the submission is Approved, and log each resubmission in the audit trail.
    - *Acceptance Criteria (AC 3)*: Review repeats until the submission is Approved, and each resubmission is logged.

- **SCMS-021 (AUD-013): Multi-Version History & Revision Comparison (3 pts)** — *Assignee: Developers*
  - [ ] **TASK-521.1 (Task 1)**: Save each resubmission as an immutable new version (`v1`, `v2`, etc.) and keep all earlier versions in storage without overwrite.
    - *Acceptance Criteria (AC 1)*: Earlier versions stay available after every resubmission.
  - [ ] **TASK-521.2 (Task 2)**: Build a read-only version list showing the date, submitter, and status of each version for side-by-side comparison.
    - *Acceptance Criteria (AC 2)*: The version list shows date, submitter, and status for every version.

---

## Sprint 6: Compliance Monitoring Matrix, Dashboard & Export (11 Story Points)
*Module D: Monitoring and Reports*  
**Sprint Goal:** Build the compliance monitoring view and dashboard, and implement PDF and CSV export of monitoring summaries.

- **SCMS-012 (AUD-014): Live Compliance Monitoring Matrix & Filter Scoping (5 pts)** — *Assignee: Developers*
  - [ ] **TASK-612.1 (Task 1)**: Build the compliance monitoring page showing each faculty member's status per course: not submitted, submitted, returned, approved, and overdue items.
    - *Acceptance Criteria (AC 1)*: The view shows not submitted, submitted, returned, approved and overdue items.
  - [ ] **TASK-612.2 (Task 2)**: Add filters for term, college, program and faculty member.
    - *Acceptance Criteria (AC 2)*: Results can be filtered by term, college, program and faculty member.
  - [ ] **TASK-612.3 (Task 3)**: Apply the user's permission scope to all monitoring queries (Academic Head campus-wide; Faculty Staff own courses).
    - *Acceptance Criteria (AC 3)*: Data is always restricted to the user's permitted scope.

- **SCMS-022 (AUD-015): Compliance Status Distribution Dashboard & Counts (3 pts)** — *Assignee: Developers*
  - [ ] **TASK-622.1 (Task 1)**: Build the compliance dashboard showing counts and distribution percentages per status for the selected term.
    - *Acceptance Criteria (AC 1)*: The dashboard shows counts per status for the selected term.
  - [ ] **TASK-622.2 (Task 2)**: Scope the dashboard data to the user's permissions and keep it read-only with no edit controls present.
    - *Acceptance Criteria (AC 2)*: Data is limited to the user's permitted scope and no edit controls are present.

- **SCMS-023 (AUD-016): Compliance Monitoring Summary Export to PDF & CSV (3 pts)** — *Assignee: Developers*
  - [ ] **TASK-623.1 (Task 1)**: Add Export to PDF and Export to CSV on the monitoring view, applying the active filters.
    - *Acceptance Criteria (AC 1)*: Export is available in PDF and CSV with the applied filters.
  - [ ] **TASK-623.2 (Task 2)**: Record each export (actor, timestamp, filters applied) in the audit log.
    - *Acceptance Criteria (AC 2)*: Each export is recorded in the audit log with actor, timestamp and filters.

---

## Sprint 7: FMS & CCMS Integrations & Offline Resilience Fallback (16 Story Points)
*Module A, B, C & Cross-Cutting Integration*  
**Sprint Goal:** Consolidate and implement the FMS and CCMS integrations (faculty profiles, subject assignments, term calendar) and the fallback behaviour across 4 cache states when either system is unreachable.

- **SCMS-016 (AUD-021): Read-Only FMS Faculty Profile Lookup & Scoping (5 pts)** — *Assignee: Developers*
  - [ ] **TASK-716.1 (Task 1)**: Build a read-only FMS client adapter that retrieves faculty name, college and unit keyed by stable `fms_faculty_id`.
    - *Acceptance Criteria (AC 1)*: SCMS retrieves faculty name, college and unit from FMS through a read-only lookup.
  - [ ] **TASK-716.2 (Task 2)**: Prevent creating or editing faculty data in SCMS, and ensure no FMS session, credential or token is shared.
    - *Acceptance Criteria (AC 2)*: Faculty data cannot be changed in SCMS and no FMS session or credential is shared.
  - [ ] **TASK-716.3 (Task 3)**: [Integration Test] Verify lookup against live/synthetic FMS for sample faculty (`fac-1092`) and document defects (Joint Acceptance Gate J5).
    - *Acceptance Criteria (AC 3)*: Profile data in SCMS matches FMS for the sample faculty; defects are documented.

- **SCMS-017 (AUD-022): FMS Teaching Assignment Ingestion (5 pts)** — *Assignee: Developers*
  - [ ] **TASK-717.1 (Task 1)**: Retrieve faculty-to-course assignments from FMS read-only, triggered upon human approval (`teaching_assignment.approved`) referencing SMS Course, Term, and Block Section IDs.
    - *Acceptance Criteria (AC 1)*: SCMS retrieves the courses each faculty member teaches from FMS before timetables exist.
  - [ ] **TASK-717.2 (Task 2)**: Generate the list of required submissions per faculty member and course from the assignments and published requirements.
    - *Acceptance Criteria (AC 2)*: Required submissions are listed per faculty member and course.
  - [ ] **TASK-717.3 (Task 3)**: Refresh assignments on a configurable interval or webhook with monotonic `assignment_version` so changes appear idempotently in SCMS.
    - *Acceptance Criteria (AC 3)*: Changes in FMS appear in SCMS after the next refresh without duplicate rows.
  - [ ] **TASK-717.4 (Task 4)**: [Integration Test] Verify assignments against live FMS, including changed assignment, reassignment, and substitution (Joint Acceptance Gate J2, J3, J4, J6).
    - *Acceptance Criteria (AC 4)*: Assignments match FMS, and a changed assignment updates compliance tracking seamlessly; defects are documented.

- **SCMS-018 (AUD-023): CCMS Academic Calendar Synchronization (3 pts)** — *Assignee: Developers*
  - [ ] **TASK-718.1 (Task 1)**: Retrieve term dates, holidays, and intraday suspensions from the CCMS calendar (in Asia/Manila timezone, excluding CCMS office working hours).
    - *Acceptance Criteria (AC 1)*: SCMS retrieves official term dates, holidays, and suspension cutoffs from CCMS.
  - [ ] **TASK-718.2 (Task 2)**: Keep the calendar entries read-only in SCMS, with no create or edit controls.
    - *Acceptance Criteria (AC 2)*: Calendar entries cannot be created or edited in SCMS.
  - [ ] **TASK-718.3 (Task 3)**: [Integration Test] Verify retrieved term dates, holidays, and 13:00 intraday cutoffs against the live CCMS calendar (Joint Acceptance Gate J7, J8).
    - *Acceptance Criteria (AC 3)*: Retrieved dates match CCMS; defects are documented.

- **SCMS-020 (AUD-025): FMS & CCMS Unreachable Offline Resiliency & 4-Tier Cache Fallback (3 pts)** — *Assignee: Developers*
  - [ ] **TASK-720.1 (Task 1)**: Implement 4-tier caching (Warm Cache TTL 24h, Expired Stale Cache, Cold-Start Fixtures, Missing Field Fallbacks) for all stored FMS and CCMS reference data.
    - *Acceptance Criteria (AC 1)*: When a link is unreachable, SCMS uses cached reference data and maintains continuous submission/review capabilities.
  - [ ] **TASK-720.2 (Task 2)**: Show an amber notice to users that reference data may be outdated while a link is down (`"Reference data may be delayed due to external service unavailability"`), disappearing upon reconnection.
    - *Acceptance Criteria (AC 2)*: A notice appears while a link is unreachable and disappears after reconnection.
  - [ ] **TASK-720.3 (Task 3)**: [Integration Test] Simulate FMS and CCMS downtime and confirm submissions and reviews continue and data refreshes on reconnection (Joint Acceptance Gate J11, J12).
    - *Acceptance Criteria (AC 3)*: Submissions and reviews continue during downtime and data refreshes on reconnection; defects are documented.
  - [ ] **TASK-720.4 (Task 4)**: [Final Integration Validation] Conduct final validation across all FMS and CCMS touchpoints (profile lookup, course assignments, term calendar, status summary, fallback).
    - *Acceptance Criteria (AC 4)*: All integration touchpoints pass final validation with no open critical or high-severity defects; sign-off is documented before sprint close.

---

## Sprint 8: Compliance Level Placeholder, Reminders, CCMS Push & E2E Validation (10 Story Points)
*Module B & D: Monitoring, Reminders & External Feeds*  
**Sprint Goal:** Implement the reserved compliance level placeholder, reminders, and the compliance status summary to CCMS, and complete final testing of the full Audit flow.

- **SCMS-024 (AUD-017): Reserved Compliance Level Placeholder & Stakeholder Clarifications (2 pts)** — *Assignee: Developers*
  - [ ] **TASK-824.1 (Task 1)**: Reserve a placeholder for compliance level in the data model and monitoring view without calculating it.
    - *Acceptance Criteria (AC 1)*: Until the client provides the definition and rule, no compliance level is calculated or displayed.
  - [ ] **TASK-824.2 (Task 2)**: Document the open questions for the client: what compliance level means, how it is calculated and any thresholds.
    - *Acceptance Criteria (AC 2)*: The questions are delivered to the client for confirmation before development of the calculation.

- **SCMS-025 (AUD-018): Deadline & Status Change Reminder Service (3 pts)** — *Assignee: Developers*
  - [ ] **TASK-825.1 (Task 1)**: Build a reminder service that triggers on items that are due, returned, approved or overdue.
    - *Acceptance Criteria (AC 1)*: Reminders are sent for due, returned, approved and overdue items.
  - [ ] **TASK-825.2 (Task 2)**: Make reminder channels and timing configurable and apply the client's confirmed settings.
    - *Acceptance Criteria (AC 2)*: Channels and timing follow the client's confirmed settings.
  - [ ] **TASK-825.3 (Task 3)**: Take contact details strictly from the verified institutional email in the faculty profile, adhering to RA 10173.
    - *Acceptance Criteria (AC 3)*: Reminders reach the contact details held in the faculty profile.

- **SCMS-019 (AUD-024): CCMS Compliance Status Summary Push & Full Flow Validation (5 pts)** — *Assignee: Developers*
  - [ ] **TASK-819.1 (Task 1)**: Build the compliance status summary payload (aggregate counts and percentages by term and program) and the sender that posts it to CCMS.
    - *Acceptance Criteria (AC 1)*: SCMS sends a compliance status summary to CCMS.
  - [ ] **TASK-819.2 (Task 2)**: Keep the link data-only with mutual machine token/HMAC, with no session or credential shared with CCMS.
    - *Acceptance Criteria (AC 2)*: No session or credential is shared with CCMS.
  - [ ] **TASK-819.3 (Task 3)**: Retry failed sends with exponential backoff and record failures and successes in the audit log.
    - *Acceptance Criteria (AC 3)*: A failed send is retried and recorded in the audit log.
  - [ ] **TASK-819.4 (Task 4)**: [Integration Test] Send a summary to live/synthetic CCMS and confirm it appears on the CCMS dashboard (Joint Acceptance Gate J1, J10).
    - *Acceptance Criteria (AC 4)*: CCMS receives the summary and shows it; defects are documented.
  - [ ] **TASK-819.5 (Task 5)**: [Final Testing] Run end-to-end testing of the full flow (submit, review, return, resubmit, approve, report, version compare, CCMS summary) and document defects.
    - *Acceptance Criteria (AC 5)*: All test cases pass across two rehearsals; defects are documented and resolved before sprint close.

---

## Phase 9: Verification, Testing & Defense Readiness
- [ ] **TASK-901**: End-to-end integration testing for all 24 User Stories across the 8 Sprints.
- [ ] **TASK-902**: Automated security scan validation via GitHub Actions pipeline (TruffleHog secret scanning & SAST).
- [ ] **TASK-903**: Institutional sign-off for RA 10173 compliance and capstone project defense presentation across two dry rehearsals.
