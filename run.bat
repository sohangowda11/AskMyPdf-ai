@echo off
SETLOCAL EnableDelayedExpansion

:: --- CONFIGURATION ---
set "PROJECT_ROOT=%~dp0"
set "BACKEND_DIR=%PROJECT_ROOT%backend"
set "FRONTEND_DIR=%PROJECT_ROOT%frontend"
set "TITLE=AskMyPDF AI Launcher"

title %TITLE%
color 0B

echo ===================================================
echo           ASKMYPDF AI - Startup Script
echo ===================================================
echo.

:: 1. Check/Setup Python Venv
if not exist "%BACKEND_DIR%\venv" (
    echo [INFO] Creating virtual environment...
    cd /d "%BACKEND_DIR%"
    python -m venv venv
)

echo [INFO] Activating venv and checking backend dependencies...
cd /d "%BACKEND_DIR%"
call venv\Scripts\activate
pip install -r requirements.txt

:: 2. Check for Frontend node_modules
if not exist "%FRONTEND_DIR%\node_modules" (
    echo [INFO] node_modules not found in frontend. Attempting to install...
    cd /d "%FRONTEND_DIR%"
    call npm install
)

:: 3. Launch Backend (Background)
echo [1/2] Starting Flask Backend (Port 5001)...
start /b "Backend" cmd /c "cd /d %BACKEND_DIR% && call venv\Scripts\activate && python app.py"

:: 4. Launch Frontend (Foreground)
echo [2/2] Starting Vite Frontend...
echo.
echo [INFO] Opening browser in 5 seconds...
start "" "http://localhost:5173"

cd /d "%FRONTEND_DIR%"
npm run dev
