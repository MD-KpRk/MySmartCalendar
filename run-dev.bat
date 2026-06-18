@echo off
echo ==========================================================
echo    Starting MySmartCalendar Local Environment (Dev)
echo ==========================================================
echo.

:: 1. Docker Compose Postgres & Redis
echo [1/4] Starting Postgres and Redis databases...
docker compose up postgres redis -d
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Failed to start Docker compose.
    echo Please make sure Docker Desktop is running!
    echo.
    pause
    exit /b %errorlevel%
)
echo Databases are running!
echo.

:: 2. Start Backend
echo [2/4] Starting Backend in a separate window...
start "MySmartCalendar Backend" cmd /k "echo Starting Backend... && cd backend && npm install && npx prisma generate && npx prisma migrate dev && npm run dev"

:: 3. Start Frontend
echo [3/4] Starting Frontend in a separate window...
start "MySmartCalendar Frontend" cmd /k "echo Starting Frontend... && cd frontend && npm install --legacy-peer-deps && npm run dev -- --open"

echo.
echo ==========================================================
echo All processes started!
echo Please keep backend and frontend console windows open.
echo To stop databases, run: docker compose down
echo ==========================================================
echo.
pause
