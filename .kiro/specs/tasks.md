# Spec-Driven Development (SDD) Phase 3: Implementation Tasks & Sprint Backlog
## Syllabus Compliance Monitoring System (SCMS)

**Methodology:** Kiro Sequenced Task Execution mapped to the 8-Sprint Product Backlog (20 User Stories, 77 Story Points)  
**Status Legend:** `[ ]` Pending | `[/]` In Progress | `[x]` Completed

---

## Phase 0: Repository, Steering, UI Scaffolding & CI/CD Infrastructure
- [x] **TASK-001**: Initialize private GitHub repository (`EducRodTablizo/Capstone-SCMS`) with branch protection rules on `main`.
- [x] **TASK-002**: Install CI/CD security workflows (`.github/workflows/ci-security.yml`) with TruffleHog (Secrets), Trivy (Vulnerabilities), and CodeQL (SAST), including GitHub Actions private repo permissions fix.
- [x] **TASK-003**: Establish SCMS Kiro Steering foundations in `.kiro/steering/` (`product.md`, `tech.md`, `structure.md`).
- [x] **TASK-004**: Formalize SCMS SDD specifications (`requirements.md` EARS syntax, `design.md`, `tasks.md`, `product_backlog.md`).
- [x] **TASK-005**: Scaffold React SPA with PUP Maroon & Gold design system, Tailwind v3, Radix UI primitives, MUI v9, and layout architecture (`AppLayout`, `Sidebar`, `TopBar`, `PupFooter`).
- [ ] **TASK-006**: Configure `docker-compose.yml` for local development (PostgreSQL 16, MongoDB 7, Redis 7).

---

## Sprint 1: Identity & Role Scoping (10 Story Points)
*Module A: Identity and Roles — own accounts, roles, data privacy*  
**Sprint Goal:** Establish SCMS's own sign-in, role-based access scoping for the Academic Head and Faculty Staff, and data privacy controls.

- **SCMS-001: Local SCMS Authentication & Accounts (3 pts)** — *Assignee: Developers*
  - [x] **TASK-101.1 (Task 1)**: Build the sign-in page and an authentication service that uses SCMS's own user accounts, with passwords stored securely.
    - *Acceptance Criteria (AC 1)*: Users sign in with their SCMS credentials; no password is stored in plain text (Argon2id hashing in PostgreSQL `users` table).
  - [x] **TASK-101.2 (Task 2)**: Reject invalid credentials with a clear error message that does not reveal which field was wrong.
    - *Acceptance Criteria (AC 2)*: Invalid credentials are rejected and no session is created (generic error message prevents enumeration).
  - [x] **TASK-101.3 (Task 3)**: Issue sessions only from SCMS, with no single sign-on or shared session with CCMS or FMS.
    - *Acceptance Criteria (AC 3)*: Signing in to CCMS or FMS does not grant access to SCMS, and the reverse is also true (standalone JWT HttpOnly cookies).

- **SCMS-002: Role-Based Access Scoping for Two Roles (5 pts)** — *Assignee: Developers*
  - [x] **TASK-102.1 (Task 1)**: Define the two roles (Academic Head and Faculty Staff) and attach the role to the session on every authenticated request.
    - *Acceptance Criteria (AC 1)*: The role is correctly identified on every request; a missing or invalid session returns 401; no other role exists.
  - [x] **TASK-102.2 (Task 2)**: Enforce role scoping on read endpoints: Faculty Staff see only their own submissions, and the Academic Head sees all requirements, submissions, the compliance view and the audit trail.
    - *Acceptance Criteria (AC 2)*: Each role sees only the data within its authorized scope (`WHERE faculty_id = current_user.id` for Faculty Staff).
  - [x] **TASK-102.3 (Task 3)**: Block write endpoints a role is not allowed to use and return 403, with a descriptive message on screen.
    - *Acceptance Criteria (AC 3)*: Unauthorized requests return 403, no data is changed, and the user sees a descriptive message.

- **SCMS-003: Faculty Personal Data Privacy Controls (2 pts)** — *Assignee: Developers*
  - [x] **TASK-103.1 (Task 1)**: Limit the faculty fields SCMS reads, stores and displays to those needed (name, college, unit), and review each field against its use.
    - *Acceptance Criteria (AC 1)*: Only the required faculty fields are read and stored (Data Privacy Act compliance).
  - [x] **TASK-103.2 (Task 2)**: Restrict a faculty member's documents to that faculty member and the Academic Head.
    - *Acceptance Criteria (AC 2)*: No other user can open a faculty member's documents (strict ownership and reviewer check).

---

## Sprint 2: Requirements Setup & Audit Logging (13 Story Points)
*Module B: Requirements and Deadlines + Module C: Submission and Review (Audit Trail)*  
**Sprint Goal:** Implement requirement definition per program and term, deadlines with publish and close, and append-only audit trail logging.

- **SCMS-004: Requirement Definition per Program & Term (5 pts)** — *Assignee: Developers*
  - [/] **TASK-204.1 (Task 1)**: Build the requirements setup page where the Academic Head creates a requirement type with a name and description for a program and term.
    - *Acceptance Criteria (AC 1)*: Requirements can be created per program and per term, each with a name and description.
  - [/] **TASK-204.2 (Task 2)**: Allow draft requirements to be edited before they are published.
    - *Acceptance Criteria (AC 2)*: Draft requirements can be edited and the saved changes appear immediately.
  - [/] **TASK-204.3 (Task 3)**: Restrict creating and editing requirements to the Academic Head.
    - *Acceptance Criteria (AC 3)*: Faculty Staff cannot create or edit requirements; attempts return 403.

- **SCMS-005: Term Deadlines, Publishing & Audit Trail Recording (3 pts)** — *Assignee: Developers*
  - [/] **TASK-205.1 (Task 1)**: Add a deadline field to each requirement and require it before the requirement can be published.
    - *Acceptance Criteria (AC 1)*: A requirement cannot be published without a deadline for the term.
  - [/] **TASK-205.2 (Task 2)**: Add Publish and Close actions; show Faculty Staff only published requirements and mark closed ones as closed.
    - *Acceptance Criteria (AC 2)*: Draft requirements are hidden from Faculty Staff; published requirements are visible; closed requirements are marked closed.
  - [/] **TASK-205.3 (Task 3)**: Record every deadline change (previous value, new value, actor, timestamp) through the audit logger.
    - *Acceptance Criteria (AC 3)*: Each deadline change appears in the audit trail with the actor and timestamp.

- **SCMS-014: Append-Only Audit Trail Logging (5 pts)** — *Assignee: Developers*
  - [/] **TASK-214.1 (Task 1)**: Implement audit logger middleware that records create and status-change actions (what was done, acting user, timestamp, previous and new value) to an append-only table.
    - *Acceptance Criteria (AC 1)*: Every logged action stores what was done, who acted, when, and the previous and new values.
  - [/] **TASK-214.2 (Task 2)**: Enforce append-only at the database level by withholding update and delete permissions on the audit table.
    - *Acceptance Criteria (AC 2)*: Update and delete attempts on audit records are rejected.
  - [/] **TASK-214.3 (Task 3)**: Provide one reusable logging call so submissions, decisions and resubmissions in later sprints write to the same log.
    - *Acceptance Criteria (AC 3)*: New action types can be logged without changing the log structure.


---

## Sprint 3: Overdue Calculation, Checklist & Audit Inspection (9 Story Points)
*Module B, Module C, Module M7*

- [ ] **SCMS-006 [TASK-301]** (3 pts): As the Academic Head, I want the system to calculate which submissions are overdue so that late items are identified without manual updates.
  - Subtask: Set up BullMQ nightly cron job comparing current date to `deadline_at` for non-approved submissions.
- [ ] **SCMS-007 [TASK-302]** (3 pts): As a Faculty Staff member, I want to see the requirements I must submit so that I know what is due and by when.
  - Subtask: Build Faculty Staff portal endpoint `GET /api/v1/faculty/requirements`.
  - Subtask: Render checklist UI in React client showing due dates and current status badges.
- [ ] **SCMS-015 [TASK-303]** (3 pts): As the Academic Head, I want to view the audit trail so that I can verify who did what and when.
  - Subtask: Build Academic Head endpoint `GET /api/v1/audit-logs` with filtering by actor, action, and date range.

---

## Sprint 4: Syllabus Submission & Review Decisions (11 Story Points)
*Module C. Submission and Review (M3, M4)*

- [ ] **SCMS-008 [TASK-401]** (5 pts): As a Faculty Staff member, I want to submit a syllabus for each subject I teach, as an uploaded file or a form, so that my compliance is recorded.
  - Subtask: Implement multipart file upload streaming to MongoDB GridFS.
  - Subtask: Create `submissions` record in PostgreSQL with status `SUBMITTED` and auto-timestamp.
- [ ] **SCMS-009 [TASK-402]** (3 pts): As the Academic Head, I want submissions to move through defined statuses so that each stage is timestamped and attributed.
  - Subtask: Enforce state machine transitions (`Not Submitted` → `Submitted` → `Under Review` → `Approved` / `Returned` → `Resubmitted`).
- [ ] **SCMS-010 [TASK-403]** (3 pts): As the Academic Head, I want to approve or return a submission with a recorded decision so that review outcomes are traceable.
  - Subtask: Build `POST /api/v1/reviews/:submissionId/decision` recording decision, Academic Head name, date, and comments.

---

## Sprint 5: Resubmission & FMS Profile/Subject Integration (13 Story Points)
*Module C (M5) + Module A & C FMS Integration*

- [ ] **SCMS-011 [TASK-501]** (3 pts): As a Faculty Staff member, I want to read the Academic Head's comment and resubmit a revised version so that I can reach approval.
  - Subtask: Build resubmission drawer in React UI; update status to `RESUBMITTED` and replace active file in GridFS.
- [ ] **SCMS-016 [TASK-502]** (5 pts): As the Academic Head, I want faculty name, college and unit read from FMS so that identity data is not duplicated.
  - Subtask: Build read-only REST client adapter to FMS faculty profiling endpoint; cache in Redis for 24h.
- [ ] **SCMS-017 [TASK-503]** (5 pts): As the Academic Head, I want faculty subject assignments read from FMS so that the system knows who must submit what.
  - Subtask: Query FMS Subject Tagging API to automatically populate required syllabus submissions per faculty member.

---

## Sprint 6: Real-Time Live Compliance Dashboard (10 Story Points)
*Module D. Monitoring and Reports (M6)*

- [ ] **SCMS-012 [TASK-601]** (5 pts): As the Academic Head, I want a live view of who has and has not complied so that I can follow up.
  - Subtask: Build `GET /api/v1/compliance/live` aggregating counts per status grouped by program and faculty.
  - Subtask: Render interactive MUI table in React with signature PUP Maroon header band.
- [ ] **SCMS-013 [TASK-602]** (5 pts): As the Academic Head, I want the compliance view to update immediately as submissions and decisions are made so that I always see the current status.
  - Subtask: Implement WebSocket gateway on Server 0 using Redis pub/sub.
  - Subtask: Hook submission and review events to broadcast real-time updates to connected client dashboards.

---

## Sprint 7: CCMS Calendar Sync & Compliance Summary Push (8 Story Points)
*Module B & D CCMS Integration*

- [ ] **SCMS-018 [TASK-701]** (3 pts): As the Academic Head, I want term dates and holidays read from the official CCMS calendar so that deadlines follow one calendar.
  - Subtask: Ingest CCMS academic calendar dates via scheduled job or webhook into `term_calendars`.
- [ ] **SCMS-019 [TASK-702]** (5 pts): As the Academic Head, I want a compliance status summary sent to CCMS so that the CCMS dashboard shows academic compliance.
  - Subtask: Build outbound HMAC-signed JSON payload pusher transmitting campus compliance metrics to CCMS.

---

## Sprint 8: Offline Resiliency & Fallback (3 Story Points)
*Cross-Cutting Integration (Modules A to D)*

- [ ] **SCMS-020 [TASK-801]** (3 pts): As the Academic Head, I want SCMS to keep working when FMS or CCMS cannot be reached so that submissions and reviews are not interrupted.
  - Subtask: Implement circuit breaker on FMS/CCMS adapters; fallback to Redis/PostgreSQL cached data.
  - Subtask: Display non-blocking amber status notice in UI when running on cached reference data.

---

## Phase 9: Verification, Testing & Defense Readiness
- [ ] **TASK-901**: End-to-end integration testing for all 20 User Stories across the 8 Sprints.
- [ ] **TASK-902**: Automated security scan validation via GitHub Actions pipeline.
- [ ] **TASK-903**: Institutional sign-off for RA 10173 compliance and capstone project defense presentation.
