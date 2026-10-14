# Product Steering: Syllabus Compliance Monitoring System (SCMS)

## 1. Product Purpose
The Syllabus Compliance Monitoring System (SCMS) is a real-time submission-tracking and compliance-monitoring platform developed for the Polytechnic University of the Philippines Quezon City Campus (PUPQC).

It allows the **Academic Head** to set what each academic program must submit every term and by when, and allows **Faculty Staff** to submit and revise their syllabi. The Academic Head reviews each submission, and every review decision is recorded with a comprehensive audit trail (who acted, what was done, and when) to ensure institutional accountability and traceability.

The system updates immediately as submissions and decisions are made, delivering a live view of who has and has not complied without manual page refreshes.

## 2. Target Audience & Roles (Two Roles Only)
The system defines **exactly two user roles**:
1. **Academic Head (Single Campus Administrator & Reviewer):**
   * Sets requirements and per-term deadlines for each program.
   * Reviews all program submissions and makes approval or return decisions (single approval level).
   * Monitors live compliance across all programs via the real-time compliance dashboard.
   * Views and inspects the tamper-evident audit trail.
   * There is exactly **one Academic Head**.
2. **Faculty Staff:**
   * Views term requirements assigned to their subjects.
   * Submits syllabi and files (as uploaded documents or forms).
   * Revises and resubmits returned items based on comments.
   * Views their own submissions and live review statuses.
   * Cannot approve submissions or alter requirement definitions.

## 3. Core Product Principles
1. **Direct Compliance Definition:** Compliance is the status of each submission itself (`Approved`, `Submitted`, `Under Review`, `Returned`, `Resubmitted`, `Not Submitted`, `Overdue`). SCMS **does not compute a separate compliance score or level**.
2. **Real-Time Live Updates:** Live compliance updates are pushed immediately upon submission or review decision (via WebSockets / Server-Sent Events).
3. **Audit Trail Accountability:** Every submission action, review decision, and status mutation is timestamped and attributed to the acting user. Audit records are immutable and cannot be edited or deleted.
4. **Data Privacy (RA 10173):** Local user accounts are maintained independently (no SSO with FMS or CCMS). Read-only lookup to FMS fetches only necessary faculty profile fields (name, college, unit) and subject assignments.
5. **Decoupled Interoperability & Fallback:** System-to-system links with FMS and CCMS carry data or events only, never borrowed credentials. If FMS or CCMS is unreachable, SCMS continues recording submissions and reviews using cached reference data and displays a non-blocking notice.

## 4. Explicit Out of Scope
* Any user role other than the Academic Head and Faculty Staff (no Dean, Department Chair, or QA Staff roles).
* Restricting data by college or unit (since there is one Academic Head overseeing all campus programs).
* Exporting reports to PDF or CSV (not included for now).
* Version history archiving of submissions (not included for now).
* Separate compliance scoring algorithms or numerical levels.
* Faculty profile creation or editing (owned by FMS).
* Attendance, scheduling, workload, or credential functions (owned by FMS).
* Term calendar and holiday management (proposed to be owned by CCMS).
* Complaint case handling and Citizen's Charter standards (owned by CCMS).
* Student-facing and public-facing portals.
