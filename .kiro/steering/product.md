# Product Steering: Academic Catalog & Syllabus Management System (ACAS / SCMS)

## 1. Product Identity & Multi-System Ecosystem
This system operates under the umbrella of **ACAS (Academic Catalog and Syllabus Management System)**, also referred to as **SMS (Syllabus Management System)** or **SCMS (Syllabus Compliance Monitoring System)** (Group 1). 

Within our university capstone ecosystem, three autonomous systems interoperate:
1. **ACAS / SMS / SCMS (Our System - Group 1):** The Single Source of Truth (SSOT) for the **Academic Programs Catalog**, **Course/Subject Master Catalog**, and the **Syllabus Compliance & Review Lifecycle**.
2. **Faculty Management System (FMS - Group 2):** The SSOT for **Faculty Profiles**, **Faculty Workload**, **Physical Rooms/Space**, and **Teaching Assignments** (who teaches what, when, and where).
3. **Citizen's Charter Management System (CCMS - Group 3):** The SSOT for the official **Academic Term Calendar** and campus-wide compliance summary dashboards.

## 2. Product Purpose
The system provides a real-time submission-tracking, OBE syllabus creation, and compliance-monitoring platform developed for the Polytechnic University of the Philippines Quezon City Campus (PUPQC).

It allows the **Academic Head** to define syllabus requirements and per-term deadlines for each program, and allows **Faculty Staff** to compose and submit syllabi (via structured form or file upload). The Academic Head reviews each submission, and every review decision is recorded in a tamper-evident, append-only audit trail.

The system updates immediately as submissions and decisions are made, delivering a live view of compliance without manual page refreshes.

## 3. Target Audience & Roles (Two Roles Only)
The system defines **exactly two user roles**:
1. **Academic Head (Single Campus Administrator & Reviewer):**
   * Sets requirements and per-term deadlines for each program.
   * Reviews all program submissions and makes single-level approval or return decisions (`APPROVED` or `RETURNED`).
   * Monitors live compliance across all campus programs.
   * Inspects the tamper-evident audit trail.
2. **Faculty Staff:**
   * Views term requirements and syllabus submission checklists for their assigned subjects.
   * Composes and submits syllabi (supporting official PUPQC OBE form template and file uploads).
   * Revises and resubmits returned items based on review feedback.
   * Views their own submissions and live review statuses under strict data privacy.

## 4. Scope Boundaries & Specific Entities
* **Academic Year & Semester (IN SCOPE):** Stored in `term_calendars` (e.g., `A.Y. 2026-2027 1st Semester`), used to anchor term requirements, active submission windows, and automated overdue calculations.
* **Sections (IN SCOPE as Class Metadata):** Ingested from FMS teaching assignments (e.g., `BSIT 4-1 & 4-2`) and displayed in the official syllabus Class Information block. FMS owns the creation and scheduling of sections.
* **Multi-Section Consolidation (IN SCOPE):** If an instructor teaches multiple sections of the same course, they submit one unified syllabus covering those sections.

## 5. Core Product Principles
1. **Direct Compliance Definition:** Compliance is the status of each submission itself (`Approved`, `Submitted`, `Under Review`, `Returned`, `Resubmitted`, `Not Submitted`, `Overdue`). SCMS **does not compute a separate numerical compliance score**.
2. **Real-Time Live Updates:** Live compliance updates are pushed immediately upon submission or review decision (via WebSockets / Server-Sent Events).
3. **Audit Trail Accountability (Append-Only):** Every action, deadline change, and review decision is timestamped and attributed. The database strictly rejects `UPDATE` and `DELETE` on audit records.
4. **Data Privacy (RA 10173):** Local user accounts are maintained independently with secure Argon2id password hashing. FMS queries fetch strictly minimal faculty attributes (`name`, `college`, `unit`).
5. **Document Confidentiality:** Uploaded and composed syllabus documents are strictly confidential, restricted to the owning faculty member and the Academic Head.
6. **Decoupled Interoperability & Resilient Fallback:** System links with FMS and CCMS exchange data or events only, never borrowed credentials. If FMS or CCMS is unreachable, ACAS/SCMS continues functioning using cached reference data via Circuit Breaker.

## 6. Explicit Out of Scope
* Any user role other than the Academic Head and Faculty Staff (no Dean, Department Chair, or QA Staff roles).
* Restricting data by college or unit (since there is one Academic Head overseeing all campus programs).
* Faculty profile creation, HR contracts, rank, or salary management (owned by FMS).
* Physical room scheduling and double-booking conflict resolution (owned by FMS).
* Term calendar and holiday management (owned by CCMS).
* Citizen's charter complaint case handling (owned by CCMS).
* Student-facing or public-facing portals.

