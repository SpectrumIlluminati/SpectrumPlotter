#!/bin/bash
# Initialize AWS RDS Database
# This script runs all migrations to set up the database schema

echo "🚀 SFAF Plotter - AWS RDS Database Initialization"
echo "=================================================="
echo ""
echo "This will initialize your AWS RDS database with all tables and schema."
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    echo "Please create a .env file with your AWS RDS connection details"
    exit 1
fi

# Load environment variables
source .env

echo "Database Configuration:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo ""

read -p "Continue with database initialization? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 1
fi

echo ""
echo "Running database initialization..."
echo ""

# Run the initialization program
go run cmd/init_database/main.go

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Database initialization completed successfully!"
    echo ""
    echo "Next steps:"
    echo "  1. Create a superuser: curl -X POST http://localhost:8080/api/auth/create-superuser \\"
    echo "       -H 'Content-Type: application/json' \\"
    echo "       -d '{\"username\":\"admin\",\"password\":\"YourPassword123!\",\"email\":\"admin@sfaf.mil\",\"full_name\":\"Administrator\"}'"
    echo ""
    echo "  2. Start the server: go run main.go"
    echo ""
else
    echo ""
    echo "❌ Database initialization failed. Please check the errors above."
    exit 1
fi
