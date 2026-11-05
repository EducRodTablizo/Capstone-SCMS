@echo off
echo ===================================================
echo   Starting SCMS Microservices & Web Client
echo   Syllabus Compliance Monitoring System - PUPQC
echo ===================================================

echo [1/3] Ensuring host ports are free & starting database infrastructure...
docker-compose stop api-gateway identity-service requirements-service submission-service compliance-monitoring-service academic-catalog-service audit-log-service >nul 2>&1
docker-compose up -d scms_postgres_identity scms_postgres_catalog scms_postgres_requirements scms_postgres_submissions scms_postgres_audit scms_postgres_compliance mongo redis adminer

echo [2/3] Waiting for databases to initialize...
timeout /t 5 /nobreak >nul

echo [3/3] Starting SCMS Microservices and Frontend...
echo - Starting API Gateway (Port 3000)...
start "SCMS API Gateway" cmd /k "cd apps\api-gateway && npm run dev"

echo - Starting Identity Service (Port 3001)...
start "SCMS Identity Service" cmd /k "cd apps\identity-service && npm run dev"

echo - Starting Requirements Service (Port 3002)...
start "SCMS Requirements Service" cmd /k "cd apps\requirements-service && npm run dev"

echo - Starting Submission Service (Port 3003)...
start "SCMS Submission Service" cmd /k "cd apps\submission-service && npm run dev"

echo - Starting Compliance Monitoring Service (Port 3005)...
start "SCMS Compliance Service" cmd /k "cd apps\compliance-monitoring-service && npm run dev"

echo - Starting Academic Catalog Service (Port 3006)...
start "SCMS Academic Catalog Service" cmd /k "cd apps\academic-catalog-service && npm run dev"

echo - Starting Audit Log Service (Port 3004)...
start "SCMS Audit Service" cmd /k "cd apps\audit-log-service && npm run dev"

echo - Starting React Client (Port 5173)...
start "SCMS Frontend Client" cmd /k "npm run dev"

echo ===================================================
echo   All SCMS services launched successfully!
echo   Frontend: http://localhost:5173
echo   API Gateway: http://localhost:3000
echo ===================================================
pause
