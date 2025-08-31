@echo off
REM LoL Performance Analytics Platform - Setup Script for Windows

echo ===============================================
echo   LoL Performance Analytics Platform Setup
echo   14Forge - 14-Minute Analysis
echo ===============================================
echo.

REM Check prerequisites
echo Checking prerequisites...

REM Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo X Node.js is not installed. Please install Node.js 18+
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('node --version') do echo OK Node.js %%i
)

REM Check npm
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo X npm is not installed
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('npm --version') do echo OK npm %%i
)

REM Check Docker
where docker >nul 2>nul
if %errorlevel% neq 0 (
    echo ! Docker is not installed - optional for local development
) else (
    echo OK Docker installed
)

echo.
echo Setting up environment...

REM Create .env if it doesn't exist
if not exist .env (
    echo Creating .env file from template...
    copy .env.example .env
    echo OK .env file created
    echo.
    echo IMPORTANT: Please edit .env and add your:
    echo    - RIOT_API_KEY from https://developer.riotgames.com/
    echo    - Database credentials
    echo    - Optional: BrightData API key
    echo.
) else (
    echo OK .env file already exists
)

REM Install backend dependencies
echo.
echo Installing backend dependencies...
cd backend\api
call npm install
echo OK Backend dependencies installed

REM Install frontend dependencies
echo.
echo Installing frontend dependencies...
cd ..\..\frontend
call npm install
echo OK Frontend dependencies installed

cd ..

echo.
echo ===============================================
echo   Setup Complete!
echo ===============================================
echo.
echo Next steps:
echo.
echo 1. Edit .env file with your API keys
echo.
echo 2. Start PostgreSQL:
echo    With Docker:  docker-compose up postgres
echo    Or install locally
echo.
echo 3. Run database migrations:
echo    psql -U postgres -d lol_stats ^< database\init.sql
echo.
echo 4. Start the services:
echo.
echo    Option A - Docker (recommended):
echo      cd backend ^&^& docker-compose up
echo.
echo    Option B - Local development:
echo      Terminal 1: cd backend\api ^&^& npm run dev
echo      Terminal 2: cd frontend ^&^& npm run dev
echo.
echo 5. Access the application:
echo    Frontend: http://localhost:5173
echo    API: http://localhost:3000
echo.
echo Happy coding!
pause