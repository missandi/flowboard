@echo off
title Flowboard Launcher
color 0A

echo.
echo  ==========================================
echo        FLOWBOARD LAUNCHER v1.2.20
echo    AI Product Video Canvas - Local Mode
echo  ==========================================
echo.

:: ---------------------------------------------------
:: 1. Start Agent (FastAPI on :8101)
:: ---------------------------------------------------
echo  [1/3] Starting Agent (FastAPI on port 8101) ...
start "Flowboard Agent" cmd /k "cd /d "%~dp0agent" && .venv\Scripts\uvicorn.exe flowboard.main:app --reload --port 8101"

:: Give the agent a moment to boot
timeout /t 3 /nobreak >nul

:: ---------------------------------------------------
:: 2. Start Frontend (Vite on :5173)
:: ---------------------------------------------------
echo  [2/3] Starting Frontend (Vite on port 5173) ...
start "Flowboard Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

:: ---------------------------------------------------
:: 3. Open browser after a short delay
:: ---------------------------------------------------
echo  [3/3] Opening browser in 5 seconds ...
timeout /t 5 /nobreak >nul
start "" "http://localhost:5173"

echo.
echo  ==========================================
echo    Flowboard is running!
echo.
echo    Agent:    http://localhost:8101
echo    Frontend: http://localhost:5173
echo.
echo    To stop:  run .\stop.bat
echo  ==========================================
echo.
pause
