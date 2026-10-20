# Academic Catalog & Syllabus Management System (ACAS / SMS)
## Master Product Backlog (37 Stories: Sprints 1 to 8)

**Document Version:** 3.0.0 (Post-Integration Architecture Reconciliation)  
**Date:** October 19, 2026  
**Status:** APPROVED ARCHITECTURAL BASELINE  
**Total User Stories:** 37 User Stories (`SMS-001` through `SMS-037`)  
**Total Story Points:** 105 Story Points  
**Sprint Cadence:** 8 Two-Week Sprints (16 Weeks Total)  
**Baseline Status:** Sprint 1 100% COMPLETE & VERIFIED (`SMS-001`, `002`, `003`, `014`, `021` - 16 pts) ✅ | Sprint 2 Active (Academic Catalog Core & Requirements - 14 pts) 🔄

---

## 1. Executive Summary & Architecture Reconciliation

This Master Product Backlog harmonizes the institutional syllabus compliance specifications with the complete **Academic Catalog Core (ACAS)** and the **FMS & CCMS Multi-System Integration Contracts**.

### Core Architecture & SSOT Principles
1. **Catalog Single Source of Truth (SSOT):** SMS is the sole institutional owner and authoritative source for Academic Programs (`SMS-021`), Course Master records with credit/contact hours & lab specifications (`SMS-022`), Curricula & course-program mappings (`SMS-030`), and Stable Cohort Block Sections (`SMS-031`). FMS consumes this catalog via cursor-paged endpoints (`SMS-026`) and change webhooks (`SMS-027`).
2. **Calendar SSOT & Intelligent Deadline Engine:** CCMS is the SSOT for academic term dates, holidays, and campus suspensions (`SMS-018`, `SMS-032`). Deadlines are calculated server-side with strict rules: cut-off is **23:59:59 Asia/Manila**, Sundays and holidays are skipped, and intraday suspensions push deadlines to the next regular class day (`SMS-033`).
3. **Faculty & Assignment Ingestion:** FMS is the SSOT for Faculty Profiles (`SMS-016`) and Teaching Assignments (`SMS-017`). An approved assignment creates exactly one compliance tracking record. Reassignments, withdrawals, and dissolves automatically move entries to **`UNASSIGNED`** without penalizing faculty (`SMS-023`).
4. **OBTL Syllabus Compilation & Signatory Hierarchy:** Faculty can upload files or compose syllabi using the interactive PUPQC Outcomes-Based Teaching and Learning (OBTL) form (`SMS-008`, `SMS-025`). Headers are auto-filled and locked from official FMS data (`SMS-024`). Official PDFs feature the required four-line signatory block: Prepared by (Faculty), Reviewed and Checked by (Academic Head), Recommending Approval (Campus Director), and Approved by (Vice President for Campuses) (`SMS-035`).
5. **Accreditation & Audit Preservation:** Full multi-version draft comparison (`SMS-036`) and official PDF/CSV compliance matrix exports (`SMS-037`) are retained for university QA, AACCUP, and CHED compliance audits.
6. **M2M Security & 4-Tier Resilience:** All inter-system traffic runs over TLS 1.3 secured with OAuth 2.0 Client Credentials (M2M Bearer tokens) and API keys (`SMS-028`). If FMS or CCMS is unreachable, SMS runs seamlessly on a 4-tier fallback hierarchy (Warm Cache, Stale Notice Banner, Cold Synthetic Fixtures, and Defaults) (`SMS-020`, `SMS-034`).

---

## 2. Sprint Allocation & Module Summary Table

| Sprint | Focus & Scope | User Stories Included | Story Points |
| :---: | :--- | :--- | :---: |
| **Sprint 1** | Identity, Role Scoping, Data Privacy, Audit Log & Program Catalog | `SMS-001`, `SMS-002`, `SMS-003`, `SMS-014`, `SMS-021` | 16 pts |
| **Sprint 2** | Academic Catalog Core: Courses, Curricula, Block Sections & Requirements | `SMS-004`, `SMS-022`, `SMS-030`, `SMS-031` | 14 pts |
| **Sprint 3** | Term Windows, CCMS Calendar Push & Intelligent Deadline Engine | `SMS-005`, `SMS-018`, `SMS-032`, `SMS-033` | 12 pts |
| **Sprint 4** | FMS Faculty Profile Ingestion, Catalog Paged API & M2M Token Security | `SMS-016`, `SMS-026`, `SMS-028` | 13 pts |
| **Sprint 5** | Assignment Ingestion, 7-Status State Machine, Overdue & Submissions | `SMS-006`, `SMS-007`, `SMS-008`, `SMS-009`, `SMS-017` | 17 pts |
| **Sprint 6** | Single-Level Review, Resubmissions, Live Compliance, WebSocket & Version History | `SMS-010`, `SMS-011`, `SMS-012`, `SMS-013`, `SMS-015`, `SMS-024`, `SMS-036` | 17 pts |
| **Sprint 7** | Reassignments, OBTL Syllabus PDF, Signatories, CCMS Push & Matrix Export | `SMS-019`, `SMS-023`, `SMS-025`, `SMS-035`, `SMS-037` | 15 pts |
| **Sprint 8** | Multi-System Offline Resilience, Webhooks, Health Checks & Joint Testing | `SMS-020`, `SMS-027`, `SMS-029`, `SMS-034` | 11 pts |
| **TOTALS** | **Comprehensive Academic Catalog & Syllabus Monitoring System** | **37 User Stories** | **115 pts** |

---

## 3. Master Product Backlog Table (Stories SMS-001 to SMS-037)

| Story ID | Sprint | User Story | Acceptance Criteria (AC) | Points | Status |
| :---: | :---: | :--- | :--- | :---: | :---: |
| **SMS-001** | **S1** | As a user (Academic Head or Faculty Staff), I want to sign in with an SMS account so that I can use the system without depending on a CCMS or FMS login. | 1. SMS authenticates users with its own accounts, and passwords are stored hashed (Argon2id).<br>2. No single sign-on or shared session with CCMS or FMS (Decision A9).<br>3. Invalid credentials return 401 Unauthorized. | 3 | Completed ✅ |
| **SMS-002** | **S1** | As a user, I want access to be determined by my role so that I only see what my role allows. | 1. Faculty Staff see only their own assigned submissions and courses.<br>2. Academic Head can access all requirements, submissions, compliance views, and the audit trail.<br>3. No roles other than Academic Head and Faculty Staff exist.<br>4. Unauthorized requests return 403 Forbidden. | 3 | Completed ✅ |
| **SMS-003** | **S1** | As a Faculty Staff member, I want my personal data handled in line with the Data Privacy Act so that my information is protected. | 1. SMS reads only minimal faculty data needed from FMS: faculty ID, display name, institutional email, academic rank, consultation hours.<br>2. Salary, home address, personal phone numbers, and HR scores are never accessed or stored.<br>3. Faculty documents are visible only to that faculty member and Academic Head.<br>4. Nothing sent to CCMS contains personal data (RA 10173). | 2 | Completed ✅ |
| **SMS-014** | **S1** | As the Academic Head, I want every submission action and review decision logged so that accountability and traceability are ensured. | 1. Creation, status changes, decisions, and resubmissions are recorded with who acted, what was done, and when.<br>2. Log records are append-only and tamper-evident; update and delete attempts are rejected at database level. | 5 | Completed ✅ |
| **SMS-021** | **S1** | As the Academic Head, I want to maintain the list of programs in the system so that requirements can be defined per program. | 1. Academic Head can add and edit programs with a program code (e.g., BSIT), title, and status (Active or Phased out).<br>2. Requirements can be defined only for Active programs in the list.<br>3. Only the Academic Head can change the program list. | 3 | Completed ✅ |
| **SMS-004** | **S2** | As the Academic Head, I want to define what each program must submit for a term so that Faculty Staff know what is required. | 1. Requirements are defined per program from the active program list and per term as requirement types.<br>2. Each requirement has a name and description.<br>3. Only the Academic Head can create or edit requirements. | 3 | Planned 📋 |
| **SMS-022** | **S2** | As the Academic Head, I want to maintain the course catalogue so that SMS is the source of the official courses. | 1. Course has code, title, credit units, lecture hours, lab hours, description, prerequisites, co-requisites; contact hours = lecture + lab.<br>2. Records whether it needs a laboratory, laboratory type, and special software.<br>3. Status: Draft, Active, Revised, Retired.<br>4. Continuing course ID stays constant; official changes create new immutable version.<br>5. Retired courses cannot receive new assignments; existing syllabi stay intact.<br>6. Only Academic Head can modify catalog. | 5 | Planned 📋 |
| **SMS-030** | **S2** | As the Academic Head, I want curricula and course membership maintained so that each course is linked to the programs that use it. | 1. Each program has curricula (e.g. BSIT-2024-Curriculum) with effective start term and status Draft, Active, or Superseded.<br>2. Course can belong to several programs, with year level and semester in each curriculum.<br>3. Only Academic Head can change curricula. | 3 | Planned 📋 |
| **SMS-031** | **S2** | As the Academic Head, I want block sections maintained so that each cohort section has a stable identity. | 1. Block section has program, cohort admission year, year level, section number, display label (e.g., BSIT 4-1), and status (Active, Dissolved, Merged).<br>2. Renaming display label preserves section identity and cohort year.<br>3. Dissolving a section cancels its assignments, which become Unassigned without penalty.<br>4. Only Academic Head can change block sections. | 3 | Planned 📋 |
| **SMS-005** | **S3** | As the Academic Head, I want to set a deadline for each requirement and publish or close it so that submissions follow the term schedule. | 1. Each requirement has a deadline for the term, set from the term's submission window.<br>2. Requirements can be published and closed.<br>3. Faculty Staff see only published requirements.<br>4. Deadline changes are recorded in the audit trail. | 3 | Planned 📋 |
| **SMS-018** | **S3** | As the Academic Head, I want academic terms kept in SMS, with their dates received from CCMS, so that submissions are tracked per term. | 1. Each academic term has term code (e.g., 2026-1S), academic year, semester, start/end dates, and status (Upcoming, Active, Closed, Archived).<br>2. Term dates come from CCMS calendar and cannot be edited in SMS.<br>3. Academic Head sets submission window for each term. | 3 | Planned 📋 |
| **SMS-032** | **S3** | As the Academic Head, I want the official academic calendar received from CCMS so that term dates, holidays and suspensions come from one source. | 1. CCMS sends full snapshot of active term with holidays and suspensions, marked by entry type and whether it applies to work, classes, or both.<br>2. SMS stores calendar read-only and acknowledges push as success/failure.<br>3. Idempotent: push with processed sync ID acknowledged without duplicate work.<br>4. SMS can pull calendar after restart/outage to catch up.<br>5. Office working hours are never imported. | 3 | Planned 📋 |
| **SMS-033** | **S3** | As the Academic Head, I want deadlines calculated with the campus calendar so that working days, holidays and suspensions are respected. | 1. Working days counted with first day excluded, last day included, skipping Sundays, holidays, and full suspensions.<br>2. Cut-off is strictly 23:59:59 Asia/Manila.<br>3. Deadline falling on non-working day or intraday suspension before cut-off moves to next regular class day.<br>4. Deadlines recalculated when CCMS updates calendar; history preserved in audit log. | 3 | Planned 📋 |
| **SMS-016** | **S4** | As the Academic Head, I want minimal faculty profile data read from FMS so that syllabus author details are not retyped or duplicated. | 1. Reads read-only from FMS only for active faculty: ID, display name, institutional email, rank, consultation hours.<br>2. Faculty data cannot be created or edited in SMS.<br>3. Cached for 24h and refreshed on demand when generating PDF.<br>4. Matched by FMS faculty ID; email change never breaks links.<br>5. Missing consultation hours show standard default. | 5 | Planned 📋 |
| **SMS-026** | **S4** | As the FMS team, I want to retrieve the programs, curricula, courses, terms and block sections from SMS so that teaching assignments use official data only. | 1. FMS retrieves programs, curricula, courses with versions, terms, and block sections.<br>2. Course lists cursor-paged with limit (50 default), ordered by last change and ID; supports modified-since timestamp filter.<br>3. Responses distinguish 404, Retired (200 with Retired status), 403, and 503.<br>4. Courses never hard-deleted.<br>5. API versioned at /api/v1. | 5 | Planned 📋 |
| **SMS-028** | **S4** | As the Academic Head, I want exchanges with FMS and CCMS secured so that only authorized systems can read or send data. | 1. FMS & SMS authenticate with M2M Bearer tokens (OAuth 2.0 Client Credentials); CCMS with API key or Bearer token.<br>2. Scoped access: FMS reads catalog and writes assignments; SMS reads faculty profiles.<br>3. All exchanges run over TLS 1.3 with IP whitelisting support.<br>4. Tokens/keys configured via environment, never committed to VCS; rotated per term.<br>5. Data used strictly for compliance monitoring and syllabus publication. | 3 | Planned 📋 |
| **SMS-006** | **S5** | As the Academic Head, I want the system to calculate which submissions are overdue so that late items are identified without manual updates. | 1. Overdue calculated automatically from deadline and campus calendar.<br>2. Overdue cannot be set or edited manually.<br>3. Submissions in Unassigned status are strictly excluded from overdue alerts. | 3 | Planned 📋 |
| **SMS-007** | **S5** | As a Faculty Staff member, I want to see the requirements I must submit for each course section I teach so that I know what is due and by when. | 1. Faculty Staff see, for each assigned course section, published requirements applying to its program, with deadlines.<br>2. Each item shows current status badge. | 3 | Planned 📋 |
| **SMS-008** | **S5** | As a Faculty Staff member, I want to submit a syllabus for each course section I teach, as a PDF or DOCX file or composed in the PUPQC OBE form, so that my compliance is recorded. | 1. Faculty can upload PDF/DOCX or compose syllabus in PUPQC OBE form for each assigned section.<br>2. Submission timestamp recorded automatically.<br>3. Status changes to Submitted.<br>4. Submissions blocked for closed requirements. | 5 | Planned 📋 |
| **SMS-009** | **S5** | As the Academic Head, I want submissions to move through defined statuses so that each stage is timestamped and attributed. | 1. Canonical statuses: Not Submitted, Submitted, Under Review, Returned, Resubmitted, Approved, Unassigned.<br>2. Status transitions timestamped and attributed to acting user in audit log.<br>3. Status cannot be skipped; withdrawn assignment moves entry to Unassigned. | 3 | Planned 📋 |
| **SMS-017** | **S5** | As the Academic Head, I want teaching assignments received from FMS so that a submission tracking entry is created automatically for each course section. | 1. FMS sends assignments with ID, version, term, course, block section, faculty ID, and status.<br>2. When assignment is Approved, SMS creates exactly one tracking entry with status Not Submitted.<br>3. Re-sending same version is idempotent; older version rejected as stale.<br>4. Schedule/room update changes schedule details only, not compliance status or deadline.<br>5. Assignment for non-Active course rejected with 422. | 3 | Planned 📋 |
| **SMS-010** | **S6** | As the Academic Head, I want to approve or return a submission with a recorded decision so that review outcomes are traceable. | 1. Academic Head can approve or return a submission that is Under Review.<br>2. Each decision records Academic Head's name, timestamp, and mandatory comment.<br>3. Decision visible on submission to faculty and reviewer. | 3 | Planned 📋 |
| **SMS-011** | **S6** | As a Faculty Staff member, I want to read the Academic Head's comment and resubmit a revised version so that I can reach approval. | 1. Returned submission shows Academic Head's feedback.<br>2. Faculty can upload revised file and resubmit.<br>3. Status changes to Resubmitted; review loop repeats until Approved; recorded in audit log. | 3 | Planned 📋 |
| **SMS-012** | **S6** | As the Academic Head, I want a live view of who has and has not complied so that I can follow up. | 1. Shows submissions by status: not submitted, submitted, under review, returned, resubmitted, approved, unassigned, and overdue.<br>2. Filterable by term, program, and faculty member.<br>3. Real-time counts per status shown for selected term. | 3 | Planned 📋 |
| **SMS-013** | **S6** | As the Academic Head, I want the compliance view to update immediately as submissions and decisions are made so that I always see the current status. | 1. New submissions, decisions, and resubmissions appear via WebSocket gateway without manual refresh.<br>2. Displayed status always matches database record.<br>3. Faculty see their own status change immediately after decision. | 3 | Planned 📋 |
| **SMS-015** | **S6** | As the Academic Head, I want to view the audit trail so that I can verify who did what and when. | 1. Academic Head can view, search, and filter audit trail by date range, user ID, and action type.<br>2. Audit records are strictly read-only and immutable. | 3 | Planned 📋 |
| **SMS-024** | **S6** | As a Faculty Staff member, I want my details and my course section's details filled in on the syllabus header so that I do not retype them. | 1. Syllabus header pre-filled with faculty name, rank, email, consultation hours from FMS, and course, section label, term, schedule, room from assignment.<br>2. Pre-filled fields are locked and cannot be edited in SMS.<br>3. Missing consultation hours show standard default; missing schedule/room stay blank until FMS sends them. | 2 | Planned 📋 |
| **SMS-036** | **S6** | As the Academic Head and Faculty Staff, I want to view the multi-version submission history so that previous drafts and reviewer revisions can be compared side-by-side. | 1. Every resubmission creates a frozen immutable version record (v1, v2, etc.).<br>2. Academic Head and authoring faculty can download or view previous file versions.<br>3. Version metadata displays submission timestamp, file hash, and author notes. | 3 | Planned 📋 |
| **SMS-019** | **S7** | As the Academic Head, I want a compliance summary sent to CCMS so that the CCMS executive dashboard shows academic compliance. | 1. SMS sends CCMS summary payload: total courses assigned, syllabi required, counts approved, under review, returned, overdue, and compliance rate.<br>2. Automated weekly push, term milestones (Week 2 deadline, midterms), and on-demand trigger.<br>3. Contains no personal data (no student/faculty PII).<br>4. Failed push retried with exponential backoff and logged in audit trail. | 3 | Planned 📋 |
| **SMS-023** | **S7** | As the Academic Head, I want teaching assignment changes from FMS handled automatically so that syllabus responsibility always follows the current assignment. | 1. Reassignment updates same assignment with new instructor and version bump; unapproved syllabus responsibility moves immediately to new instructor.<br>2. If syllabus is Approved, it stays locked and valid; new instructor adopts it.<br>3. When FMS withdraws assignment, entry becomes Unassigned without penalty.<br>4. Temporary substitute gets read-only co-instructor access while primary remains accountable. | 3 | Planned 📋 |
| **SMS-025** | **S7** | As a Faculty Staff member, I want to generate the official syllabus as a PDF so that I can submit and publish it in the required format. | 1. Compiles syllabus into PDF in PUPQC Outcomes-Based Teaching and Learning (OBTL) format.<br>2. Uses locked header details and official four-line signatory block.<br>3. Generation refreshes faculty profile on demand; falls back to cache if FMS unavailable. | 3 | Planned 📋 |
| **SMS-035** | **S7** | As the Academic Head, I want to maintain the Campus Director and Vice President names so that the syllabus signatory block is complete. | 1. Academic Head configures name and title of Campus Director and Vice President for Campuses.<br>2. Names appear only in syllabus signatory block; they do not review or approve in SMS.<br>3. Academic Head name appears as Reviewed and Checked by. | 3 | Planned 📋 |
| **SMS-037** | **S7** | As the Academic Head, I want to export compliance monitoring summaries to PDF and CSV so that official records can be submitted for university QA and CHED/AACCUP accreditation. | 1. Academic Head can export compliance matrix filtered by term and program to PDF and CSV formats.<br>2. Exports include generation timestamp, Academic Head name, and compliance rate percentages.<br>3. Each export event is logged in the audit trail. | 3 | Planned 📋 |
| **SMS-020** | **S8** | As the Academic Head, I want SMS to keep working when FMS is unreachable and to catch up when it returns so that faculty can keep drafting and submitting. | 1. Handles 4 states: warm cache, expired cache (served with stale notice banner), empty fixture data, and missing optional field defaults.<br>2. Faculty can draft and submit in every state.<br>3. SMS auto-reconciles when FMS reconnects and reports discrepancies.<br>4. Outbound retries at 1m, 5m, 15m. | 3 | Planned 📋 |
| **SMS-027** | **S8** | As the FMS team, I want to be notified when a subject is updated or retired so that my copy stays current. | 1. When Academic Head publishes catalog change, SMS pushes updated/retired webhook event to FMS.<br>2. Outbound retried after 1 min, 5 min, 15 min on failure.<br>3. Delivery status recorded in audit trail. | 3 | Planned 📋 |
| **SMS-029** | **S8** | As the FMS team, I want health checks, clear error messages and test data so that we can test the exchanges. | 1. /health endpoint reports SMS service availability and dependency status.<br>2. Errors return structured RFC 7807 responses with code, message, and timestamp.<br>3. Static pre-validated catalog seed and sample calendar data available for testing. | 2 | Planned 📋 |
| **SMS-034** | **S8** | As the Academic Head, I want SMS to keep working when CCMS is unreachable and to show the calendar connection status so that deadlines stay reliable. | 1. Serves cached calendar for 24h, then stale calendar with amber warning notice banner; loads synthetic sample if no connection.<br>2. Syllabus composition, uploads, and reviews never blocked by CCMS outage.<br>3. UI displays CCMS connection status and last sync time.<br>4. Health check reports CCMS connection status. | 3 | Planned 📋 |

---

## 4. Traceability & Harmonization Matrix (Institutional AUD to SMS)

| Original AUD ID | Reconciled SMS ID | Feature Mapping & Scope Status |
| :---: | :---: | :--- |
| **AUD-001** | `SMS-001` | Local Argon2id Authentication (Decision A9) |
| **AUD-002** | `SMS-002` | Strict RBAC Scoping (Academic Head vs Faculty Staff) |
| **AUD-003** | `SMS-003` | Data Privacy Controls (RA 10173 minimal faculty data) |
| **AUD-004** | `SMS-004` | Term Requirement Types & Descriptions Setup |
| **AUD-005** | `SMS-005` | Term Submission Windows & Requirement Deadlines |
| **AUD-006** | `SMS-006` | Automated Server-Side Overdue Calculation (excludes Unassigned) |
| **AUD-007** | `SMS-007` | Faculty Requirement Checklist per Course Section |
| **AUD-008** | `SMS-008` | Syllabus Submission (File Upload & PUPQC OBE Form) |
| **AUD-009** | `SMS-009` | 7-Status Submission Lifecycle Engine (with `UNASSIGNED`) |
| **AUD-010** | `SMS-010` | Single-Level Review Decisions (Approve/Return + Mandatory Comment) |
| **AUD-011** | `SMS-011` | Faculty Resubmission Cycle with Reviewer Feedback |
| **AUD-012** | `SMS-012` | Live Compliance Monitoring Matrix & Status Dashboard |
| **AUD-013** | `SMS-036` | Multi-Version Submission History & Revision Diff Comparison |
| **AUD-014** | `SMS-013` | Real-Time WebSocket Compliance View Updates |
| **AUD-015** | `SMS-012` | Status Distribution & Term Counts (Unified into SMS-012) |
| **AUD-016** | `SMS-037` | Official Compliance Monitoring PDF & CSV Export |
| **AUD-017** | Deferred | Compliance Level Formula Placeholder (Merged into SMS-012 analytics) |
| **AUD-018** | Deferred | Automated Deadline Reminders (Deferred in favor of calendar push) |
| **AUD-019** | `SMS-014` | Append-Only DB-Level Tamper-Evident Audit Logging |
| **AUD-020** | `SMS-015` | Audit Trail UI Viewer & Activity Log Filtering |
| **AUD-021** | `SMS-016` | FMS Faculty Profile Lookup (24h cache, ID mapping) |
| **AUD-022** | `SMS-017` | FMS Teaching Assignment Webhook Ingestion |
| **AUD-023** | `SMS-018` / `SMS-032` | CCMS Academic Calendar Push Ingestion & Term Synchronization |
| **AUD-024** | `SMS-019` | CCMS Compliance Summary Push (Aggregates without PII) |
| **AUD-025** | `SMS-020` / `SMS-034` | 4-Tier Offline Cache Resiliency (FMS & CCMS Fallback) |
| *New ACAS* | `SMS-021` | Program Catalogue Management (e.g., BSIT, Active/Phased out) |
| *New ACAS* | `SMS-022` | Course Catalogue Management (Code, Units, Lecture/Lab Hours, Versioning) |
| *New ACAS* | `SMS-023` | Assignment Reassignments, Substitutes & Unassigned State Rules |
| *New ACAS* | `SMS-024` | Locked Syllabus Header Auto-Prefill from FMS & Assignment Data |
| *New ACAS* | `SMS-025` | PUPQC OBTL Syllabus PDF Compilation & 4-Line Signatory Block |
| *New ACAS* | `SMS-026` | FMS Course Catalogue Retrieval API (Cursor-paged, versioned) |
| *New ACAS* | `SMS-027` | Outbound Catalogue Change Webhook Notification to FMS |
| *New ACAS* | `SMS-028` | M2M Security: OAuth 2.0 Client Credentials, API Keys, TLS 1.3 |
| *New ACAS* | `SMS-029` | FMS Health Check Endpoints, RFC 7807 Errors & Seed Fixtures |
| *New ACAS* | `SMS-030` | Curricula & Course Membership Management (BSIT-2024-Curriculum) |
| *New ACAS* | `SMS-031` | Block Sections Cohort Management (e.g., BSIT 4-1) |
| *New ACAS* | `SMS-032` | CCMS Calendar Snapshot Push Ingestion (Holidays & Suspensions) |
| *New ACAS* | `SMS-033` | Calendar-Aware Deadline Calculation (23:59:59 cut-off, suspension pushout) |
| *New ACAS* | `SMS-034` | CCMS Offline Fallback (24h cache, Amber notice banner) |
| *New ACAS* | `SMS-035` | Signatory Authority Configuration (Campus Director & VP for Campuses) |

---

## 5. Development Strategy & Next Steps

1. **Sprint 1 Completion Gate:**
   - `SMS-001`, `SMS-002`, `SMS-003`, and `SMS-014` are already verified and complete in `apps/identity-service` and `apps/audit-log-service`.
   - `SMS-021` (Program Catalogue Management) verified with 9/9 automated tests passing against live PostgreSQL `sms_catalog` (Port 5435) and UI verified. Sprint 1 is 100% Complete & Signed Off ✅.
2. **Sprint 2 Execution:**
   - Build out the Academic Catalog core: `SMS-022` (Courses), `SMS-030` (Curricula), `SMS-031` (Block Sections), and `SMS-004` (Program Requirements).
