# Requirements Service — PostgreSQL Database Migration (`sms_requirements`)

## 1. Overview

The **Requirements Service** (`apps/requirements-service`) has been migrated from in-memory/JSON fallback persistence to a dedicated **PostgreSQL** database (`sms_requirements` on port `5436`), following the SCMS Database-per-Service persistence architecture.

---

## 2. Summary of Changes

### Files Created
| File | Description |
| :--- | :--- |
| [`apps/requirements-service/src/calendar/term.repository.ts`](../apps/requirements-service/src/calendar/term.repository.ts) | Dedicated PostgreSQL repository (`TermRepository`) implementing full CRUD for `academic_terms` (`init`, `findAll`, `findById`, `findByCode`, `getActiveTerm`, `create`, `update`, `updateSubmissionWindow`, `updateStatus`, `delete`). |
| [`apps/requirements-service/src/test_requirements_db.ts`](../apps/requirements-service/src/test_requirements_db.ts) | End-to-end PostgreSQL verification test suite covering `academic_terms`, `requirements`, and `calendar_snapshots` CRUD operations as well as idempotent CCMS calendar snapshot pushes. |
| [`docs/requirements-service-migration.md`](./requirements-service-migration.md) | Migration documentation summarizing schema, refactored repositories, and test results. |

### Files Modified
| File | Description |
| :--- | :--- |
| [`apps/requirements-service/src/config/db.ts`](../apps/requirements-service/src/config/db.ts) | Configured `RequirementsPool` (`pool`, `requirementsPool`, `catalogPool`) connecting to `sms_requirements` on `localhost:5436` with user `scms_admin` and database `sms_requirements`. |
| [`apps/requirements-service/src/requirements/requirement.repository.ts`](../apps/requirements-service/src/requirements/requirement.repository.ts) | Removed `inMemoryFallback` array; injected `Pool`; implemented full PostgreSQL CRUD (`init`, `verifyProgramIsActive`, `findAll`, `findById`, `create`, `update`, `delete`) against the `requirements` table. |
| [`apps/requirements-service/src/calendar/calendar.repository.ts`](../apps/requirements-service/src/calendar/calendar.repository.ts) | Injected `Pool`; implemented full PostgreSQL CRUD (`init`, `findAllSnapshots`, `findSnapshotById`, `findSnapshotBySyncId`, `createSnapshot`, `updateSnapshot`, `deleteSnapshot`) for `calendar_snapshots`, plus transactional CCMS snapshot ingestion (`saveSnapshot`) and holiday/non-working day queries (`getEventsByTerm`, `isNonWorkingDay`). |
| [`apps/requirements-service/src/calendar/calendar.entity.ts`](../apps/requirements-service/src/calendar/calendar.entity.ts) | Added `CalendarSnapshot`, `CreateTermDto`, and `UpdateTermDto` interfaces and aligned `TermStatus` with the PostgreSQL `CHECK` constraint (`UPCOMING`, `ACTIVE`, `CLOSED`, `ARCHIVED`). |
| [`apps/requirements-service/src/calendar/term.controller.ts`](../apps/requirements-service/src/calendar/term.controller.ts) | Updated controller routes to use `termRepository` directly for listing terms, querying the active term, updating submission windows, and transitioning term statuses. |
| [`apps/requirements-service/src/main.ts`](../apps/requirements-service/src/main.ts) | Added `bootstrap()` to verify the PostgreSQL connection (`SELECT 1`), initialize schemas, and log `Connected to PostgreSQL sms_requirements` before starting the HTTP server. |

---

## 3. PostgreSQL Schema (`sms_requirements` — Port `5436`)

Defined in [`database/postgres/init-requirements.sql`](../database/postgres/init-requirements.sql) using the `pgcrypto` extension (`gen_random_uuid()`):

### 3.1 `academic_terms` (SMS-018)
| Column | Type | Constraints / Defaults |
| :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` |
| `term_code` | `VARCHAR(20)` | `UNIQUE NOT NULL` (e.g., `'2026-1S'`) |
| `academic_year` | `VARCHAR(20)` | `NOT NULL` (e.g., `'2026-2027'`) |
| `semester_number` | `INT` | `NOT NULL` |
| `semester_label` | `VARCHAR(30)` | `NOT NULL` |
| `display_label` | `VARCHAR(100)` | Nullable |
| `start_date` | `DATE` | Nullable |
| `end_date` | `DATE` | Nullable |
| `submission_window_start` | `TIMESTAMPTZ` | Nullable |
| `submission_window_end` | `TIMESTAMPTZ` | Nullable |
| `status` | `VARCHAR(20)` | `DEFAULT 'UPCOMING' CHECK (status IN ('UPCOMING', 'ACTIVE', 'CLOSED', 'ARCHIVED'))` |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT CURRENT_TIMESTAMP` |
| `updated_at` | `TIMESTAMPTZ` | `DEFAULT CURRENT_TIMESTAMP` |

- **Index:** `idx_term_status` on `academic_terms(status)`

### 3.2 `requirements` (SMS-004, SMS-005)
| Column | Type | Constraints / Defaults |
| :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` |
| `program_id` | `UUID` | Logical reference to `sms_catalog.programs(id)` |
| `program_code` | `VARCHAR(50)` | Program code (e.g., `'BSIT'`, `'BSBA-HRM'`) |
| `term_code` | `VARCHAR(20)` | `NOT NULL` — references `academic_terms(term_code)` |
| `requirement_type` | `VARCHAR(100)` | `NOT NULL DEFAULT 'OBTL_SYLLABUS'` |
| `name` | `VARCHAR(255)` | `NOT NULL` |
| `description` | `TEXT` | Nullable |
| `deadline_at` | `TIMESTAMPTZ` | Nullable |
| `status` | `VARCHAR(20)` | `NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'CLOSED'))` |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT CURRENT_TIMESTAMP` |
| `updated_at` | `TIMESTAMPTZ` | `DEFAULT CURRENT_TIMESTAMP` |

- **Indices:**
  - `idx_req_term` on `requirements(term_code)`
  - `idx_req_status` on `requirements(status)`

### 3.3 `calendar_snapshots` (SMS-032 CCMS Push)
| Column | Type | Constraints / Defaults |
| :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` |
| `sync_id` | `VARCHAR(100)` | `UNIQUE NOT NULL` (Enforces idempotent CCMS webhook ingestion) |
| `term_code` | `VARCHAR(20)` | `NOT NULL` |
| `payload` | `JSONB` | `NOT NULL` (Full CCMS calendar snapshot payload including holidays and suspensions) |
| `received_at` | `TIMESTAMPTZ` | `DEFAULT CURRENT_TIMESTAMP` |

---

## 4. Test Verification Results

Executed via:
```bash
npx tsx apps/requirements-service/src/test_requirements_db.ts
```

- **Total Assertions:** 23
- **Passed:** 23
- **Failed:** 0
- **Pass Rate:** **100% (23/23)**

### Verified Scenarios:
1. Database connection configuration (`localhost:5436`, database `sms_requirements`, user `scms_admin`).
2. `academic_terms` seed verification (`2026-1S`), active term lookup (`getActiveTerm`), creation (`create`), lookup by ID and code (`findById`, `findByCode`), submission window configuration (`updateSubmissionWindow`), status transitions (`updateStatus`), full update (`update`), and deletion (`delete`).
3. Cross-service program status check (`verifyProgramIsActive` for `BSIT` vs. `DOMT`) and `requirements` seed verification, creation (`create`), lookup by ID (`findById`), status publication (`update` to `PUBLISHED`), multi-filter querying (`findAll`), and deletion (`delete`).
4. `calendar_snapshots` creation (`createSnapshot`), lookup by ID and `sync_id` (`findSnapshotById`, `findSnapshotBySyncId`), update (`updateSnapshot`), listing (`findAllSnapshots`), deletion (`deleteSnapshot`), transactional CCMS push with idempotency check (`saveSnapshot`), and non-working day detection (`isNonWorkingDay`).

---

## 5. Known Limitations & Next Steps

1. **Cross-Database Foreign Keys:** Because `programs` reside in `sms_catalog` (port `5435`) and `requirements` reside in `sms_requirements` (port `5436`), program validation (`verifyProgramIsActive`) is enforced at the repository/service layer rather than via a cross-database SQL foreign key constraint.
2. **Event-Driven Deadline Roll-Forward:** When new `SUSPENSION` or `REGULAR_HOLIDAY` events arrive via `calendarRepository.saveSnapshot()`, automatic deadline roll-forward notifications can be dispatched over Redis/BullMQ to `submission-service`.

