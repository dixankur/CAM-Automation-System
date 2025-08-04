@echo off
echo Starting CAM Automation Local Server...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js found. Installing dependencies...

REM Install dependencies using cmd instead of PowerShell
call npm install express cors multer uuid

if errorlevel 1 (
    echo.
    echo Installing individual packages...
    call npm install express@4.18.2
    call npm install cors@2.8.5
    call npm install multer@1.4.5-lts.1
    call npm install uuid@9.0.0
)

echo.
echo Creating required directories...
if not exist "uploads" mkdir uploads
if not exist "public" mkdir public

echo.
echo Starting CAM Automation Server...
echo Server will be available at: http://localhost:3000
echo Press Ctrl+C to stop the server
echo.

node local-api-server.js

pause
