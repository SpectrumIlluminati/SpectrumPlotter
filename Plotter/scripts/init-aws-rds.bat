@echo off
REM Initialize AWS RDS Database
REM Uses .env.aws configuration file

echo.
echo ====================================================
echo SFAF Plotter - AWS RDS Database Initialization
echo ====================================================
echo.
echo Target: sfaf-plotter-db.cgr4g8o2mlfr.us-east-1.rds.amazonaws.com
echo Database: freqnom_DB
echo.

REM Check if .env.aws file exists
if not exist .env.aws (
    echo ERROR: .env.aws file not found
    echo Please ensure .env.aws exists with AWS RDS credentials
    pause
    exit /b 1
)

REM Backup current .env
if exist .env (
    echo Backing up current .env to .env.local.backup
    copy /Y .env .env.local.backup > nul
)

REM Use AWS RDS configuration
echo Switching to AWS RDS configuration...
copy /Y .env.aws .env > nul

echo.
set /p CONFIRM="Initialize AWS RDS database? This will create all tables. (y/n): "
if /i not "%CONFIRM%"=="y" (
    echo Cancelled.
    REM Restore local .env
    if exist .env.local.backup (
        copy /Y .env.local.backup .env > nul
        del .env.local.backup
    )
    pause
    exit /b 0
)

echo.
echo Running database initialization on AWS RDS...
echo.

REM Run the initialization program
go run cmd/init_database/main.go

set INIT_RESULT=%ERRORLEVEL%

REM Restore local .env
echo.
echo Restoring local database configuration...
if exist .env.local.backup (
    copy /Y .env.local.backup .env > nul
    del .env.local.backup
) else (
    echo Warning: Could not restore local .env
)

if %INIT_RESULT% EQU 0 (
    echo.
    echo ====================================================
    echo AWS RDS Database initialization completed!
    echo ====================================================
    echo.
    echo Next step: Create your superuser account on AWS RDS
    echo.
    echo You'll need to:
    echo   1. Update your EC2 instance .env to use AWS RDS
    echo   2. Deploy the updated application to EC2
    echo   3. Create superuser via the application
    echo.
) else (
    echo.
    echo ====================================================
    echo AWS RDS Database initialization failed!
    echo ====================================================
    echo Please check the errors above.
    echo.
    echo Common issues:
    echo   - RDS security group not allowing your IP
    echo   - Incorrect credentials
    echo   - RDS instance not fully available yet
    echo.
)

pause
