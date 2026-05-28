@echo off
title Flowboard Stopper
color 0C

echo.
echo  ==========================================
echo          FLOWBOARD STOPPER
echo  ==========================================
echo.

:: ---------------------------------------------------
:: 1. Kill Agent (port 8101)
:: ---------------------------------------------------
echo  [1/2] Stopping Agent (port 8101) ...
set "AGENT_KILLED=0"
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8101" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
    set "AGENT_KILLED=1"
)
if "%AGENT_KILLED%"=="1" (
    echo        [OK] Agent stopped.
) else (
    echo        [--] Agent was not running.
)

:: ---------------------------------------------------
:: 2. Kill Frontend (port 5173)
:: ---------------------------------------------------
echo  [2/2] Stopping Frontend (port 5173) ...
set "FRONT_KILLED=0"
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
    set "FRONT_KILLED=1"
)
if "%FRONT_KILLED%"=="1" (
    echo        [OK] Frontend stopped.
) else (
    echo        [--] Frontend was not running.
)

:: ---------------------------------------------------
:: 3. Close any leftover cmd windows
:: ---------------------------------------------------
echo.
echo  Closing launcher windows ...
taskkill /FI "WINDOWTITLE eq Flowboard Agent" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Flowboard Frontend" /F >nul 2>&1

echo.
echo  ==========================================
echo    All Flowboard processes stopped.
echo  ==========================================
echo.
pause
