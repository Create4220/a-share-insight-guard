@echo off
cd /d "%~dp0"

echo === A-Share Insight Guard ===
echo.

:: ---- Backend ----
echo [1/2] Starting backend...
cd backend
if not exist ".venv" (python -m venv .venv)
call .venv\Scripts\activate.bat
pip install -r requirements.txt -q
python -m app.scripts.seed_data
start "Backend" cmd /c "cd /d %cd% && .venv\Scripts\activate.bat && uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"
cd ..

echo Waiting for backend...
:wait
ping 127.0.0.1 -n 3 >nul
curl -s http://127.0.0.1:8000/api/v1/health >nul 2>&1
if errorlevel 1 goto wait
echo Backend ready.

:: ---- Frontend ----
echo [2/2] Starting frontend...
cd frontend
if not exist "node_modules" (call npm install)
start "Frontend" cmd /c "cd /d %cd% && npm run dev -- --host 0.0.0.0"
cd ..

ping 127.0.0.1 -n 5 >nul
start "" http://localhost:5173

echo.
echo Frontend: http://localhost:5173
echo API docs: http://localhost:8000/docs
echo.
pause
