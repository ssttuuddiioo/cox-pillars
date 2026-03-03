@echo off
cd /d "%~dp0"

:: Set which pillar this PC runs (change per machine on install day)
if "%PILLAR%"=="" set PILLAR=carbon

:: Kill any existing node process on port 3333
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3333 ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>&1

:: Install dependencies if needed
if not exist node_modules (call npm install)

echo Starting Cox Conserves pillar kiosk: %PILLAR%

:: Start Node server in background
start /B node server.js

:: Wait for server to be ready
timeout /t 3 /nobreak >nul

:: Launch Chrome in kiosk mode
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk --disable-session-crashed-bubble --disable-infobars --noerrors --disable-translate --no-first-run --fast --fast-start --disable-features=TranslateUI --autoplay-policy=no-user-gesture-required http://localhost:3333
