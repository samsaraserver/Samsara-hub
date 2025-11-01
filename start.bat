@echo off
cd /d "%~dp0"

where bun >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Bun is not installed. Please install Bun first.
    echo Visit: https://bun.sh
    exit /b 1
)

echo Starting Samsara-hub server...
bun run server.ts
