# Master Product Backlog Comparative Analysis: Current (24 Stories / 86 Pts) vs. Complete New Architecture (35 Stories / SMS-001 to SMS-035)

**Date:** October 19, 2026  
**Status:** Definitive Architecture & Sprint Reconciliation  
**Target System:** Academic Catalog & Syllabus Management System (ACAS / SMS)

---

## 1. Executive Verdict: Which is the Right and Properly One to Build?

**[Certain] Ang Bagong 35-Story Backlog (`SMS-001` to `SMS-035`) ang TOTOONG sistema na dapat i-build, HINDI ang lumang 24-story backlog.**

* **Bakit Mali ang Lumang 24-Story Backlog (`docs/product_backlog.md`):**
  Ang lumang backlog ay sumasaklaw lamang sa *Syllabus Compliance Monitoring* (Audit). Bulag ito sa buong kalahati ng system: ang **Academic Catalog Core** (Programs, Courses, Curricula, Block Sections), bulag sa **M2M Security Protocols**, at walang kakayahang mag-compile ng official **PUPQC OBTL Syllabus PDF** na may official signatory blocks. Kung ito ang binuo, babagsak ang buong 3-system integration dahil walang makukuhang official course catalogue ang FMS.
* **Bakit Superior ang Bagong 35-Story Backlog:**
  Sinasalamin nito ang 100% ng pinagkasunduang kontrata sa pagitan ng SMS, FMS, at CCMS:
  1. Buong Catalog SSOT (`SMS-021`, `SMS-022`, `SMS-030`, `SMS-031`, `SMS-026`, `SMS-027`).
  2. Matibay na M2M Auth (`SMS-028`) gamit ang OAuth 2.0 Bearer tokens at API keys.
  3. Tunay na CCMS Calendar Engine (`SMS-032`, `SMS-033`, `SMS-034`) na may suspension rules at 23:59:59 cut-off.
  4. Kumpletong OBTL Syllabus compilation na may 4-line signatory block (`SMS-024`, `SMS-025`, `SMS-035`).
  5. Makatarungang handling ng reassignments at withdrawals sa pamamagitan ng `UNASSIGNED` status (`SMS-006`, `SMS-009`, `SMS-023`).

**Ang Kritikal na Omission na Kailangang Ibalik:**
Kahit superior ang bagong backlog, nagbawas ito ng **dalawang mahahalagang QA features** na hinahanap ng accreditors:
1. **Compliance Matrix CSV/PDF Export (dating `AUD-016`):** Kailangan ito ng Academic Head para sa external reporting sa University QA at CHED.
2. **Submission Version History Comparison (dating `AUD-013`):** Kailangan ng reviewer para makita ang diff ng dating draft laban sa resubmitted file.

---

## 2. Complete Story-by-Story Breakdown across 8 Sprints (35 Stories)

| Sprint | Story ID | User Story Title / Summary | Requirements Reference | Strategic Role & Status |
| :---: | :--- | :--- | :--- | :--- |
| **S1** | `SMS-001` | Local Account Authentication (Argon2id, separate accounts) | Identity and Access | **Foundation:** Local auth, no SSO dependency. |
| **S1** | `SMS-002` | Role-Based Access Scoping (Academic Head vs Faculty Staff) | Identity and Access | **Foundation:** Scoped reads & 403 enforcement. |
| **S1** | `SMS-003` | Faculty Data Privacy (RA 10173 minimal fields) | Identity and Access | **Compliance:** Privacy boundary enforcement. |
| **S1** | `SMS-014` | Tamper-Evident Audit Logging (Append-only) | Audit Log | **Foundation:** DB-level tamper protection. |
| **S1** | `SMS-021` | Program Catalogue Management (e.g. BSIT) | Requirements & Deadline | **NEW CATALOG:** Base container for requirements. |
| **S2** | `SMS-004` | Define Requirements per Program per Term | Requirements & Deadline | Requirement types & descriptions. |
| **S2** | `SMS-022` | Course Catalogue Management (Code, Units, Versioning) | Requirements & Deadline | **NEW CATALOG:** Immutable versioning, lab specs. |
| **S2** | `SMS-030` | Curricula & Course Membership (e.g. BSIT-2024) | Requirements & Deadline | **NEW CATALOG:** Links courses to programs/semesters. |
| **S2** | `SMS-031` | Block Sections Management (e.g. BSIT 4-1) | Requirements & Deadline | **NEW CATALOG:** Cohort identity; dissolving unassigns. |
| **S3** | `SMS-005` | Set Term Deadlines & Submission Windows | Requirements & Deadline | Term submission windows. |
| **S3** | `SMS-018` | Academic Terms in SMS (Dates received from CCMS) | Requirements & Deadline | Term metadata SSOT. |
| **S3** | `SMS-032` | CCMS Calendar Push Snapshot Ingestion | Requirements & Deadline | **NEW INTEGRATION:** Ingests holidays & suspensions. |
| **S3** | `SMS-033` | Calendar-Aware Deadline Calculation Engine | Requirements & Deadline | **NEW LOGIC:** Skips Sundays/holidays, 23:59:59 cut-off. |
| **S4** | `SMS-016` | Read Minimal Faculty Profiles from FMS (24h cache) | FMS & CCMS Integration | Instructor identity resolution. |
| **S4** | `SMS-026` | FMS Course Catalogue Retrieval API (Cursor paged) | FMS & CCMS Integration | **NEW API:** Paged catalog endpoint for FMS. |
| **S4** | `SMS-028` | Secure Exchanges via M2M Bearer Tokens & TLS 1.3 | FMS & CCMS Integration | **NEW SECURITY:** OAuth 2.0 client credentials. |
| **S5** | `SMS-006` | Automated Overdue Engine (Excludes `UNASSIGNED`) | Requirements & Deadline | Overdue calculation logic. |
| **S5** | `SMS-007` | Faculty Checklist per Assigned Course Section | Submission and Review | Faculty view of required items. |
| **S5** | `SMS-008` | Syllabus Submission (PDF/DOCX Upload & OBE Form) | Submission and Review | GridFS/local storage & timestamping. |
| **S5** | `SMS-009` | 7-Status Submission Lifecycle State Machine | Submission and Review | Enforces transitions including `UNASSIGNED`. |
| **S5** | `SMS-017` | Ingest FMS Teaching Assignments (Webhook) | FMS & CCMS Integration | Auto-creates tracking entries. |
| **S6** | `SMS-010` | Academic Head Single-Level Review (Approve/Return) | Submission and Review | Records reviewer, timestamp, and comments. |
| **S6** | `SMS-011` | Faculty Review Comments & Resubmission Loop | Submission and Review | Re-upload cycle until approved. |
| **S6** | `SMS-012` | Live Compliance Monitoring Matrix | Compliance Monitoring | Filterable dashboard with status counts. |
| **S6** | `SMS-013` | Real-Time WebSocket Compliance View Updates | Compliance Monitoring | Zero manual refresh updates. |
| **S6** | `SMS-015` | Audit Trail UI Viewer & Filtering | Audit Log | Read-only tamper-evident audit history. |
| **S6** | `SMS-024` | Locked Syllabus Header Prefill from FMS & Assignments | Submission and Review | **NEW OBTL:** Auto-fills faculty & section data. |
| **S7** | `SMS-019` | Outbound CCMS Compliance Summary Push | FMS & CCMS Integration | Weekly/milestone aggregate payload push. |
| **S7** | `SMS-023` | FMS Assignment Changes, Reassignments & Substitutes | Submission and Review | **NEW RESILIENCE:** Assignment version bump & unassigned. |
| **S7** | `SMS-025` | PUPQC OBTL Syllabus PDF Compiler & Signatories | Submission and Review | **NEW COMPILATION:** Official 4-line signatory block. |
| **S7** | `SMS-035` | Signatory Configuration (Campus Director & VP) | Requirements & Deadline | **NEW SIGNATORY:** Academic Head configures titles. |
| **S8** | `SMS-020` | FMS Offline 4-State Fallback & Reconciliation | FMS & CCMS Integration | Warm/expired cache, fixtures & auto-reconnect. |
| **S8** | `SMS-027` | Outbound Catalogue Change Events to FMS (Retries) | FMS & CCMS Integration | **NEW WEBHOOK:** Notifies FMS on catalog changes. |
| **S8** | `SMS-029` | Health Checks, Structured Errors & Test Seed Data | FMS & CCMS Integration | **NEW GATEWAY:** Test harness & status diagnostics. |
| **S8** | `SMS-034` | CCMS Offline Fallback (24h Cache, Stale Banner) | FMS & CCMS Integration | **NEW RESILIENCE:** Continues deadline calculations. |

---

## 3. Inconsistencies & Structural Gaps Resolved

1. **System Identity & Scope:**
   * *Old Backlog:* Nakapokus lang sa Audit/Syllabus compliance. Akala mo hiwalay na module lang.
   * *New 35-Story Backlog:* Kinikilala ang system bilang **Academic Catalog & Syllabus Management System (ACAS / SMS)** na siyang Authoritative Source ng buong PUPQC academic curriculum bago pa mag-assign ang FMS.
2. **Missing Catalog Architecture in Old Backlog:**
   * Ang lumang backlog ay walang paraan para gumawa ng kurso, mag-assign ng prerequisite, magtala ng curriculum, o mag-define ng block section tulad ng `BSIT 4-1`. Lahat ito ay nalutas sa `SMS-021`, `SMS-022`, `SMS-030`, at `SMS-031`.
3. **Calendar & Deadline Engine Precision:**
   * Sa lumang backlog, ang calendar ay basta "sync" lang sa Sprint 7.
   * Sa bagong backlog (`SMS-032`, `SMS-033`), may explicit rules:
     * Exclude Sundays, non-working holidays, and class suspensions.
     * Deadline cut-off is strictly **23:59:59 Asia/Manila**.
     * Automatic push-out to the next regular class day kapag may suspension.
4. **Machine Security & OAuth 2.0:**
   * Ang lumang backlog ay walang security model para sa inter-system communication.
   * Ang bagong backlog (`SMS-028`) ay pormal na nag-e-enforce ng **M2M Bearer Tokens (OAuth 2.0 client credentials)** para sa FMS at **API Key / Bearer** para sa CCMS sa ibabaw ng TLS 1.3.

---

## 4. Final Sprint Balancing & Recommendations

Upang hindi sumabog ang development team at masiguro ang 100% compliance sa defense:

1. **I-adopt nang Buo ang 35 User Stories (`SMS-001` to `SMS-035`).**
2. **Ibalik ang 2 Dropped Accreditation Epics sa angkop na Sprints:**
   * **`SMS-036` (dating `AUD-013`):** Submission Version History Comparison (Ilagay sa **Sprint 6** kasama ng `SMS-010`/`SMS-011`).
   * **`SMS-037` (dating `AUD-016`):** Compliance Monitoring CSV/PDF Export (Ilagay sa **Sprint 7** kasama ng `SMS-025`/`SMS-019`).
3. **Sprint Velocity Check (Average: 4–5 stories bawat Sprint):**
   * S1: 5 stories (Auth, RBAC, Privacy, Audit, Programs)
   * S2: 4 stories (Requirements, Course Catalogue, Curricula, Block Sections)
   * S3: 4 stories (Deadlines, Terms, CCMS Calendar Push, Calendar Calculation)
   * S4: 3 stories (FMS Profile, Catalogue API, M2M Security)
   * S5: 5 stories (Overdue Engine, Checklist, Submission, Status Machine, Assignments)
   * S6: 7 stories (Review, Resubmit, Live View, WebSocket, Audit Viewer, Header Prefill, **+ Version History**)
   * S7: 5 stories (CCMS Push, Reassignments, OBTL PDF, Signatories, **+ Matrix Export**)
   * S8: 4 stories (FMS Offline, Catalogue Webhooks, Health Checks, CCMS Offline)
