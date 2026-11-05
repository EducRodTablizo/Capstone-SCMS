# Syllabus Compliance Monitoring System (SCMS)
**Polytechnic University of the Philippines — Quezon City Campus (PUPQC)**  
*Capstone Project by Donayre, Tablizo, Asusula, Bellen*

---

## 🎯 System Overview
The **Syllabus Compliance Monitoring System (SCMS)** is an enterprise, real-time submission-tracking and compliance-monitoring platform for Outcomes-Based Education (OBE) syllabi at PUP Quezon City Campus.

It empowers the **Academic Head** to define term-based curriculum requirements and deadlines, and provides **Faculty Staff** with a streamlined portal to submit, compose, and revise their syllabi. The Academic Head reviews each submission, and every review decision is automatically recorded in an immutable audit trail (who acted, what was done, and when) to guarantee institutional accountability and traceability.

### Key Characteristics:
* **Live Compliance View:** The system updates immediately via real-time WebSocket events as submissions and decisions occur, providing an instant view of compliance without manual page refreshes.
* **Direct Compliance Model:** Compliance is the status of the submission itself (`Approved`, `Submitted`, `Under Review`, `Returned`, `Resubmitted`, `Not Submitted`, `Overdue`, `Unassigned`). SCMS does not compute an arbitrary compliance percentage or score.
* **Two Roles Only:** Exactly two user roles exist: the **Academic Head** (one single reviewer/administrator for the campus) and **Faculty Staff**.
* **Tri-System Integrations:** SMS integrates with the PUP QC AAIP Clerk Shared SSO for authentication. Local Argon2id remains as an emergency fallback. Read-only faculty profiles and teaching assignments from **FMS**; official statutory campus calendar from **CCMS**; automated compliance summary feed pushed to CCMS.
* **Polyglot Persistence & 4-Tier Resilience:** 6 isolated PostgreSQL microservice databases, MongoDB GridFS for syllabus documents, Redis Pub/Sub, and an embedded in-memory fallback engine that ensures continuous operation even when external systems or databases are offline.

---

## 👥 User Roles & Responsibilities
1. **Academic Head (Single Campus Reviewer):**
   * Sets requirements and deadlines per program and term.
   * Reviews all syllabus submissions; approves or returns them for revision.
   * Monitors live compliance across all campus programs in real time.
   * Inspects the tamper-evident audit trail and verifies cryptographic hash chains.
   * Exports official compliance reports to PDF and CSV for AACCUP/CHED QA audits.
2. **Faculty Staff:**
   * Views term requirements assigned to their taught subjects.
   * Submits syllabi via file upload (PDF/DOCX) or structured interactive PUPQC OBE form.
   * Revises and resubmits returned items based on the Academic Head's feedback.
   * Views real-time review status of their own submissions.

---

## 🔄 Submission Lifecycle
Every submission progresses through a standardized 7-status state machine:
* **`Not Submitted`**: The requirement is published for the term; faculty has not yet submitted.
* **`Submitted`**: Faculty uploaded syllabus/files; system records automatic timestamp.
* **`Under Review`**: The Academic Head is actively evaluating the submission.
* **`Returned`**: The Academic Head sent the syllabus back for revision with mandatory feedback.
* **`Resubmitted`**: Faculty uploaded a revised version; review cycle repeats until approved.
* **`Approved`**: The Academic Head accepted the submission; decision, reviewer name, and date are recorded.
* **`Overdue`**: Automatically calculated by the system when the current date exceeds the term deadline.
* **`Unassigned`**: Special lifecycle state when a section is dissolved or an assignment is withdrawn by FMS without penalizing faculty.

---

## 💻 Tech Stack & Architecture

| Layer | Technologies |
| :--- | :--- |
| **Frontend SPA** | React 18, TypeScript, Vite, Tailwind CSS, Radix UI / Shadcn, Lucide Icons, Date-fns |
| **API Gateway** | Express (Node.js/TypeScript), HTTP Reverse Proxy, Route Aggregator (Port `3000`) |
| **Backend Microservices** | 6 Express/TypeScript Microservices (Identity, Requirements, Submissions, Audit, Compliance, Academic Catalog) |
| **Databases** | 6 isolated PostgreSQL 16 databases, MongoDB 7.0 (GridFS), Redis 7 (Pub/Sub & BullMQ) |
| **Database Tooling** | Adminer Web GUI (Port `8080`) |
| **Security & Auth** | Argon2id password hashing, HTTP-only JWT cookies & Bearer tokens, SHA-256 HMAC digest validation |

---

## 🚀 Setup & Installation Guide (Start to Finish)

Follow these steps sequentially to set up and run the system on your machine upon cloning.

### 1. Prerequisites
Ensure you have the following installed on your machine:
* **Node.js**: `v20.x` or `v22.x` LTS ([Download Node.js](https://nodejs.org/))
* **Package Manager**: `pnpm` (recommended, `npm install -g pnpm`) or `npm` (v10+)
* **Docker & Docker Compose**: Docker Desktop running with Linux container support ([Download Docker Desktop](https://www.docker.com/products/docker-desktop/))
* **Git**: Installed and available in your terminal path

---

### 2. Clone the Repository
Open your terminal (PowerShell, Command Prompt, or Bash) and clone the repository:

```bash
git clone https://github.com/EducRodTablizo/Capstone-SCMS.git
cd Capstone-ACAS
```

---

### 3. Environment Configuration (`.env`)
Create your local environment file by copying `.env.example`:

**Windows (PowerShell / CMD):**
```powershell
copy .env.example .env
```

**macOS / Linux:**
```bash
cp .env.example .env
```

The default `.env` is pre-configured with secure developer credentials:

```ini
# Local Development Flag
# Set to 'true' when running microservices on localhost (outside Docker container network)
# Set to 'false' when running all microservices containerized inside Docker Compose
LOCAL_DEV=true

# Database Credentials
POSTGRES_USER=scms_admin
POSTGRES_PASSWORD=scms_secure_pass_2026
POSTGRES_DB=sms_identity

# MongoDB Credentials
MONGO_INITDB_ROOT_USERNAME=scms_admin
MONGO_INITDB_ROOT_PASSWORD=scms_mongo_pass_2026
MONGO_INITDB_DATABASE=scms_documents

# Application Ports
GATEWAY_PORT=3000
IDENTITY_SERVICE_PORT=3001
REQUIREMENTS_SERVICE_PORT=3002
SUBMISSION_SERVICE_PORT=3003
AUDIT_SERVICE_PORT=3004
COMPLIANCE_SERVICE_PORT=3005
ACADEMIC_CATALOG_PORT=3006
CLIENT_PORT=5173

# Frontend Origin
CLIENT_ORIGIN=http://localhost:5173

# Redis Cache
REDIS_URL=redis://localhost:6379

# JWT Security
JWT_SECRET=pup_scms_super_secret_jwt_key_sprint1_2026
JWT_EXPIRATION=86400
```

---

### 4. Install Dependencies
Install all monorepo dependencies across the workspace using `pnpm` (or `npm`):

```bash
pnpm install
```
*(If using npm: `npm install`)*

> [!NOTE]
> Native builds for `argon2` and `esbuild` are pre-authorized in `package.json` and `pnpm-workspace.yaml`.

---

### 5. Running the System

You have two primary ways to run the project:

#### 🌟 Option A: One-Click Startup Script (Windows Recommended)
The fastest way to launch the entire stack on Windows:

```bash
npm run start:services
```
*Or simply double-click **`start-all-services.bat`** from File Explorer.*

**What this script does:**
1. Spins up Docker database infrastructure (6 PostgreSQL instances, MongoDB, Redis, Adminer).
2. Waits 5 seconds for databases to initialize schemas and seed tables.
3. Automatically opens separate terminal windows running all 7 microservices and the Vite React frontend.

---

#### 🐳 Option B: Full Docker Compose Mode (All-in-One)
To run all databases **and** all containerized Node.js microservices inside Docker:

```bash
# 1. Start all containers (databases + microservices)
docker-compose up -d

# 2. Start the Vite React client locally
pnpm run dev
# (or: npm run dev)
```

---

#### 🧪 Option C: Offline / Sandboxed Mode (No Docker Required)
If you do not have Docker installed or running, **SCMS can still run!**
Each microservice has a built-in embedded relational and document memory engine pre-seeded with sample records (`init-identity.sql`, `init-catalog.sql`, synthetic CCMS calendars, and FMS teaching assignments).
You can start any microservice directly using `npm run dev` inside its directory under `apps/`, and it will automatically fall back to its embedded engine.

---

### 6. Service Endpoints & Port Map

Once started, the following services and endpoints will be active:

| Service / Component | Port | Local URL | Primary Responsibility |
| :--- | :---: | :--- | :--- |
| **Frontend Web Client** | `:5173` | [http://localhost:5173](http://localhost:5173) | React 18 SPA (Login, Dashboard, OBE Forms, Compliance Matrix) |
| **API Gateway (Ingress)** | `:3000` | [http://localhost:3000](http://localhost:3000) | Single reverse proxy entry point ([Health Check](http://localhost:3000/health)) |
| **Identity Service** | `:3001` | [http://localhost:3001](http://localhost:3001) | User authentication, Argon2id passwords, JWT issuance (`/api/v1/auth`) |
| **Requirements Service** | `:3002` | [http://localhost:3002](http://localhost:3002) | Program submission requirements, CCMS calendar sync (`/api/v1/requirements`, `/api/v1/terms`) |
| **Submission Service** | `:3003` | [http://localhost:3003](http://localhost:3003) | Syllabus uploads (GridFS), OBE form authoring, review workflow (`/api/v1/submissions`) |
| **Audit Log Service** | `:3004` | [http://localhost:3004](http://localhost:3004) | Tamper-evident append-only audit trail (`/api/v1/audit-logs`, `/api/v1/audit-logs/verify`) |
| **Compliance Service** | `:3005` | [http://localhost:3005](http://localhost:3005) | Live compliance metrics, CCMS summaries, WebSocket server (`/api/v1/compliance`, `ws://localhost:3005/ws`) |
| **Academic Catalog (SSOT)**| `:3006` | [http://localhost:3006](http://localhost:3006) | Institutional master catalog: Programs, Courses, Curricula, Block Sections (`/api/v1/courses`) |
| **Adminer Database GUI** | `:8080` | [http://localhost:8080](http://localhost:8080) | Web-based database management interface for PostgreSQL & MongoDB |

#### Individual PostgreSQL Databases (Docker Container Ports):
* **Identity DB:** `localhost:5434` (`sms_identity`)
* **Catalog DB:** `localhost:5435` (`sms_catalog`)
* **Requirements DB:** `localhost:5436` (`sms_requirements`)
* **Submissions DB:** `localhost:5437` (`sms_submissions`)
* **Audit DB:** `localhost:5438` (`sms_audit`)
* **Compliance DB:** `localhost:5439` (`sms_compliance`)
* **MongoDB:** `localhost:27017` (`scms_documents`)
* **Redis:** `localhost:6379`

---

## 🔑 Default Seed Accounts (Log In to Test)

The database is pre-seeded with authorized accounts representing the two system personas:

| Role | Email | Password | Persona & Department |
| :--- | :--- | :--- | :--- |
| **Academic Head** | `academic.head@pup.edu.ph` | `AcademicHead2026!` | **Dr. Maria Santos**<br>Office of Academic Affairs (Single Campus Reviewer) |
| **Faculty Staff** | `faculty.donayre@pup.edu.ph` | `Faculty2026!` | **Prof. Juan Donayre**<br>Information Technology Department |
| **Faculty Staff** | `faculty.tablizo@pup.edu.ph` | `Faculty2026!` | **Prof. Rod Tablizo**<br>Secondary Education Department |

---

## 🧪 Verification & Automated Testing

### 1. Run End-to-End Integration Suite
To execute the automated end-to-end integration test (tests login, course retrieval, requirement listing, submission detail, and cryptographic audit hash validation through the API Gateway):

```bash
npm run test:e2e
```
*(or `npx tsx test_e2e.ts`)*

### 2. Run Sprint-Specific Test Suites
You can run automated verification test suites for each individual microservice:

```bash
# Sprint 1 Verification (Identity, Argon2id, Role Scoping, Data Privacy)
cd apps/identity-service && npx tsx src/test_sprint1.ts

# Sprint 2 Phase 1 (Academic Catalog SSOT: Programs, Courses, Curricula, Block Sections)
cd apps/academic-catalog-service && npx tsx src/test_sprint2_phase1.ts

# Sprint 2 Phase 2 (Requirements, Terms & Calendar Synchronization)
cd apps/requirements-service && npx tsx src/test_sprint2_phase2.ts

# Sprint 6 & 7 (Compliance Metrics, WebSocket Ingestion, CSV/PDF Export)
cd apps/compliance-monitoring-service && npx tsx src/test_sprint7_compliance.ts
```

---

## 🛑 Stopping the Services

To shut down all running services and database containers cleanly:

**Windows (One-Click):**
```bash
npm run stop:services
```
*Or double-click **`stop-all-services.bat`**.*

**Manual Docker Shutdown:**
```bash
docker-compose down
```

---

## 🔧 Troubleshooting & Common Issues

### 1. Port Already in Use (`EADDRINUSE: 3000-3006` or `5173`)
If a previous session did not close cleanly:
* **Windows:** Open Command Prompt as Administrator and run:
  ```cmd
  taskkill /f /im node.exe
  ```
* **macOS / Linux:**
  ```bash
  killall node
  ```

### 2. Gateway Returns `503 Service Unavailable`
If the API Gateway returns HTTP 503 when proxying requests:
* Verify that the downstream microservice for that route is running on its designated port (`3001`–`3006`).
* Verify that `LOCAL_DEV=true` is set in your `.env` file so the Gateway proxies to `localhost` rather than internal Docker container network names.

### 3. Docker Databases Seeding Delay
On initial startup, PostgreSQL containers execute initialization scripts from `database/postgres/`. If you attempt to sign in immediately after running `docker-compose up -d`, allow **5 to 10 seconds** for all tables and Argon2id user seeds to finish mounting.

### 4. Adminer Login Details
To inspect the PostgreSQL databases in your browser at `http://localhost:8080`:
* **System:** PostgreSQL
* **Server:** `scms_postgres_identity` (or `localhost:5434` if connecting from host)
* **Username:** `scms_admin`
* **Password:** `scms_secure_pass_2026`
* **Database:** `sms_identity` (or `sms_catalog`, `sms_requirements`, etc.)

---

## 📁 Repository Structure

```text
Capstone-ACAS/
├── apps/                                  # Monorepo Microservices (Workspace Packages)
│   ├── academic-catalog-service/          # Port 3006: Programs, Courses, Curricula, Sections (SSOT)
│   ├── api-gateway/                       # Port 3000: Ingress Reverse Proxy & Route Dispatcher
│   ├── audit-log-service/                 # Port 3004: Tamper-Evident SHA-256 Audit Trail
│   ├── compliance-monitoring-service/     # Port 3005: Compliance Matrix, WebSockets, CCMS Push
│   ├── identity-service/                  # Port 3001: Local Accounts, Argon2id & JWT Auth
│   ├── requirements-service/              # Port 3002: Requirements, Deadlines, CCMS Calendar Ingestion
│   └── submission-service/                # Port 3003: Syllabus GridFS Uploads & OBTL Review Workflow
├── database/                              # Database Schemas & Migrations
│   └── postgres/                          # SQL initialization scripts for each microservice DB
├── docs/                                  # Institutional Specifications & Integration Contracts
│   ├── fms_integration_response.md        # Confirmed FMS Sample Messages & Exchange Contract
│   ├── ccms_integration_response.md       # Confirmed CCMS Calendar Integration Contract
│   ├── fms_sms_integration_contract.md    # Multi-system joint acceptance gate (J1–J16)
│   └── product_backlog.md                 # Complete 37-story Master Product Backlog
├── fixtures/                              # Certified synthetic fixture datasets for offline demo
├── src/                                   # Frontend React 18 Application (Vite + Tailwind CSS)
│   ├── auth/                              # Authentication state context & role guards
│   ├── components/                        # Reusable UI component library (Shadcn/Radix)
│   ├── pages/                             # Application views (Dashboard, Reviews, Forms, Matrix)
│   └── services/                          # API clients and WebSocket real-time subscription
├── docker-compose.yml                     # Multi-container infrastructure definition
├── start-all-services.bat                 # One-click Windows development startup script
├── stop-all-services.bat                  # One-click Windows shutdown script
├── test_e2e.ts                            # Automated End-to-End integration test
└── package.json                           # Root scripts and workspace definition
```

---

## 📜 Academic Integrity & License
Polytechnic University of the Philippines — Quezon City Campus  
Department of Information Technology  
*Capstone Project Academic Year 2026–2027*
