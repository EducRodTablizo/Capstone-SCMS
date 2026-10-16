# Product Steering: Academic Catalog & Syllabus Management System (ACAS / SCMS)

## 1. Product Identity & Multi-System Ecosystem
This system operates under the umbrella of **ACAS (Academic Catalog and Syllabus Management System)**, also referred to as **SMS (Syllabus Management System)** or **SCMS (Syllabus Compliance Monitoring System)** (Group 1).

Within our university capstone ecosystem, three autonomous systems interoperate under confirmed Single Source of Truth (SSOT) boundaries (Reconciled as of 2026-10-16):
1. **ACAS / SMS / SCMS (Our System - Group 1):** The authoritative Single Source of Truth (SSOT) for:
   * **Academic Programs Catalog** (Degree Programs e.g., BSIT, BSCS)
   * **Curriculum Versions** (e.g., BSIT-2024-Curriculum)
   * **Course Master Catalog** (Accredited Courses, credit units, lecture/lab hours, facility tags; "Course" officially replaces "Subject")
   * **Academic Terms** (A.Y. and Semesters, statutory submission windows, start/end dates)
   * **Stable Block Sections** (e.g., `BSIT 4-1`, `BSIT 4-2` with persistent cohort year identity)
   * **Syllabus Authoring & Compliance Lifecycle** (Outcomes-Based Education [OBE] Form Mode, multi-tier review, version history archive, live compliance monitoring)
2. **Faculty Management System (FMS - Group 2):** The SSOT for:
   * **Faculty Profiles** (HR identities, employee IDs, academic ranks, consultation schedules)
   * **Teaching Assignments** (Human-approved instructor allocations to Course-Section-Term tuples)
   * **Physical Class Timetable & Space** (Weekly meeting slots, classroom/lab room allocations)
   * *Explicit Exemption:* FMS does NOT manage student enrolment headcounts, class sizes, student rosters, disciplinary penalties, or HR evaluation scores.
3. **Citizen's Charter Management System (CCMS - Group 3):** The SSOT for:
   * **Academic Calendar Milestones** (Semester boundaries, statutory university holidays, intraday class suspensions in Asia/Manila timezone)
   * *Explicit Boundary:* Calendar-only integration. CCMS office working hours do NOT overwrite academic teaching schedules. No faculty profile feed or student complaint referral workflows.

## 2. Product Purpose & Sprint Scope
The system provides a real-time submission-tracking, OBE syllabus creation, and compliance-monitoring platform developed for the Polytechnic University of the Philippines Quezon City Campus (PUPQC).

It covers **24 User Stories (`AUD-001` through `AUD-025` mapped to `SCMS-001` through `SCMS-025`)** totaling **86 Story Points** across **8 Sprints**.

It allows the **Academic Head** to define syllabus requirements and per-term deadlines for each program, and allows **Faculty Staff** to compose and submit syllabi (via official PUPQC OBE Form Mode or verified file upload). The Academic Head reviews each submission, and every review decision is recorded in a tamper-evident, append-only audit trail.

The system updates immediately as submissions and decisions are made, delivering a live view of compliance without manual page refreshes.

## 3. Target Audience & Roles (Two Roles Only)
The system defines **exactly two user roles**:
1. **Academic Head (Single Campus Administrator & Reviewer):**
   * Sets requirements and per-term deadlines for each program.
   * Reviews all program submissions and makes single-level approval or return decisions (`APPROVED` or `RETURNED`).
   * Monitors live compliance matrix and status distribution dashboard across all campus programs.
   * Inspects the tamper-evident audit trail and exports summaries to PDF/CSV.
2. **Faculty Staff:**
   * Views term requirements and syllabus submission checklists for their assigned courses.
   * Composes and submits syllabi (supporting official PUPQC OBE form template and file uploads).
   * Revises and resubmits returned items based on review feedback with full version history comparison.
   * Receives automated deadline and status change notifications.
   * Views their own submissions and live review statuses under strict data privacy.

## 4. Scope Boundaries & Specific Entities
* **Academic Year & Semester (IN SCOPE - SMS SSOT):** Mastered in `term_calendars` (e.g., `A.Y. 2026-2027 1st Semester`), establishing active compliance periods, submission countdown timers, and automated overdue evaluations.
* **Stable Block Sections (IN SCOPE - SMS SSOT):** Mastered in `block_sections` (e.g., `BSIT 4-1`, `BSIT 4-2`). SMS maintains the stable cohort identity (`cohort_admission_year = 2023`). Display labels may be renamed (e.g., `BSIT 4-1` to `BSIT 4-1-A`) without creating competing local masters in FMS.
* **Two-Stage Teaching Assignment Lifecycle (IN SCOPE):**
  * *Stage 1 (Allocation Approved):* FMS delivers `teaching_assignment.approved` once human-approved by the Chair/Dean. SMS provisions a compliance ticket (`NOT_SUBMITTED`) before timetable/room details exist.
  * *Stage 2 (Schedule Finalized):* FMS delivers `teaching_assignment.schedule_finalized` once room and meeting periods are locked. SMS updates syllabus header details without resetting compliance deadlines or duplicating tickets.
* **Multi-Section Syllabus Consolidation (IN SCOPE):** If an instructor teaches multiple block sections of the same course (e.g., `BSIT 4-1` and `BSIT 4-2`), they submit one unified syllabus covering those sections.
* **Submission Version History (IN SCOPE - SCMS-021 / AUD-013):** Every resubmission is retained as an immutable version (`v1`, `v2`, etc.), enabling side-by-side comparison of revisions.
* **Monitoring Export (IN SCOPE - SCMS-023 / AUD-016):** Exporting filtered compliance summaries to PDF and CSV with audit log recording.

## 5. Core Product Principles
1. **Direct Compliance Definition:** Compliance is the status of each submission itself (`Approved`, `Submitted`, `Under Review`, `Returned`, `Resubmitted`, `Not Submitted`, `Overdue`). A dedicated placeholder is reserved for `compliance_level` (`SCMS-024` / `AUD-017`), with calculation deferred pending institutional stakeholder formula confirmation.
2. **Real-Time Live Updates:** Live compliance updates are pushed immediately upon submission or review decision (via WebSockets / Server-Sent Events).
3. **Audit Trail Accountability (Append-Only):** Every action, deadline change, and review decision is timestamped and attributed. The database strictly rejects `UPDATE` and `DELETE` on audit records.
4. **Data Privacy (RA 10173):** Local user accounts are maintained independently with secure Argon2id password hashing. FMS queries fetch strictly minimal faculty attributes (`faculty_id`, `display_name`, `institutional_email`). Academic rank and consultation hours are conditional; salary, home address, and HR evaluations are strictly excluded.
5. **Document Confidentiality:** Uploaded and composed syllabus documents are strictly confidential, restricted to the owning faculty member and the Academic Head.
6. **Decoupled Interoperability & Resilient Fallback (SCMS-020):** System links with FMS and CCMS exchange data or events only, never borrowed credentials. If FMS is unreachable, SMS continues operating seamlessly across 4 explicit cache states:
   * *Warm Cache:* Active cached FMS profiles served instantly (<5ms).
   * *Expired Cache:* Stale-while-revalidate serving with `[CACHED SNAPSHOT - STALE]` tag.
   * *Empty Cache / Cold Start:* Pre-seeded synthetic fixture fallback (`[FIXTURE DATA: FMS UNCONNECTED]`).
   * *Missing Field Fallback:* Graceful defaults for missing consultation hours without blocking submissions.
7. **Joint Acceptance Testing:** System commitments are formally verified against the **J1–J16 Joint Acceptance Gate** with two complete mock demo rehearsals.

## 6. Explicit Out of Scope
* Any user role other than the Academic Head and Faculty Staff (no Dean, Department Chair, or QA Staff roles).
* Restricting data by college or unit (since there is one Academic Head overseeing all campus programs).
* Faculty profile creation, HR contracts, rank, or salary management (owned by FMS).
* Physical room scheduling, capacity matching, and double-booking conflict resolution (owned by FMS).
* Student enrollment counts, class size tracking, or student rosters (relieved from FMS and out of scope for SMS).
* Citizen's charter complaint case handling or office working hours management (owned by CCMS).
