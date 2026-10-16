# Response to CCMS Integration Questionnaire

**From:** Academic Catalog & Syllabus Management System Team (ACAS / SCMS / Group 1 - "Audit Team")  
**To:** Citizen's Charter Compliance/Monitoring System Team (CCMS / Group 3 - PUP Quezon City)  
**Date:** October 16, 2026  
**Status:** Official Reconciled Response (Aligned with SDD Baseline & Master Product Backlog)  
**Reference Documents:**
* `CCMS_CALENDAR_PUSH_CONTRACT_AUDIT_10162026.md`
* `CCMS_CALENDAR_PUSH_SCHEMA_AUDIT_10162026.json`
* `docs/fms_sms_integration_contract.md` (SMS ↔ FMS Contract)
* `docs/product_backlog.md` (Stories `SCMS-018`, `SCMS-019`, `SCMS-020`, `SCMS-024`)
* `docs/system_architecture_and_diagrams.md`

---

## Executive Overview: About Audit (ACAS / SCMS)
*(In the same style as CCMS Section "About CCMS")*

**What Audit (SCMS) is.** The **Academic Catalog & Syllabus Management System (ACAS)**, operating in compliance monitoring mode as the **Syllabus Compliance Monitoring System (SCMS)**, is a web-based enterprise platform for the Polytechnic University of the Philippines Quezon City Campus (PUPQC). It serves as the institutional platform for Outcomes-Based Education (OBE) syllabus authoring, submission tracking, multi-draft revision management, single-level review workflows, and real-time syllabus compliance monitoring across all accredited campus degree programs. It guarantees transparency, accountability, and defense readiness for institutional quality assurance.

**Who uses it.** SCMS operates under a strict **Two-Role Model**:
1. **Academic Head (Single Campus Administrator & Reviewer):** Sets term requirements and deadlines per program; reviews all syllabus submissions with single-level Approve or Return decisions; monitors campus-wide compliance; inspects the tamper-evident audit trail; and exports official reports.
2. **Faculty Staff:** Views submission checklists for assigned courses; composes syllabi via the official PUPQC OBE form template or uploads verified syllabus files (PDF/DOCX); views reviewer feedback comments; and resubmits revisions with side-by-side version comparison.

**Core Services & Modules (5 Services, 6 Microservice Modules):**

| Module / Service | Port | What it does |
| :--- | :---: | :--- |
| **API Gateway** | `:3000` | Unified entry point, JWT session routing, and external integration webhook dispatcher. |
| **Identity Service** | `:3001` | SCMS local account authentication (Argon2id password hashing), session tokens, and strict two-role scoping (Academic Head vs. Faculty Staff). No shared sign-in with CCMS or FMS (Decision A9). |
| **Requirements Service** | `:3002` | **Connects to CCMS.** Program requirement setup, term deadlines, and official academic calendar synchronization (`SCMS-018` / `AUD-023`). Ingests term boundaries, holidays, and intraday suspensions. |
| **Submission Service** | `:3003` | Syllabus file uploads (MongoDB GridFS), interactive PUPQC OBE Form Mode authoring, 6-stage status lifecycle (`Not Submitted`, `Submitted`, `Under Review`, `Returned`, `Resubmitted`, `Approved`), and multi-version history retention (`SCMS-021` / `AUD-013`). |
| **Audit Log Service** | `:3004` | Append-only, tamper-evident audit trail (`SCMS-014` / `AUD-019`). Rejects `UPDATE` and `DELETE` operations at the database level. Provides read-only viewer for the Academic Head (`SCMS-015` / `AUD-020`). |
| **Live Compliance & Integration Service** | `:3005` | **Connects to CCMS & FMS.** Real-time compliance matrix, BullMQ automated overdue evaluation cron (`SCMS-006` / `AUD-007`), 4-tier offline cache fallback (`SCMS-020` / `AUD-025`), and outbound compliance summary dispatcher to CCMS (`SCMS-019` / `AUD-024`). |

**Current Links to Other Systems:**
1. **SMS ↔ FMS:** SMS provides the Course Master SSOT (credit units, lecture/lab hours, facility flags) and Block Sections (`BSIT 4-1`). FMS pushes human-approved Teaching Assignments (`teaching_assignment.approved`) and verified Faculty Profiles (`fms_faculty_id`, display name, institutional email).
2. **CCMS → SCMS:** CCMS pushes campus academic term dates, holidays, and class suspensions. SCMS acknowledges each push via `POST /sync/ack`.
3. **SCMS → CCMS (Proposed Backlog Story SCMS-019):** SCMS pushes periodic, aggregate academic compliance status summaries to CCMS for university executive reporting.

---

## 1. Calendar and Term Dates

### 1. Does the ownership and direction match your understanding?
**YES, 100% agreed.**  
CCMS is the authoritative institutional Single Source of Truth (SSOT) for the campus academic calendar (term boundaries, statutory holidays, and official campus suspensions). CCMS pushes these dates to Audit (SCMS), and SCMS ingests them in a read-only manner. SCMS never alters official institutional dates.

### 2. Which of these does Audit need?
* **Audit (SCMS) NEEDS:**
  1. **Academic Term Dates:** Term name (e.g., `"A.Y. 2026-2027 1st Semester"`), start date (`YYYY-MM-DD`), and end date (`YYYY-MM-DD`). This establishes the active compliance window, countdown timers, and syllabus submission cycles.
  2. **Holidays:** Whole-day regular, special non-working, and local holidays.
  3. **Suspensions:** Whole-day or intraday suspensions with effective timestamps (e.g., suspension starting at 13:00 / 1:00 PM due to weather/calamity).
* **Audit (SCMS) DOES NOT NEED:**
  * **Office Working Hours (e.g., 8:00 AM – 5:00 PM):** Academic classes, laboratory periods, and faculty teaching assignments (governed between SMS and FMS) run on academic schedules (including evening classes from 5:30 PM to 8:30 PM). Citizen's Charter administrative office hours must **not** restrict or overwrite class timetables or syllabus submission deadlines.

### 3. Do you need the entry type?
**YES.**  
Audit ingests and records the `entry_type` in its audit trail. Functionally:
* `REGULAR_HOLIDAY`, `SPECIAL_NON_WORKING`, and `LOCAL_HOLIDAY` are treated as non-working class days: syllabus deadlines falling on these dates automatically roll over to the next regular class day.
* `SUSPENSION` is treated with intraday logic: if a suspension takes effect from 13:00, morning deadlines (e.g., 10:00 AM) remain valid, while afternoon/evening deadlines roll over to the next regular day.

### 4. Do you want the `applies_to` label (`WORK`, `CLASSES`, `BOTH`)?
**YES, WE STRONGLY RECOMMEND IT!**  
For Audit (SCMS), syllabus deadlines and faculty submissions strictly depend on entries marked **`CLASSES`** or **`BOTH`**.
* If a suspension applies *only* to `WORK` (e.g., administrative office closure or work-from-home, but online academic classes proceed as declared by university leadership), syllabus deadlines remain active.
* If CCMS leaves this field off by default, SCMS will treat all received holidays and suspensions as applying to `BOTH`. However, enabling `applies_to` provides superior precision.

### 5. How are your deadlines computed from the calendar and terms?
Audit adheres to the **Standard Philippine Civil Code Rule (Art. 13 - Exclusion of the First Day, Inclusion of the Last Day)**:
* When counting $N$ working days from an event: Day 0 (the date of notice) is excluded; working days are counted consecutively.
* Sundays, statutory holidays, and declared full-day suspensions are skipped.
* **Default Cut-off:** Deadlines default to **23:59:59 (Asia/Manila)** of the target date. If an intraday suspension takes effect prior to the deadline cutoff on that day, the deadline rolls over to 23:59:59 of the next active class day.

### 6. Date and time format
**`YYYY-MM-DD` and `HH:MM` in Asia/Manila (UTC+8) is completely acceptable.**  
Our internal services process full ISO-8601 strings (e.g., `2026-10-20T13:00:00+08:00`) and display them in localized Philippine format (`MM/DD/YYYY`).

### 7. Recurring holidays
**We strongly prefer CCMS to expand holidays per academic year/term.**  
Due to Philippine "Holiday Economics" presidential proclamations (moving holidays to Mondays or declaring one-off special non-working days), expanding the explicit calendar entries per term eliminates synchronization drift.

---

## 2. Receiving and Acknowledgment

### 8. How will Audit receive updates?
* **Primary Mechanism:** CCMS **PUSH** (event-driven).
* **Secondary Mechanism:** Audit on-demand **PULL / RECONCILE** (`GET /api/v1/calendar/active`) during cold-start boot or post-outage recovery.
* **Audit Webhook URL:** `POST /api/v1/integrations/ccms/calendar/push` (hosted by SCMS API Gateway on port `3000` in dev, or official staging/prod domain).
* **Payload:** JSON matching CCMS draft schema (`sync_id`, `schema_version`, `academic_term`, `holidays`, `suspensions`, `timestamp`).

### 9. Full snapshot or changes only?
**Full active term snapshot is strongly preferred.**  
An academic term calendar payload is compact (<15 KB). A full snapshot makes every push **completely idempotent**; SCMS simply upserts the term record and syncs the holiday/suspension collection without risking dropped deltas. If an urgent weather suspension occurs, CCMS can push an updated term snapshot or a delta event with the same `sync_id` format.

### 10. Acknowledgment
**YES, Audit will invoke `POST /sync/ack` on CCMS.**  
In addition, Audit immediately responds with HTTP 200 OK to the incoming push request.

* **Audit Success ACK Payload to CCMS (`POST /sync/ack`):**
  ```json
  {
    "sync_id": "ccms-sync-20261016-001",
    "status": "SUCCESS",
    "received_at": "2026-10-16T18:45:00+08:00",
    "system": "SCMS",
    "details": {
      "holidays_applied": 14,
      "suspensions_applied": 2,
      "active_term_id": "term-2026-1s"
    }
  }
  ```

* **Audit Error / Validation Failure ACK Payload (`POST /sync/ack`):**
  ```json
  {
    "sync_id": "ccms-sync-20261016-001",
    "status": "FAILED",
    "received_at": "2026-10-16T18:45:00+08:00",
    "system": "SCMS",
    "error": {
      "code": "SCHEMA_VALIDATION_ERROR",
      "message": "Missing required field: academic_term.start_date",
      "invalid_fields": ["academic_term.start_date"]
    }
  }
  ```

### 11. Version of the format
Including `"schema_version": "1.0.0"` in the root payload is an excellent approach.
* **Semantic Versioning:** Minor/patch additions (new optional fields) will be handled without breaking SCMS.
* **Major Breaking Changes:** We request that breaking schema changes be announced at least **7 business days in advance** with a sample JSON fixture in our joint repository/channel.

### 12. Duplicate or out-of-order pushes
* **Idempotency:** SCMS checks `sync_id` and payload `timestamp`.
* If a `sync_id` has already been processed, SCMS acknowledges it as a successful retry and does not duplicate database operations.
* If a push arrives with an older `timestamp` than the currently active term revision, SCMS logs it as a stale replay, discards the payload, and acknowledges receipt (Joint Acceptance Gate J10).

---

## 3. Access and Security

### 13. Authentication of calls both ways
* **Header:** `X-API-Key: <secret_token>` or `Authorization: Bearer <secret_token>`.
* **Key Provisioning:** Exchanged securely via environment configuration (`.env`). Never committed to public version control.
* **Rotation:** Rotated at mid-semester or upon project milestone transitions.

### 14. Environments
* **Local Development:** `http://localhost:3000/api/v1/integrations/ccms/calendar/push` (or Docker service hostname `http://requirements-service:3002/api/v1/calendar/sync-ccms`).
* **Staging / Testbed:** Dedicated staging URL provided upon network topology lock.
* **IP Whitelisting:** Permitted and supported on staging/production environments.

### 15. What data must never be sent?
**100% AGREED.**  
In strict compliance with **Republic Act 10173 (Data Privacy Act of 2012)**:
* CCMS must never send citizen personal data, tracking numbers, staff evaluations, or citizen complaint tickets.
* SCMS will never send individual student information or private faculty contact channels.
* Only public, institutional academic calendar milestones and aggregate compliance metrics are exchanged.

---

## 4. When Something Fails

### 16. If Audit is down
* CCMS's non-blocking retry with marked status `FAILED` is the correct architecture.
* **Outage Tolerance:** SCMS can be behind by **24 to 48 hours** without operational disruption because academic terms and statutory holidays are scheduled well in advance.
* For sudden weather suspensions, CCMS should retry with exponential backoff (e.g., 1 min, 5 min, 15 min, 1 hr). Once SCMS recovers, it ingests the suspension and recalculates overdue items automatically.

### 17. If CCMS is down or outdated
SCMS guarantees zero downtime through its **4-Tier Offline Fallback Architecture (`SCMS-020` / `AUD-025`):**
1. **Tier 1 (Warm Cache):** Serves cached CCMS calendar data from Redis/PostgreSQL (TTL 24 hours).
2. **Tier 2 (Expired / Stale Cache):** If CCMS is down beyond 24 hours, SCMS continues operating on the stale calendar and displays an amber UI notice:  
   *`"Academic calendar running on cached snapshot. External service reconnection pending."`*
3. **Tier 3 (Cold-Start Synthetic Fixtures):** If SCMS boots cold without prior CCMS connectivity, it loads verified synthetic fixtures (`fixtures/ccms_calendar_fixture.json`).
4. **Faculty Operations Preserved:** Syllabus composition, file uploads, and Academic Head reviews are **NEVER blocked** by a CCMS outage.

### 18. How will we find out a sync is broken?
* CCMS displays: `"Audit last synced: <time>"`.
* SCMS displays in the Academic Head dashboard: `"CCMS Calendar Status: Connected (Last Synced: <time>)"` (or amber warning if stale).
* Every attempt and error is logged in SCMS's append-only audit trail (`apps/audit-log-service`).
* Health Check Endpoint: `GET /api/v1/integrations/ccms/health` returns `{ "status": "UP", "last_sync": "..." }`.

### 19. Support contact on each side
* **SCMS Lead Developer / Project Lead:** Rod Benedict Tablizo (`rodbenedictbtablizo@iskolarngbayan.edu.ph`).
* **Communication Channel:** Capstone Multi-System Discord / GitHub Issues.

---

## 5. Identity and Other Links

### 20. Shared sign-in (Idea E23)
**We recommend KEEPING SEPARATE ACCOUNTS (affirming Decision A9).**  
* **Rationale:** CCMS users (Office Heads, Office Staff, Super Admins) manage Citizen's Charter transactions. SCMS users (Academic Head, Faculty Staff) manage syllabi and curricula.
* Separate local authentication (Argon2id) avoids a single point of failure (SPOF) and eliminates complex OAuth2/OIDC cross-team dependencies before defense. If institutional SSO is adopted in the future, it should be managed centrally by PUP ICTO.

### 21. Other links, and ideas for new integrations
* **Complaint Referrals (Decision A12):** CCMS referring staff-conduct complaints to FMS is correct. Audit does **NOT** handle staff disciplinary matters or citizen complaints.
* **Proposed Academic Compliance Push:** See Question 27 below for our major joint integration proposal!

### 22. Linking people
In SCMS, faculty identities are keyed to immutable `fms_faculty_id` from FMS, with verified PUP institutional email (`@iskolarngbayan.edu.ph` / `@pup.edu.ph`) as secondary. Matching via official institutional email is fully supported.

---

## 6. Delivery and Testing

### 23. Contract changes
* Contact: Rod Benedict Tablizo (SCMS Lead).
* Notice Period: 7 business days prior to breaking schema alterations.

### 24. Interface and test data availability
* **Sprint 7** is the scheduled target for live integration on both sides (`SCMS-018`, `SCMS-020`).
* Mock fixtures and schemas are available immediately in our repository under `fixtures/`.

### 25. Joint test scenarios
CCMS's proposed scenarios (a through e) are **approved** and map directly to our **Joint Acceptance Gate Matrix**:
* **Scenario A (Add Holiday & ACK):** Maps to **Gate J7**.
* **Scenario B (Audit Down & Retry):** Maps to **Gate J11**.
* **Scenario C (Edit Term Date):** Maps to **Gate J1**.
* **Scenario D (Invalid Key Rejection):** Maps to **Gate J13**.
* **Scenario E (13:00 Suspension Boundary):** Maps to **Gate J7 & J9**.
* **Two Added Scenarios from SCMS:**
  * **Scenario F (Office Hours Non-Interference - Gate J8):** Verify that CCMS 8:00–17:00 office hours do not alter or restrict 17:30–20:30 evening classes or syllabus deadlines.
  * **Scenario G (Idempotent Replay Discard - Gate J10):** Verify that resending an identical `sync_id` is acknowledged without duplicate database operations.

---

## 7. Major Integration Proposal & System Questions

### 26. What have we missed that could affect this agreement?
1. **Academic Term Code Standardization:** Please ensure academic terms follow a uniform naming standard:
   * `academic_year`: `"2026-2027"`
   * `semester`: `1` (or `"FIRST_SEMESTER"`)
   * `term_code`: `"2026-1S"`
   This ensures seamless 3-way alignment across SCMS, FMS, and CCMS.
2. **Explicit Timezone Declaration:** Ensure all date-times specify or assume `Asia/Manila` (UTC+8).

---

### 27. Do you want to propose another integration between Audit and CCMS?

### ⭐ YES! PROPOSAL: Academic Syllabus Compliance Summary Feed (SCMS → CCMS)
*This is an official user story in our Master Product Backlog: **`SCMS-019` (`AUD-024`)**.*

1. **What data goes from which system to which, and what it is used for:**
   * **Direction:** SCMS → CCMS (`POST /api/v1/integrations/academic-compliance/summary` on CCMS).
   * **Data Sent:** High-level, aggregated compliance statistics per academic program and term:
     ```json
     {
       "summary_id": "scms-comp-2026-1s-w2",
       "schema_version": "1.0.0",
       "academic_term": {
         "academic_year": "2026-2027",
         "semester": 1,
         "term_code": "2026-1S"
       },
       "campus": "PUP Quezon City Campus",
       "generated_at": "2026-10-16T18:00:00+08:00",
       "overall_metrics": {
         "total_courses_assigned": 142,
         "total_syllabi_required": 86,
         "approved_count": 68,
         "submitted_under_review_count": 12,
         "returned_revision_count": 4,
         "overdue_count": 2,
         "compliance_rate_percentage": 79.07
       },
       "program_breakdown": [
         {
           "program_code": "BSIT",
           "program_name": "Bachelor of Science in Information Technology",
           "required_count": 28,
           "approved_count": 24,
           "compliance_rate_percentage": 85.71
         },
         {
           "program_code": "BSBA-HRM",
           "program_name": "BSBA Human Resource Management",
           "required_count": 32,
           "approved_count": 25,
           "compliance_rate_percentage": 78.13
         }
       ]
     }
     ```

2. **Why it is useful (Value to CCMS & Campus Leadership):**
   * CCMS features an **Executive Campus-Wide Dashboard** intended for university executives (Campus Director, Academic Head, Administrative Officers).
   * Currently, CCMS only displays administrative office service timeliness.
   * By receiving this feed, the CCMS Executive Dashboard can render an **"Academic & Syllabus Compliance Overview"** widget! This provides the Campus Director with a single, unified executive screen covering both **Administrative Service Timeliness (CCMS)** and **Academic Instructional Compliance (SCMS)**.

3. **How often & who triggers:**
   * Dispatched automatically by SCMS on a scheduled weekly cron (e.g., Friday 18:00) and at key term milestones (Week 2 submission deadline, Midterms).
   * Can also be triggered on-demand by the Academic Head.

4. **What CCMS does with it, and what happens if missing/late:**
   * CCMS renders the aggregate percentages on its Executive Analytics page.
   * If the feed is missing or late, CCMS simply displays the last received milestone snapshot with a `"Last updated: <date>"` tag. Administrative Citizen's Charter monitoring is never blocked.

5. **Contains personal data?**
   * **NO PERSONAL DATA.** It contains zero student records, zero faculty names, and zero staff ratings. Strictly campus-wide and program-level counts and percentages.

6. **How urgent it is:**
   * Planned for **Sprint 8** (`SCMS-019` / `AUD-024`), with API contract and mock schema ready in **Sprint 7** alongside the calendar push.

---

### 28. Description of Audit for CCMS
*(Provided in full in the **Executive Overview: About Audit (ACAS / SCMS)** section at the top of this document).*
