#!/bin/bash
# Diagnose RDS connection issues

EC2_IP="3.88.235.152"
EC2_USER="ec2-user"
SSH_KEY="$1"

if [ -z "$SSH_KEY" ]; then
    echo "Usage: ./diagnose-rds-connection.sh /path/to/your-key.pem"
    exit 1
fi

echo "========================================="
echo "RDS Connection Diagnostics"
echo "========================================="
echo ""

ssh -i "$SSH_KEY" ${EC2_USER}@${EC2_IP} << 'ENDSSH'
cd /opt/sfaf-plotter

echo "1. Checking .env file exists and reading password:"
if [ -f .env ]; then
    echo "✓ .env file exists"
    echo "DB_PASSWORD line:"
    grep "^DB_PASSWORD=" .env | head -1
else
    echo "✗ .env file not found!"
fi

echo ""
echo "2. Testing psql connection with password from .env:"
export $(grep "^DB_PASSWORD=" .env | xargs)
export $(grep "^DB_HOST=" .env | xargs)
export $(grep "^DB_USER=" .env | xargs)
export $(grep "^DB_NAME=" .env | xargs)

export PGPASSWORD="$DB_PASSWORD"
echo "Connecting to: $DB_USER@$DB_HOST/$DB_NAME"
psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT current_database(), current_user;" 2>&1 | head -10

echo ""
echo "3. Testing Go connection with diagnostic output:"
cat > /tmp/test_conn.go << 'EOF'
package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/url"
	"os"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

func main() {
	godotenv.Load()

	password := os.Getenv("DB_PASSWORD")
	host := os.Getenv("DB_HOST")
	user := os.Getenv("DB_USER")
	dbname := os.Getenv("DB_NAME")

	fmt.Printf("Password from env: %s\n", password)
	fmt.Printf("Password length: %d\n", len(password))

	encodedPassword := url.QueryEscape(password)
	fmt.Printf("Encoded password: %s\n", encodedPassword)

	// Try URL format
	connStr := fmt.Sprintf("postgres://%s:%s@%s:5432/%s?sslmode=require",
		user, encodedPassword, host, dbname)

	fmt.Printf("\nConnection string (password masked):\n")
	fmt.Printf("postgres://%s:***@%s:5432/%s?sslmode=require\n", user, host, dbname)

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("Failed to open: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to ping: %v", err)
	}

	fmt.Println("\n✅ Go connection successful!")
}
EOF

export PATH=$PATH:/usr/local/go/bin
/usr/local/go/bin/go run /tmp/test_conn.go
rm /tmp/test_conn.go

ENDSSH
