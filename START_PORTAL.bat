@echo off
setlocal
cd /d "%~dp0"

echo ======================================================
echo Student Attendance and Grade Management Website
echo ======================================================

if not exist ".env" (
  copy ".env.example" ".env" >nul
  echo Created .env from .env.example.
  echo Please enter your MySQL root password in the .env file.
  start notepad ".env"
  echo.
  echo Save and close Notepad, then run START_PORTAL.bat again.
  pause
  exit /b 0
)

findstr /C:"PUT_YOUR_MYSQL_ROOT_PASSWORD_HERE" ".env" >nul
if not errorlevel 1 (
  echo You must replace PUT_YOUR_MYSQL_ROOT_PASSWORD_HERE in .env first.
  start notepad ".env"
  pause
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed.
  echo Install the Node.js LTS version from https://nodejs.org/en/download
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installing required packages. This is needed only the first time.
  call npm install
  if errorlevel 1 (
    echo Package installation failed. Check your internet connection and try again.
    pause
    exit /b 1
  )
)

echo Preparing the website login accounts and connecting to your existing database...
call npm run setup-demo
if errorlevel 1 (
  echo Setup failed. Check the MySQL password, database name and whether MySQL Server is running.
  pause
  exit /b 1
)

echo Starting the portal. Keep this window open while using the website.
call npm start
pause
