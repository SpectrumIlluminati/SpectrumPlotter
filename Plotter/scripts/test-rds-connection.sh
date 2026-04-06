#!/bin/bash
# Test AWS RDS connection from EC2

EC2_IP="3.88.235.152"
EC2_USER="ec2-user"
SSH_KEY="$1"

if [ -z "$SSH_KEY" ]; then
    echo "Usage: ./test-rds-connection.sh /path/to/key.pem"
    exit 1
fi

echo "Testing RDS connection from EC2..."

ssh -i "$SSH_KEY" ${EC2_USER}@${EC2_IP} << 'ENDSSH'
# Test with psql
export PGPASSWORD='88R*GK2$8t$v!YA%8wbm&bA7'

echo "Attempting to connect to RDS..."
psql -h sfaf-plotter-db.cgr4g8o2mlfr.us-east-1.rds.amazonaws.com \
     -U freqman \
     -d freqnom_DB \
     -c "SELECT version();"

echo ""
echo "Connection test result: $?"
ENDSSH
