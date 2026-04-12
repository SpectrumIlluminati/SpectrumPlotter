@echo off
REM Initialize AWS RDS Database
REM This script runs all migrations to set up the database schema

echo.
echo ====================================================
echo SFAF Plotter - AWS RDS Database Initialization
echo ====================================================
echo.
echo This will initialize your AWS RDS database with all tables and schema.
echo.

REM Check if .env file exists
if not exist .env (
    echo ERROR: .env file not found
    echo Please create a .env file with your AWS RDS connection details
    pause
    exit /b 1
)

echo Database Configuration from .env:
echo   Host: %DB_HOST%
echo   Port: %DB_PORT%
echo   Database: %DB_NAME%
echo   User: %DB_USER%
echo.

set /p CONFIRM="Continue with database initialization? (y/n): "
if /i not "%CONFIRM%"=="y" (
    echo Cancelled.
    pause
    exit /b 0
)

echo.
echo Running database initialization...
echo.

REM Run the initialization program
go run cmd/init_database/main.go

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ====================================================
    echo Database initialization completed successfully!
    echo ====================================================
    echo.
    echo Next steps:
    echo   1. Create a superuser with:
    echo      curl -X POST http://localhost:8080/api/auth/create-superuser ^
    echo        -H "Content-Type: application/json" ^
    echo        -d "{\"username\":\"admin\",\"password\":\"YourPassword123!\",\"email\":\"admin@sfaf.mil\",\"full_name\":\"Administrator\"}"
    echo.
    echo   2. Start the server with: go run main.go
    echo.
) else (
    echo.
    echo ====================================================
    echo Database initialization failed!
    echo ====================================================
    echo Please check the errors above.
    echo.
)

pause
