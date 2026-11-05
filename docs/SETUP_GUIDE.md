# Syllabus Compliance Monitoring System (SCMS)
## Complete Team Setup & Developer Onboarding Guide (Start to Finish)

**Polytechnic University of the Philippines — Quezon City Campus (PUPQC)**  
*Capstone Project by: Donayre, Tablizo, Asusula, Bellen*  
*Target Branch:* `feature/remove-duplication-and-update-document` (or `main`)  
*Last Updated:* November 2026

---

## 📋 Table of Contents
1. [Important Architecture Note (No More Duplicate Folders)](#1-important-architecture-note-no-more-duplicate-folders)
2. [Resolving the VS Code "Multiple Lockfiles" Notification](#2-resolving-the-vs-code-multiple-lockfiles-notification)
3. [Prerequisites Checklist](#3-prerequisites-checklist)
4. [Step-by-Step Installation (Start to Finish)](#4-step-by-step-installation-start-to-finish)
   * [Step 1: Clone & Switch Branch](#step-1-clone--switch-branch)
   * [Step 2: Environment Configuration (.env)](#step-2-environment-configuration-env)
   * [Step 3: Install Monorepo Dependencies](#step-3-install-monorepo-dependencies)
   * [Step 4: Launching the System](#step-4-launching-the-system)
     * [Option A: Hybrid Local Dev Mode (Windows Recommended)](#option-a-hybrid-local-dev-mode-windows-recommended)
     * [Option B: Full Docker Mode (Zero Terminal Clutter)](#option-b-full-docker-mode-zero-terminal-clutter)
5. [Verifying Your Setup](#5-verifying-your-setup)
6. [Seed Accounts & Login Credentials](#6-seed-accounts--login-credentials)
7. [Service Port Reference Map](#7-service-port-reference-map)
8. [Troubleshooting & Frequently Asked Questions (FAQ)](#8-troubleshooting--frequently-asked-questions-faq)

---

## 1. Important Architecture Note (No More Duplicate Folders)

> [!IMPORTANT]
> **The duplicate `frontend/` and `backend/` mirror directories have been permanently removed from the repository.**  
> In the past, edits made in `frontend/` or `backend/` would not reflect in Vite or Docker, causing synchronization bugs.

Please strictly follow the canonical monorepo directory layout:
* **Frontend SPA (Vite + React 18):** All client pages, components, hooks, and services live in **[`src/`](../src/)**.
* **Backend Microservices (Express + TypeScript):** All 6 microservices and the API gateway live in **[`apps/`](../apps/)**:
  - `apps/api-gateway` (Port `3000`)
  - `apps/identity-service` (Port `3001`)
  - `apps/requirements-service` (Port `3002`)
  - `apps/submission-service` (Port `3003`)
  - `apps/audit-log-service` (Port `3004`)
  - `apps/compliance-monitoring-service` (Port `3005`)
  - `apps/academic-catalog-service` (Port `3006`)

---

## 2. Resolving the VS Code "Multiple Lockfiles" Notification

### Why did you see this popup?
> *"Using npm as the preferred package manager. Found multiple lockfiles for ... To resolve this issue, delete the lockfiles that don't match your preferred package manager or change the setting 'npm.packageManager' to a value other than 'auto'."*

```
┌────────────────────────────────────────────────────────────────────────┐
│ ℹ Using npm as the preferred package manager. Found multiple lockfiles │
│   for Capstone-ACAS. To resolve this issue, delete the lockfiles that  │
│   don't match your preferred package manager or change the setting     │
│   "npm.packageManager" to a value other than "auto".                   │
└────────────────────────────────────────────────────────────────────────┘
```

1. **The Cause:** Our repository is configured as a **`pnpm` workspace** (`pnpm-workspace.yaml` and `pnpm-lock.yaml`). When someone inadvertently runs `npm install`, an `npm` lockfile (`package-lock.json`) is generated. VS Code's built-in NPM extension detects both lockfiles and cannot decide which package manager is primary.
2. **The Fix:** We have committed a workspace configuration file at [`.vscode/settings.json`](../.vscode/settings.json) containing:
   ```json
   {
     "npm.packageManager": "pnpm"
   }
   ```
   Once you pull the latest branch, VS Code will automatically use `pnpm` and the warning will disappear permanently.

---

## 3. Prerequisites Checklist

Before running the project, verify that your computer has the following tools installed:

| Tool | Recommended Version | Download Link / Command | Purpose |
| :--- | :---: | :--- | :--- |
| **Node.js** | `v20.x` or `v22.x` LTS | [nodejs.org](https://nodejs.org/) | JavaScript runtime for frontend and microservices |
| **PNPM** | `v9.x` or `v10.x` | `npm install -g pnpm` | Monorepo package manager (fast, disk-efficient) |
| **Git** | Latest | [git-scm.com](https://git-scm.com/) | Version control |
| **Docker Desktop** | Latest (WSL2 on Windows) | [docker.com](https://www.docker.com/products/docker-desktop/) | Hosts 6 PostgreSQL databases, MongoDB GridFS, and Redis |

> [!TIP]
> To check if tools are installed properly, open PowerShell or Terminal and run:
> ```powershell
> node -v
> pnpm -v
> docker --version
> git --version
> ```

---

## 4. Step-by-Step Installation (Start to Finish)

### Step 1: Clone & Switch Branch

Open your terminal and clone the repository:

```bash
git clone https://github.com/EducRodTablizo/Capstone-SCMS.git
cd Capstone-ACAS
```

Switch to the latest unified feature branch:

```bash
git checkout feature/remove-duplication-and-update-document
git pull origin feature/remove-duplication-and-update-document
```

---

### Step 2: Environment Configuration (`.env`)

Create your local `.env` file by copying the provided example:

**On Windows (PowerShell):**
```powershell
Copy-Item .env.example .env
```

**On macOS / Linux:**
```bash
cp .env.example .env
```

#### Understanding the Key `.env` Variable:
Inside `.env`, pay attention to:
```ini
# Set to 'true' when running microservices on your local host (Separate CMD windows)
# Set to 'false' when running microservices containerized inside Docker Compose
LOCAL_DEV=true
```
* **Keep `LOCAL_DEV=true`** if you plan to use **Option A (`start-all-services.bat`)** so the local node processes can reach the database ports (`localhost:5434`, `localhost:5435`, etc.).
* **Set `LOCAL_DEV=false`** if you plan to use **Option B (`docker-compose up -d`)** so containers communicate across the internal Docker bridge network (`identity-db:5432`, etc.).

---

### Step 3: Install Monorepo Dependencies

In the root of the repository, run:

```bash
pnpm install
```

*(If you do not have `pnpm` yet, run `npm install -g pnpm` first).*

> [!NOTE]
> Native builds for `argon2` and `esbuild` are pre-authorized in `package.json` and `pnpm-workspace.yaml`. No manual build steps are required.

---

### Step 4: Launching the System

You have two simple ways to run the entire system. Choose the one that fits your workflow:

#### Option A: Hybrid Local Dev Mode (Windows Recommended for Daily Coding)
This mode runs the databases inside Docker, and runs the 6 microservices and frontend on your host machine with instant TypeScript execution (`tsx`) and hot-reloading:

1. **Make sure Docker Desktop is open and running.**
2. In PowerShell or Command Prompt, run:
   ```powershell
   npm run start:services
   ```
   *(or simply double-click **`start-all-services.bat`** in File Explorer).*

**What happens automatically:**
* Docker spins up the 6 PostgreSQL DBs, MongoDB, Redis, and Adminer.
* The script waits 5 seconds to ensure databases finish seeding.
* Separate Command Prompt windows open for:
  - Gateway (Port `3000`)
  - Identity Service (Port `3001`)
  - Requirements Service (Port `3002`)
  - Submission Service (Port `3003`)
  - Audit Log Service (Port `3004`)
  - Compliance Service (Port `3005`)
  - Academic Catalog Service (Port `3006`)
  - Frontend Vite Dev Server (Port `5173`)
* **To stop all services:** Run `npm run stop:services` (or run `stop-all-services.bat`).

---

#### Option B: Full Docker Mode (Zero Terminal Clutter - Best for Testing/Demos)
If you do not want 8 separate terminal windows cluttering your taskbar:

1. Open `.env` and set:
   ```ini
   LOCAL_DEV=false
   ```
2. Run Docker Compose in detached mode:
   ```bash
   docker-compose up -d
   ```
3. Run the frontend Vite server locally:
   ```bash
   pnpm run dev
   ```
4. **To stop the Docker stack:**
   ```bash
   docker-compose down
   ```

---

## 5. Verifying Your Setup

Once everything is up, verify your system in your browser:

1. **Open Frontend Web Client:** [http://localhost:5173](http://localhost:5173)
2. **Check API Gateway Health Check:** [http://localhost:3000/health](http://localhost:3000/health)  
   *(Expected response: `{"status":"ok","timestamp":"..."}`)*
3. **Open Database Adminer GUI:** [http://localhost:8080](http://localhost:8080)
4. **Run the Automated End-to-End Integration Suite:**
   In your root terminal, run:
   ```bash
   npm run test:e2e
   ```
   *Expected output:*
   ```text
   --- STARTING E2E TEST ---
   [PASS] Login successful.
   [PASS] Courses fetched. Status: 200
   [PASS] Requirements fetched. Status: 200
   [PASS] Submissions fetched. Status: 200 | Count: 1
   [PASS] Specific submission fetched. Status: 200 | ID: ... | Status: Under Review
   [PASS] Audit logs fetched. Status: 200
   [PASS] Audit verify fetched. Status: 200
   --- E2E TEST COMPLETE ---
   ```

---

## 6. Seed Accounts & Login Credentials

SCMS strictly enforces **Two Roles Only** with pre-seeded test accounts:

| Role | Email | Password | Persona & Department |
| :--- | :--- | :--- | :--- |
| **Academic Head** | `academic.head@pup.edu.ph` | `AcademicHead2026!` | **Dr. Maria Santos**<br>Office of Academic Affairs (Single Campus Reviewer) |
| **Faculty Staff** | `faculty.donayre@pup.edu.ph` | `Faculty2026!` | **Prof. Juan Donayre**<br>Information Technology Department |
| **Faculty Staff** | `faculty.tablizo@pup.edu.ph` | `Faculty2026!` | **Prof. Rod Tablizo**<br>Secondary Education Department |

> [!IMPORTANT]
> **Authentication Policy Note:**
> * SCMS connects to the **PUP QC AAIP Clerk Shared SSO** using an **Invite-Only policy**. Unregistered email addresses are rejected with `HTTP 403 Forbidden` (auto-JIT account creation is disabled to preserve strict campus RBAC).
> * The **Local Argon2id Fallback** (`/api/v1/auth/login`) is active and independent for local development and offline grading.

---

## 7. Service Port Reference Map

| Component | Port | URL | Description |
| :--- | :---: | :--- | :--- |
| **React SPA Frontend** | `:5173` | [http://localhost:5173](http://localhost:5173) | Main user interface |
| **API Gateway Ingress** | `:3000` | [http://localhost:3000](http://localhost:3000) | Main API reverse proxy |
| **Identity Service** | `:3001` | [http://localhost:3001](http://localhost:3001) | Auth, Clerk OIDC & Argon2id, JWT |
| **Requirements Service** | `:3002` | [http://localhost:3002](http://localhost:3002) | Terms, Requirements, CCMS Calendar Sync |
| **Submission Service** | `:3003` | [http://localhost:3003](http://localhost:3003) | Syllabus uploads, GridFS storage, OBE forms |
| **Audit Log Service** | `:3004` | [http://localhost:3004](http://localhost:3004) | Immutable SHA-256 hash-chain audit log |
| **Compliance Service** | `:3005` | [http://localhost:3005](http://localhost:3005) | Live WebSocket compliance feed & CCMS push |
| **Academic Catalog (SSOT)**| `:3006` | [http://localhost:3006](http://localhost:3006) | Programs, Courses, Curricula, Block Sections |
| **Adminer DB Manager** | `:8080` | [http://localhost:8080](http://localhost:8080) | PostgreSQL & MongoDB web client |

### Database Ports (Local Access):
* **Identity DB:** `localhost:5434` (`sms_identity`)
* **Catalog DB:** `localhost:5435` (`sms_catalog`)
* **Requirements DB:** `localhost:5436` (`sms_requirements`)
* **Submissions DB:** `localhost:5437` (`sms_submissions`)
* **Audit DB:** `localhost:5438` (`sms_audit`)
* **Compliance DB:** `localhost:5439` (`sms_compliance`)
* **MongoDB:** `localhost:27017` (`scms_documents`)
* **Redis:** `localhost:6379`

---

## 8. Troubleshooting & Frequently Asked Questions (FAQ)

### Q1: I see `Error: listen EADDRINUSE: address already in use :::3000` or `:::3001`.
* **Cause:** You ran `start-all-services.bat` while Docker microservice containers (`scms-api-gateway`, etc.) were already running on those same ports.
* **Solution:** Stop the Docker microservice containers before starting host processes:
  ```powershell
  npm run stop:services
  # or manually:
  docker stop scms-api-gateway scms-identity-service scms-requirements-service scms-submission-service scms-audit-log-service scms-compliance-monitoring-service scms-academic-catalog-service
  ```
  Then re-run `start-all-services.bat`.

### Q2: I see `'ts-node' is not recognized as an internal or external command`.
* **Cause:** Older `package.json` configurations relied on global `ts-node`.
* **Solution:** We standardized all microservices to use `npx tsx src/main.ts`. Run `git pull origin feature/remove-duplication-and-update-document` to ensure you have the latest `package.json` scripts.

### Q3: I edited a page in `frontend/` but nothing changed in my browser!
* **Cause:** You edited an old mirror folder. The `frontend/` and `backend/` folders have been deleted.
* **Solution:** Always edit frontend code in **`src/`** and backend code in **`apps/`**.

### Q4: Database connection fails on first startup (`ECONNREFUSED 127.0.0.1:5434`).
* **Cause:** Docker Desktop takes 5–10 seconds to start PostgreSQL and execute the `.sql` schema seed files.
* **Solution:** Give Docker a few seconds to initialize. You can verify container status in Docker Desktop or by running `docker ps`.

### Q5: Can I run SCMS if I don't have Docker installed?
* **Yes!** Each microservice has an embedded in-memory fallback engine. If PostgreSQL is unreachable, services automatically fall back to memory persistence pre-loaded with synthetic seed data so you can still develop and test offline.

---

