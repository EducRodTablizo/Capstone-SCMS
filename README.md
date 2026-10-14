# Syllabus Compliance Monitoring System (SCMS)
**Polytechnic University of the Philippines — Quezon City Campus (PUPQC)**  
*Capstone Project by Donayre, Tablizo, Asusula, Bellen*

---

## 🎯 System Overview
The **Syllabus Compliance Monitoring System (SCMS)** is a real-time submission-tracking and compliance-monitoring platform for academic requirements at PUPQC. 

It empowers the **Academic Head** to define term-based curriculum requirements and deadlines, and provides **Faculty Staff** with a streamlined portal to submit and revise their syllabi. The Academic Head reviews each submission, and every review decision is automatically recorded in an immutable audit trail (who acted, what was done, and when) to guarantee institutional accountability and traceability.

### Key Characteristics:
* **Live Compliance View:** The system updates immediately via real-time events as submissions and decisions occur, providing an instant view of compliance without manual page refreshes.
* **Direct Compliance Model:** Compliance is the status of the submission itself (`Approved`, `Submitted`, `Under Review`, `Returned`, `Resubmitted`, `Not Submitted`, `Overdue`). SCMS does not compute a separate compliance score or level.
* **Two Roles Only:** Exactly two user roles exist: the **Academic Head** (one single reviewer/administrator for the campus) and **Faculty Staff**.
* **Decoupled Integrations:** Read-only faculty profile and subject assignment lookups from **FMS**; official term calendar from **CCMS**; automated compliance summary feed pushed to CCMS. No single sign-on (SSO) or shared user sessions.

---

## 👥 User Roles & Responsibilities
1. **Academic Head (Single Campus Reviewer):**
   * Sets requirements and deadlines per program and term.
   * Reviews all syllabus submissions; approves or returns them for revision.
   * Monitors live compliance across all programs in real time.
   * Inspects the tamper-evident audit trail.
2. **Faculty Staff:**
   * Views term requirements assigned to their taught subjects.
   * Submits syllabi via file upload or structured web form.
   * Revises and resubmits returned items based on the Academic Head's feedback.
   * Views real-time review status of their own submissions.

---

## 🔄 Submission Lifecycle
Every submission progresses through a standardized state machine:
* **`Not Submitted`**: The requirement is published for the term; faculty has not yet submitted.
* **`Submitted`**: Faculty uploaded syllabus/files; system records automatic timestamp.
* **`Under Review`**: The Academic Head is actively evaluating the submission.
* **`Returned`**: The Academic Head sent the syllabus back for revision.
* **`Resubmitted`**: Faculty uploaded a revised version; review cycle repeats until approved.
* **`Approved`**: The Academic Head accepted the submission; decision, reviewer name, and date are recorded.
* **`Overdue`**: Automatically calculated by the system when the current date exceeds the term deadline.

---

## 🚫 Explicit Out of Scope
* Any user role other than Academic Head and Faculty Staff (no Dean, Chair, or QA Staff roles).
* Restricting data by college or unit (the single Academic Head oversees the entire campus).
* Exporting reports to PDF or CSV (not included for now).
* Version history snapshots of previous drafts (not included for now).
* Separate compliance scoring algorithms or numerical levels.
* Faculty profile editing, scheduling, attendance, or workload calculation (owned by FMS).
* Term calendar and holiday administration (proposed to be owned by CCMS).
* Student-facing or public portals.
