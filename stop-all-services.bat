@echo off
echo ===================================================
echo   Stopping SCMS Microservices & Databases
echo   Syllabus Compliance Monitoring System - PUPQC
echo ===================================================

echo [1/2] Terminating Node.js microservice processes...
taskkill /f /im node.exe >nul 2>&1

echo [2/2] Shutting down Docker containers...
docker-compose down

echo ===================================================
echo   All SCMS services stopped cleanly.
echo ===================================================
pause
