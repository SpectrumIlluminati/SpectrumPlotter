@echo off
REM Generate 100,000 test SFAF records
REM Run from project root directory

echo ========================================
echo SFAF Test Data Generator
echo ========================================
echo.
echo This will generate 100,000 test records
echo distributed across the United States
echo.
echo Estimated time: 60-90 seconds
echo Database impact: ~50-75 MB
echo.
echo Press Ctrl+C to cancel, or
pause

echo.
echo Starting data generation...
echo.

go run cmd/generate_test_data/main.go

echo.
echo ========================================
echo Generation complete!
echo ========================================
echo.
echo Next steps:
echo 1. Open http://localhost:8080/map-viewer
echo 2. View 100,000 markers across the US
echo 3. Test filtering and performance
echo.
pause
