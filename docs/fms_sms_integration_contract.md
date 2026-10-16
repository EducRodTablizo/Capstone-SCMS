# FMS – SMS Integration Contract & Discovery Resolution Specification
**Document Version:** 1.0.0 (Post-Assessment Resolution)  
**Date:** 2026-10-16  
**Status:** Agreed Reconciliation Draft for Joint Demo Acceptance (J1–J16 Gate)  
**Authoring Teams:** Syllabus Management System (SMS / ACAS) Team in response to Faculty Management System (FMS) Team Review

---

## 1. Executive Position & Core Boundary Alignment

The SMS team formally accepts the **Consolidated FMS Position (dated 2026-10-16)** and reconciles all previously ambiguous proposals into this binding technical specification.

### 1.1 Single Source of Truth (SSOT) Boundaries
1. **SMS is the Authoritative Master for:**
   * **Programs:** Degree programs (e.g., BSIT).
   * **Curriculum Versions:** Formal curriculum structures (e.g., BSIT-2024-Curriculum).
   * **Courses:** Continuing course catalog (formerly referred to as "Subjects") and immutable course versions.
   * **Academic Terms:** Official semester and term definitions (e.g., A.Y. 2026-2027, 1st Semester).
   * **Block Sections:** Stable academic cohort class sections (e.g., BSIT 4-1, BSIT 4-2).
2. **FMS is the Authoritative Master for:**
   * **Faculty Profiles:** HR identities, employee records, academic ranks, and official consultation details.
   * **Teaching Assignments:** Human-approved instructor allocations to Course-Section-Term tuples.
   * **Physical Class Timetable & Space:** Schedule day/time meeting periods and physical classroom/laboratory allocations.
3. **CCCMS Boundary:**
   * Calendar-only integration for statutory academic calendar dates. No Faculty Profile feed, student complaint workflow, or office working hours overlap.

---

## 2. Definitive Answers to FMS Discovery Findings (S1 – S9)

### Ref S1: Teaching Assignment Allocation vs. Timetable Finalization
* **FMS Question:** *Does SMS need a human-approved allocation before a timetable exists? Which precise FMS event starts tracking, and can schedule fields remain absent until schedule finalization?*
* **SMS Answer & Specification:**
  * **YES, SMS requires tracking to start at the Human-Approved Allocation stage**, well before physical room and timetable finalization.
  * **Operational Rationale:** At PUPQC, the Academic Head assigns faculty loads 4–6 weeks prior to semester opening. Syllabus authoring, departmental standardization, and Dean/Chair review must occur *before* Day 1 of classes. Timetables (rooms and day slots) are typically finalized days before classes start and do not alter course outcomes.
  * **Precise Triggering Event:** `teaching_assignment.approved`
  * **Schedule Nullability:** Schedule fields (`schedule_day_time`, `room_id`, `room_label`) are **strictly optional/nullable (`null`)** at this initial stage. SMS provisions the syllabus compliance tracking ticket with status `NOT_SUBMITTED` immediately upon receiving `teaching_assignment.approved`. When timetable details are later locked, FMS emits `teaching_assignment.schedule_finalized`, updating only the schedule metadata without modifying the syllabus compliance state.

```json
// Inbound Payload: teaching_assignment.approved (Initial Stage)
{
  "event_type": "teaching_assignment.approved",
  "event_id": "evt-771a-4901",
  "timestamp": "2026-08-15T09:00:00Z",
  "assignment_id": "ta-2026-0081",
  "assignment_version": 1,
  "academic_term_id": "term-2026-1s",
  "course_id": "crs-inte401",
  "block_section_id": "sec-bsit-4-1",
  "faculty_id": "fac-1092",
  "status": "APPROVED",
  "schedule": null
}
```

---

### Ref S2: Assignment Lifecycle (Reassignment, Withdrawal, Substitution & Dissolution)
* **FMS Question:** *Supply the complete state/event model and examples for reassignment, withdrawal and substitution. Is the same assignment updated, or is a replacement linked? Confirm that withdrawing an assignment is distinct from dissolving a Block Section.*
* **SMS Answer & Specification:**
  * **Withdrawal vs. Section Dissolution:**
    * **Assignment Withdrawal:** Dissociates an instructor from a course section (e.g., faculty medical leave). The Block Section (`BSIT 4-1`) remains active.
    * **Block Section Dissolution:** An SMS-owned event where the academic section is dissolved (e.g., insufficient enrollment). Dissolution triggers automated cancellation of all associated assignments.
  * **State & Event Model:**
    1. **Reassignment (Permanent Instructor Change):**
       * Model: The existing `assignment_id` is updated with the new `faculty_id`, incrementing `assignment_version`.
       * SMS Policy: If the syllabus is still `NOT_SUBMITTED` or `RETURNED`, the compliance requirement shifts immediately to the incoming faculty member. If already `APPROVED`, the approved syllabus remains locked and valid; the new faculty member automatically inherits and adopts the approved master syllabus.
    2. **Assignment Withdrawal:**
       * Event: `teaching_assignment.withdrawn`
       * Model: `status: "WITHDRAWN"`. SMS transitions the compliance requirement to `UNASSIGNED`. It does not penalize the departed faculty member.
    3. **Temporary Substitution:**
       * Model: Preserves the primary faculty. FMS provides conditional fields: `substitute_faculty_id` and `substitution_window`.
       * SMS Policy: Aligned with FMS position (*"Temporary Substitution does not transfer primary syllabus responsibility"*). The primary faculty remains legally accountable on the syllabus signatory block. The substitute instructor receives read-only co-instructor permissions.

```json
// Event: Reassignment
{
  "event_type": "teaching_assignment.reassigned",
  "assignment_id": "ta-2026-0081",
  "assignment_version": 2,
  "previous_faculty_id": "fac-1092",
  "new_faculty_id": "fac-2045",
  "effective_date": "2026-09-01",
  "reason": "DEPT_REALLOCATION"
}
```

---

### Ref S3: Course Identifier Architecture & Evolution Over Time
* **FMS Question:** *Does `course_id` identify a continuing Course or one immutable version? Show before/after examples for a rename, changed Contact Hours, retirement and replacement, including the identifier/version retained by existing assignments.*
* **SMS Answer & Specification:**
  * **Two-Tier Identifier Model:**
    * `course_id` (UUID): Identifies the **continuing conceptual Course** across all university history (e.g., `crs-inte401` persists across decades).
    * `course_version_id` (UUID): Identifies an **immutable version / curriculum specification** of that course.
    * FMS Teaching Assignments reference the continuing `course_id` and `academic_term_id`. SMS dynamically resolves the effective `course_version_id` active for that term.
  * **Lifecycle Scenarios:**
    1. **Course Renaming / Minor Fix:** `course_id` remains identical. Title updates; `version` increments from `1.0` to `1.1`. Historical assignments automatically display the updated title.
    2. **Changed Contact Hours / Units (Curriculum Shift):**
       * Version A (Term 2024–2025): `crs-inte401-v1`, 3 units (2 lec / 3 lab = 5 contact hrs).
       * Version B (Term 2026–2027): `crs-inte401-v2`, 3 units (3 lec / 0 lab = 3 contact hrs).
       * Past assignments permanently point to Version A; new assignments bind to Version B.
    3. **Course Retirement & Replacement:**
       * Retired course has `status: "RETIRED"`, `is_assignable: false`, and `replaced_by_course_id: "crs-csec401"`.
       * Existing assignments for past academic terms retain `crs-inte401` for accreditation audits. FMS is prevented from issuing new assignments for retired courses.

---

### Ref S4: Program, Curriculum Version & Course Membership Taxonomy
* **FMS Question:** *Define Program versus curriculum version versus Course membership, whether a Course can belong to several Programs, and each entity's status/effective-term vocabulary.*
* **SMS Answer & Specification:**
  * **Structural Taxonomy:**
    1. **Program (`program_id`):** The degree program (e.g., `BSIT`). Status: `ACTIVE`, `PHASED_OUT`.
    2. **Curriculum Version (`curriculum_id`):** Specific cohort curriculum blueprint (e.g., `BSIT-2024-Curriculum`). Status: `DRAFT`, `ACTIVE`, `SUPERSEDED`.
    3. **Course (`course_id`):** The accredited course unit.
    4. **Course Membership (Many-to-Many):** **A Course CAN belong to multiple Programs.** For instance, `INTE 401` or common GE courses (e.g., `MATH 101`) belong to both `BSIT` and `BSCS`.
  * **Membership Junction (`curriculum_courses`):**
    * `{ curriculum_id, course_id, year_level: 4, semester: 1, is_major: true }`
  * **Strict Entity Lifecycle Enums:**
    * Program Status: `ACTIVE` | `PHASED_OUT`
    * Course Status: `DRAFT` | `ACTIVE` | `REVISED` | `RETIRED`
    * Block Section Status: `ACTIVE` | `DISSOLVED` | `MERGED`
    * Academic Term Status: `UPCOMING` | `ACTIVE` | `CLOSED` | `ARCHIVED`

---

### Ref S5: Hours, Contact Calculations & Room Capability Separation
* **FMS Question:** *Are these clock hours, and must total Contact Hours equal lecture plus lab hours? What meeting and laboratory requirements can SMS supply, and which must Head/Staff configure in FMS?*
* **SMS Answer & Specification:**
  * **Clock Hours Definition:** All hours are weekly **clock hours (60 minutes)**.
  * **Mathematical Consistency Rule:**
    $$\text{contact\_hours\_per\_week} = \text{lecture\_hours} + \text{lab\_hours}$$
    *Example (INTE 401):* 3 Credit Units = 2.0 Lecture Hours + 3.0 Lab Hours = **5.0 Total Contact Hours per week**.
  * **Division of Responsibility:**
    * **SMS Supplies:** `credit_units`, `lecture_hours`, `lab_hours`, `contact_hours_per_week`, and facility requirement tags:
      * `requires_laboratory: true`
      * `laboratory_type: "COMPUTER_LAB"`
      * `special_software_requirements: ["Wireshark", "Kali Linux", "Docker"]`
    * **FMS Configures:** Day of week meeting splits (e.g., 2 hrs Mon lecture, 3 hrs Thu lab), time period slots, physical room selection (e.g., "Lab 3"), and building capacity validation.

---

### Ref S6: Catalogue Discovery, Pagination & HTTP Semantics
* **FMS Question:** *How does a consumer reliably discover retirement, replacement, deletion and concurrent updates? Provide complete snapshot/change examples and distinct missing/retired/denied/failure meanings.*
* **SMS Answer & Specification:**
  * **Discovery Endpoint:**
    `GET /api/v1/catalogue/courses?updated_since=2026-08-01T00:00:00Z&cursor=xyz&limit=50`
  * **Pagination Schema:** Keyspace cursor pagination with deterministic ordering by `updated_at ASC, course_id ASC`.
  * **Soft-Deletion & Retirement Discovery:** SMS never permanently hard-deletes courses. A retired course is returned in the change feed with `status: "RETIRED"`, `is_assignable: false`, and `effective_end_term`.
  * **Distinct Error Code Meanings:**
    * `404 NOT_FOUND`: The course ID does not exist in the institutional registry.
    * `200 OK with status: RETIRED`: The course exists historically but is phased out; FMS assignment validation must reject assignment attempts for future terms.
    * `403 FORBIDDEN`: Client credentials valid but lack `read:catalogue` permission scope.
    * `503 SERVICE_UNAVAILABLE`: Temporary SMS system downtime; triggers FMS cache fallback.

---

### Ref S7: Stable Block Section & Offering Identifier Schema
* **FMS Question:** *Supply SMS-owned Course, Academic Term and stable Block Section IDs with their revisions/effectivity and display labels. FMS assignments reference these identifiers; how are cohort identity, term-specific labels and offering relationships represented?*
* **SMS Answer & Specification:**
  * **SMS Master Entities:**
    1. **Academic Term:**
       * `academic_term_id`: `"term-2026-1s"`
       * `academic_year`: `"2026-2027"`
       * `semester`: `"1ST_SEMESTER"`
       * `display_label`: `"A.Y. 2026-2027 First Semester"`
    2. **Block Section:**
       * `block_section_id`: `"sec-bsit-4-1"`
       * `program_id`: `"prog-bsit-001"`
       * `cohort_admission_year`: `2023`
       * `year_level`: `4`
       * `section_number`: `1`
       * `display_label`: `"BSIT 4-1"`
       * `status`: `"ACTIVE"`
  * **Offering Relationship in FMS:** FMS links these SMS-owned keys into an assignment offering:
    `{ assignment_id, academic_term_id, course_id, block_section_id, faculty_id }`.

---

### Ref S8: Delivery Guarantees, Idempotency & Reconciliation Contract
* **FMS Question:** *How do duplicate creation, lost acknowledgements, revisions, stale messages and receiver downtime behave? Supply an idempotent change/reconciliation contract and a dated compatibility/test plan.*
* **SMS Answer & Specification:**
  * **Idempotency Strategy:**
    * Ingestion Endpoint: `PUT /api/v1/integration/fms/teaching-assignments/{assignment_id}`
    * Headers: `Idempotency-Key: {uuid}`, `X-FMS-Message-Timestamp: {iso8601}`
    * Payload includes monotonic `assignment_version`.
  * **Handling Edge Cases:**
    * *Duplicate Message / Lost ACK:* If SMS receives a payload with a previously processed `assignment_version`, it performs no state mutation and immediately returns HTTP `200 OK` with the existing stored record.
    * *Stale / Out-of-Order Message:* If incoming `assignment_version <= current_stored_version`, SMS rejects with HTTP `409 Conflict: STALE_VERSION`.
    * *Receiver Downtime Recovery:* During SMS downtime, FMS queues messages in a persistent dead-letter queue (DLQ). Upon reconnection, messages replay in monotonic version order.
  * **Bulk Reconciliation Endpoint:**
    * `POST /api/v1/integration/fms/teaching-assignments/reconcile`
    * FMS posts array of active assignment keys: `[{ assignment_id, assignment_version, status }]`. SMS returns diffs (missing, orphaned, out-of-sync).

---

### Ref S9: Faculty Profile Subset & Signatory Requirements
* **FMS Question:** *Supply the approved syllabus template or label these as demo proposals. Which exact name representation is consumed, whose signatories are needed?*
* **SMS Answer & Specification:**
  * **Faculty Profile Schema (Agreed Subset):**
    * Required: `faculty_id` (String), `display_name` (String, e.g., `"Asst. Prof. Juan Dela Cruz"`), `institutional_email` (String).
    * Conditional (Nullable): `academic_rank` (String), `consultation_hours` (String). If null, syllabus header displays standard departmental defaults.
  * **Signatory Hierarchy (PUPQC Official Syllabus Model):**
    The official university syllabus approval sequence consists of four distinct levels:
    1. **Prepared by:** Assigned Faculty Instructor (from FMS Assignment `display_name`).
    2. **Reviewed and Checked by:** Academic Head / Department Chair (Mastered in SMS).
    3. **Recommending Approval:** Campus Director (Mastered as Institutional Metadata in SMS).
    4. **Approved by:** Vice President for Campuses (Mastered as Institutional Metadata in SMS).
    * FMS only supplies Signatory Level 1 (Faculty). Signatory Levels 2, 3, and 4 are managed internally by SMS.

---

### Ref S10: Authentication, Machine Credentials & Identity Stability
* **FMS Question:** *Confirm stable provider issuer/subject for sign-in and FMS faculty ID for domain links; email changes must not relink identities. Select separate scoped machine credentials, delivery path and supported HTTPS configuration with us.*
* **SMS Answer & Specification:**
  * **Identity Decoupling from Email:**
    * **Human SSO / Sign-in:** Standard OpenID Connect (OIDC) using immutable subject claim (`sub: "auth0|usr_1092"`).
    * **Cross-System Domain Entity Link:** Bound strictly via immutable `fms_faculty_id` (e.g., `"fac-1092"` or UUID).
    * *Email Policy:* The `institutional_email` is strictly treated as a mutable contact and notification attribute. Any change to a faculty member's email address in FMS or SMS **never** breaks, unlinks, or relinks past teaching assignments, syllabi, or compliance audit logs.
  * **Machine-to-Machine (M2M) Scoped Credentials:**
    * Ingress and egress service communication uses OAuth 2.0 Client Credentials Grant with Bearer Tokens in HTTP headers: `Authorization: Bearer <m2m_jwt_token>`.
    * **Enforced Permission Scopes:**
      * FMS Service Account: `read:catalogue` (grants access to Courses, Programs, Terms, Block Sections) and `write:assignments` (grants access to deliver assignments).
      * SMS Service Account: `read:faculty_profile` (grants access to query faculty directory).
    * **Transport Security:** Strict HTTPS over TLS 1.3. For local and staging demonstration environments, mutual pre-shared service keys (`X-Service-Token`) are supported with scheduled rotation.

---

### Ref S11: Resilience, Cache Semantics, Expiry & Fixtures
* **FMS Question:** *Does 'offline' mean SMS is online while FMS is unavailable? What works after cache expiry or on first use? How are stale required fields, revoked access and missed assignment changes handled? Show cached live data versus labelled fixture behavior.*
* **SMS Answer & Specification:**
  * **Clarification of "Offline":**
    * "Offline" specifically designates that **SMS is fully operational and responsive to human users**, but the external FMS upstream service is temporarily unreachable (network timeout or HTTP 5xx error).
  * **Cold Start / First Use (Empty Cache Scenario):**
    * If SMS starts up with zero cached FMS data and cannot connect to FMS, SMS automatically activates its **certified synthetic demo fixture pack** (`fixtures/fms_synthetic_fixture.json`).
    * The UI displays an explicit non-blocking indicator: `[FIXTURE DATA: FMS UNCONNECTED]`. This guarantees that the capstone oral defense presentation can proceed seamlessly even if network connectivity fails.
  * **Cache Expiry (Post-24 Hour TTL):**
    * SMS implements a **Stale-While-Revalidate** caching pattern. When the 24-hour cache TTL expires while FMS remains unreachable, SMS **does not crash or lock users out**. It continues serving the stale cached snapshot for syllabus authoring while appending an advisory header: `X-SMS-Cache: STALE`.
  * **Handling Revoked Access & Missed Changes Upon Reconnection:**
    * Outage alone never cancels classes or deletes compliance records.
    * When FMS connectivity is restored, SMS automatically invokes the bulk reconciliation endpoint (`POST /api/v1/integration/fms/teaching-assignments/reconcile`), synchronizing all missed assignment modifications, reassignments, and instructor de-allocations.

---

### Ref S12: Scope Corrections (Enrolment, Penalties & Policies)
* **FMS Question:** *Remove enrolment management from the FMS contract. Keep SMS compliance rules and any validated deadlines inside SMS; confirm FMS need not supply penalties, evaluation scores or unverified institutional policy.*
* **SMS Answer & Specification:**
  * **Enrolment Management 100% Removed:** FMS is completely exempted from tracking student enrollments, class sizes, or student rosters in this contract. SMS monitors compliance strictly at the Block Section level (`BSIT 4-1`), not individual student enrollment rosters.
  * **Compliance Rules Encapsulated in SMS:** All statutory deadlines, term submission countdown timers, overdue calculations, and compliance evaluation scores are **100% owned and calculated inside SMS**.
  * **FMS Exemption Confirmed:** FMS is **not required** to supply HR penalties, faculty evaluation demerits, or institutional policy rules. FMS simply publishes assignment lifecycle events (`approved`, `reassigned`, `withdrawn`).

---

### Ref S13: Concrete Artifacts, Hosted URLs & Joint Test Fixtures
* **FMS Question:** *Provide the repository/document URLs, implementation or mock revision, hosted base URL, synthetic fixtures and joint-test contact/window. Which capabilities have actually been exercised against another system?*
* **SMS Answer & Specification:**
  * **Artifact Repositories & Contract Documents:**
    * Monorepo: `https://github.com/EducRodTablizo/Capstone-SCMS.git` (Branch: `sprint-2-1.0`)
    * Contract Document: `docs/fms_sms_integration_contract.md`
    * Interactive Architecture Diagrams: `docs/diagrams_interactive_viewer.html`
  * **Reachable Service Base URLs:**
    * Local/Staging Gateway: `http://localhost:3000`
    * Catalogue Provider API: `http://localhost:3000/api/v1/catalogue`
    * FMS Assignment Receiver: `http://localhost:3000/api/v1/integration/fms/teaching-assignments`
  * **Joint Acceptance Testing (J1–J16 Gate):**
    * SMS provides certified synthetic fixture datasets (Program: `BSIT`, Course: `INTE 401`, Section: `BSIT 4-1`, Faculty: `fac-1092` "Asst. Prof. Juan Dela Cruz").
    * SMS commits to participating in the two complete joint rehearsal test windows prior to the final defense.

---

## 3. Four Core System-to-System Exchange Contracts (Aligned with Image 5)

Based on the confirmed FMS-SMS matrix, the four primary authoritative exchanges are formally specified below:

### Contract 1: SMS $\rightarrow$ FMS: Program & Curriculum
* **Owner:** SMS | **Consumer:** FMS
* **Required Fields:**
  * `program_id` (UUID): Stable degree program identity (e.g., `"prog-bsit-001"`).
  * `program_code` (String): Degree acronym (e.g., `"BSIT"`).
  * `program_title` (String): Full official title (e.g., `"Bachelor of Science in Information Technology"`).
  * `curriculum_id` (UUID): Explicit curriculum version (e.g., `"curr-bsit-2024"`).
  * `effective_start_term` (String): Term from which this curriculum applies.
  * `status` (Enum: `ACTIVE` | `PHASED_OUT`).

### Contract 2: SMS $\rightarrow$ FMS: Academic Term & Block Section
* **Owner:** SMS | **Consumer:** FMS
* **Required Fields:**
  * **Academic Term:** `academic_term_id` (UUID), `academic_year` (e.g., `"2026-2027"`), `semester` (`"1ST_SEMESTER"`), `start_date`, `end_date`, `status` (`"ACTIVE"`).
  * **Block Section:** `block_section_id` (UUID), `display_label` (e.g., `"BSIT 4-1"`), `program_id`, `cohort_admission_year` (`2023`), `year_level` (`4`), `section_number` (`1`), `status` (`"ACTIVE"`).

### Contract 3: SMS $\rightarrow$ FMS: Course Master
* **Owner:** SMS | **Consumer:** FMS
* **Required Fields:**
  * `course_id` (UUID): Continuing conceptual course ID.
  * `course_version_id` (UUID): Immutable version consumed for the active term.
  * `course_code` (String): e.g., `"INTE 401"`.
  * `course_title` (String): e.g., `"Information Assurance and Security 2"`.
  * `credit_units` (Integer): Total units (e.g., `3`).
  * `lecture_hours` (Decimal): Weekly lecture clock hours (e.g., `2.0`).
  * `lab_hours` (Decimal): Weekly lab clock hours (e.g., `3.0`).
  * `contact_hours_per_week` (Decimal): `lecture_hours + lab_hours` (e.g., `5.0`).
  * `requires_laboratory` (Boolean): e.g., `true`.
  * `status` (Enum: `ACTIVE` | `RETIRED`).

### Contract 4: FMS $\rightarrow$ SMS: Teaching Assignment
* **Owner:** FMS | **Consumer:** SMS
* **Required Fields:**
  * `assignment_id` (UUID): Stable assignment key.
  * `assignment_version` (Integer): Monotonic version counter for idempotency.
  * `academic_term_id` (UUID): Target academic term.
  * `course_id` (UUID): Target course.
  * `block_section_id` (UUID): Target stable block section.
  * `faculty_id` (UUID): Primary assigned instructor.
  * `assignment_status` (Enum: `APPROVED` | `REASSIGNED` | `WITHDRAWN`).
  * `schedule` (Object, Optional/Nullable): Finalized meeting and room details (sent only after timetable finalization).

---

---

## 4. Operational Update, Access & Outage Ground Rules (Pages 12–13 Alignment)

To guarantee mutual reliability during live staging and capstone defense evaluation, the following nine operational rules govern the SMS–FMS interface:

1. **Versioned Schemas & Pre-Agreed Fixtures:**
   * All interfaces separate transport protocol versioning (`/api/v1/`), entity revisions (monotonic version integers), and effective term timestamps.
   * Null/absent field semantics and status enums are agreed prior to code freeze.
2. **REST Catalogue Pull as Primary Interface:**
   * FMS consumes the SMS catalogue via standard HTTP REST pull (`GET /api/v1/catalogue/courses`).
   * Complete snapshots explicitly surface lifecycle states (`ACTIVE`, `REVISED`, `RETIRED`). Phased-out courses are never silently hidden from change feeds.
   * Redis or message broker dependencies are strictly internal to SMS and are **not** imposed as prerequisites on FMS.
3. **Idempotent Assignment Delivery:**
   * FMS assignment delivery to SMS must be idempotent. Re-sending an identical assignment version produces exactly one compliance tracking ticket.
   * Stale or out-of-order changes are rejected via monotonic version comparison (`assignment_version`).
4. **CCCMS Calendar Separation:**
   * CCCMS integration is calendar-only. Office working hours are never imported as academic timetable constraints.
5. **Separation of Human Authentication from Machine Credentials:**
   * Human users authenticate via shared identity provider (OIDC).
   * System-to-system exchanges use scoped machine credentials (Bearer tokens/API keys) over HTTPS (TLS 1.3).
   * Local application authorization remains strictly partitioned: each application controls its own role-based access.
6. **Preserved FMS Cache Behavior:**
   * FMS retains cached catalogue snapshots with visible retrieval timestamps.
   * Catalogue unreachability never blocks existing operational schedules or cancels classes. Course retirement blocks new allocations but does not disrupt active semester classes.
7. **Outage Resilience & Independent Operations:**
   * An external system outage alone never cancels university classes.
   * Local manual calendar exceptions may be recorded by department chairs with reasoning and time boundaries.
8. **Explicit Cache State Demonstrations (SMS Resilience):**
   * SMS explicitly models and demonstrates four operational states:
     1. *Warm Cache:* Active cached FMS profiles served instantly (<5ms).
     2. *Expired Cache:* Stale-while-revalidate serving with `[CACHED SNAPSHOT - STALE]` advisory tag.
     3. *Empty Cache / Cold Start:* Fallback to labelled synthetic fixtures (`[FIXTURE DATA: FMS UNCONNECTED]`).
     4. *Required Field Absence:* Graceful default fallback for missing consultation hours.
9. **Rehearsed Operator Recovery Path:**
   * If automated retries exhaust during a defense session, a manual operator refresh endpoint (`POST /api/v1/integration/fms/reconcile`) allows immediate on-demand synchronization.

---

## 5. Joint Acceptance Test Gate Matrix (Scenarios J1 to J16)

The following joint test cases define the observable acceptance gate for the hosted synthetic-data defense demo:

| Test ID | Joint Action Trigger | Required Observable Result |
| :---: | :--- | :--- |
| **J1** | **Catalogue Ingestion & Assignment Approval:**<br>FMS retrieves active SMS catalogue; approves a teaching assignment; delivers payload to SMS. | • Correct Course, faculty, term, and Block Section resolved.<br>• Exactly **one** SMS compliance tracking item created at `NOT_SUBMITTED` stage.<br>• Preliminary matching drafts do not spawn compliance tickets. |
| **J2** | **Timetable Finalization Post-Approval:**<br>FMS finalizes class timetable/room after assignment approval. | • Assignment and schedule states remain distinct.<br>• Schedule details update smoothly without creating duplicate compliance items or altering existing submission deadlines. |
| **J3** | **Reassignment, Withdrawal & Substitution:**<br>FMS reassigns course, issues withdrawal, and records a temporary substitute. | • Reassignment updates effective responsibility while preserving drafted syllabus history.<br>• Withdrawal pauses compliance ticket as `UNASSIGNED` without faculty penalty.<br>• Temporary substitute granted co-instructor read access without transferring legal syllabus signatory responsibility. |
| **J4** | **Course Revision / Retirement:**<br>SMS alters Contact Hours or retires a course with a replacement link. | • New assignments respect new curriculum applicability.<br>• Existing finalized schedules and historical compliance records remain preserved for accreditation audits. |
| **J5** | **Faculty Profile Updates:**<br>FMS updates faculty name/email; SMS refreshes syllabus header. | • Person-to-assignment links remain unbroken (keyed by `faculty_id`, immune to email changes).<br>• Missing consultation hours render standard default (`"By appointment via MS Teams"`). |
| **J6** | **Idempotency & Replay Protection:**<br>FMS repeats an assignment update, loses ACK, and delivers an older change later. | • Exactly one compliance item remains.<br>• No reversion to older state.<br>• Duplicate delivery acknowledged HTTP 200 without duplicate countdowns or side effects. |
| **J7** | **Calendar Holiday / Scope Handling:**<br>CCCMS announces a campus holiday vs. office-only event. | • Only applicable class meetings adjust.<br>• Office-only working hours do not disrupt academic teaching timetables. |
| **J8** | **Intraday Class Suspension:**<br>CCCMS announces 13:00 suspension affecting overlapping classes. | • Clear boundary evaluation in Asia/Manila timezone.<br>• No attendance penalties on cancelled meetings; no unverified automatic make-up class generated. |
| **J9** | **Calendar Event Correction:**<br>CCCMS corrects or withdraws a calendar event. | • Restrictions re-evaluated while preserving historical records and preventing duplicate restoration. |
| **J10** | **Out-of-Order Message Reconciliation:**<br>Deliver updates before adds, duplicate messages, and removals before delayed updates. | • Deterministic latest state established using monotonic `assignment_version` and tombstones.<br>• No resurrection of withdrawn assignments. |
| **J11** | **Service Restart & Snapshot Recovery:**<br>SMS restarts while FMS changes assignments; network disconnects then reconnects. | • Complete current snapshot reached upon reconnection.<br>• Stale state clearly indicated during disconnection; immediate recovery upon reconnection. |
| **J12** | **System Unavailability & Fixture Fallback:**<br>FMS is shut down (HTTP 503); SMS tested first with cache, then cold-start without cache. | • Warm cache serves instant profile.<br>• Cold start activates labelled synthetic fixture (`[FIXTURE DATA]`).<br>• Outage alone never crashes SMS or blocks faculty syllabus drafting. |
| **J13** | **Machine Security & Unauthorized Access:**<br>Deliver request with revoked/invalid machine token or unauthorized role scope. | • Immediate HTTP 401/403 denial.<br>• Zero data leakage or state mutation.<br>• Local RBAC roles enforced independently of external SSO. |
| **J14** | **Cross-Role Shared Sign-In:**<br>Login with faculty user vs. non-faculty administrative staff member. | • Identity validated; application authorizations partitioned locally.<br>• Non-faculty staff denied access to faculty syllabus authoring workspaces. |
| **J15** | **Schema Version Transition & Backward Compatibility:**<br>FMS sends payload with optional unknown fields or previous minor schema version. | • Unknown non-breaking fields safely ignored.<br>• System remains backward-compatible without runtime parser exceptions. |

| **J16** | **Block Section Renaming & Lifecycle Changes (Page 16):**<br>SMS renames a Block Section without changing its cohort ID (`BSIT 4-1` $\rightarrow$ `BSIT 4-1-A`); updates curriculum reference; retires a section; tested across warm, expired, and empty cache. | • Stable SMS cohort identity (`cohort_admission_year = 2023`) remains traceable across revisions.<br>• No competing local master created in FMS.<br>• Missing references cleanly block dependent approvals without crashing.<br>• Existing schedules/attendance history remain preserved; affected assignments flagged for review. |

---

## 6. Formal SMS Acceptance & Response Pack to FMS Draft Recommendations

In formal response to the **Draft recommendations to the other teams (Pages 16–17)**, the SMS team confirms the following actionable commitments:

### 6.1 Single Source of Truth & Terminology Harmonization
* **Course Terminology Confirmed:** SMS officially confirms the adoption of **"Course"** across all schemas, APIs, and documentation, retiring the earlier "Subject" wording.
* **Authoritative Boundary Confirmed:** SMS is the authoritative master for **Programs, Curriculum Versions, Courses, Academic Terms, and stable Block Sections**. FMS is the master for **Faculty Profiles, Teaching Assignments, and physical Timetable/Room schedules**.

### 6.2 Pre-Agreed Synthetic Fixture Pack & Repository Links
* **Contract Specification Document:** `docs/fms_sms_integration_contract.md`
* **SMS Catalogue Fixture File:** [`fixtures/sms_catalogue_fixture.json`](file:///C:/Users/Rod/Desktop/Capstone-ACAS/fixtures/sms_catalogue_fixture.json)
  * Includes `BSIT` Program (`prog-bsit-001`), `A.Y. 2026-2027 1st Semester` (`term-2026-1s`), `BSIT 4-1` (`sec-bsit-4-1`), and `INTE 401` (`crs-inte401`).
* **FMS Synthetic Input Fixture:** [`fixtures/fms_synthetic_fixture.json`](file:///C:/Users/Rod/Desktop/Capstone-ACAS/fixtures/fms_synthetic_fixture.json)
  * Includes authorized instructor `fac-1092` ("Asst. Prof. Juan Dela Cruz"), teaching assignment `ta-2026-0081`, and schedule finalization payloads.
* **Public/Staging Base URL:** `http://localhost:3000/api/v1`

### 6.3 Complete Entity Lifecycle Enums
* **Program Status:** `ACTIVE` | `PHASED_OUT`
* **Course Status:** `DRAFT` | `ACTIVE` | `REVISED` | `RETIRED`
* **Academic Term Status:** `UPCOMING` | `ACTIVE` | `CLOSED` | `ARCHIVED`
* **Block Section Status:** `ACTIVE` | `DISSOLVED` | `MERGED`
* **Teaching Assignment Status:** `APPROVED` | `SCHEDULE_FINALIZED` | `REASSIGNED` | `WITHDRAWN`

### 6.4 Operational Working Examples (Approval, Timetable, Reassignment, Withdrawal, & Renaming)

#### Example 1: Human-Approved Assignment (Pre-Timetable Tracking Trigger)
```json
// PUT /api/v1/integration/fms/teaching-assignments/ta-2026-0081
// Headers: Idempotency-Key: a1b2c3d4-e5f6-7890-abcd-ef1234567890
{
  "assignment_id": "ta-2026-0081",
  "assignment_version": 1,
  "academic_term_id": "term-2026-1s",
  "course_id": "crs-inte401",
  "block_section_id": "sec-bsit-4-1",
  "faculty_id": "fac-1092",
  "assignment_status": "APPROVED",
  "effective_date": "2026-08-15",
  "schedule": null
}
```
*Result:* SMS immediately creates exactly **one** compliance item (`NOT_SUBMITTED`) for Prof. Juan Dela Cruz for course `INTE 401` section `BSIT 4-1`.

#### Example 2: Schedule Finalization (Post-Approval Room/Timetable Delivery)
```json
// PUT /api/v1/integration/fms/teaching-assignments/ta-2026-0081
// Headers: Idempotency-Key: b2c3d4e5-f6a7-8901-bcde-f12345678901
{
  "assignment_id": "ta-2026-0081",
  "assignment_version": 2,
  "academic_term_id": "term-2026-1s",
  "course_id": "crs-inte401",
  "block_section_id": "sec-bsit-4-1",
  "faculty_id": "fac-1092",
  "assignment_status": "SCHEDULE_FINALIZED",
  "effective_date": "2026-08-25",
  "schedule": {
    "schedule_day_time": "Mon/Thu 1:00 PM - 3:30 PM",
    "room_id": "room-lab-03",
    "room_label": "Computer Lab 3"
  }
}
```
*Result:* Syllabus header schedule and room details update smoothly. Compliance status and deadline countdown are untouched.

#### Example 3: Reassignment (Instructor Shift)
```json
// PUT /api/v1/integration/fms/teaching-assignments/ta-2026-0081
// Headers: Idempotency-Key: c3d4e5f6-a7b8-9012-cdef-123456789012
{
  "assignment_id": "ta-2026-0081",
  "assignment_version": 3,
  "academic_term_id": "term-2026-1s",
  "course_id": "crs-inte401",
  "block_section_id": "sec-bsit-4-1",
  "faculty_id": "fac-2045",
  "assignment_status": "REASSIGNED",
  "effective_date": "2026-09-01",
  "reassignment_reason": "LOAD_REBALANCING"
}
```
*Result:* Active compliance responsibility transfers seamlessly to `fac-2045` ("Assoc. Prof. Maria Santos"). Drafted content is preserved.

#### Example 4: Block Section Renaming (Preserving Cohort Identity)
```json
// SMS-owned update: Block section renamed from "BSIT 4-1" to "BSIT 4-1-A"
{
  "block_section_id": "sec-bsit-4-1",
  "program_id": "prog-bsit-001",
  "cohort_admission_year": 2023,
  "year_level": 4,
  "section_number": 1,
  "display_label": "BSIT 4-1-A",
  "status": "ACTIVE"
}
```
*Result:* The stable `block_section_id` (`sec-bsit-4-1`) and cohort year (`2023`) remain unchanged. Historical assignments retain stable traceability without creating duplicate sections in FMS.

### 6.5 Confirmation of FMS Exemptions & Faculty Scope
1. **Enrolment Management 100% Removed from FMS:** SMS completely handles section-level tracking.
2. **Minimal Faculty Projection:** Initial subset is restricted strictly to `faculty_id`, `display_name`, and `institutional_email`.
3. **Internal Architecture Autonomy:** Redis pub/sub, Circuit Breakers (`SCMS-020`), and offline cache fallbacks remain internal to SMS. FMS simply interacts with standard HTTP/JSON REST contracts.
4. **Joint Rehearsal Window:** SMS officially accepts the **two complete demo rehearsals** prior to the final defense to validate scenarios **J1 through J16**.

---
