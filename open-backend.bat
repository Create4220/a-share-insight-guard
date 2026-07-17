@echo off
echo ========================================
echo   A-Share Insight Guard - Backend
echo ========================================
echo.

cd /d "%~dp0backend"

:: Create venv if not exists
if not exist ".venv" (
    echo [1/3] Creating virtual environment...
    python -m venv .venv
)

:: Activate and install
echo [2/3] Installing dependencies...
call .venv\Scripts\activate.bat
pip install -r requirements.txt -q

:: Seed data
echo [3/3] Initializing demo data...
python -m app.scripts.seed_data

echo.
echo ========================================
echo   Backend starting at http://localhost:8000
echo   API docs at http://localhost:8000/docs
echo ========================================
echo.

uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
