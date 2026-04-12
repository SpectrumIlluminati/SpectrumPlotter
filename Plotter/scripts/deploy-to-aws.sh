#!/bin/bash
# Deploy SFAF Plotter to AWS EC2 and Initialize RDS
# New EC2 IP: 3.88.235.152

set -e

# Configuration
EC2_IP="3.88.235.152"
EC2_USER="ec2-user"
SSH_KEY="$1"
REMOTE_DIR="/opt/sfaf-plotter"

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

if [ -z "$SSH_KEY" ]; then
    echo -e "${RED}Error: SSH key path required${NC}"
    echo "Usage: ./deploy-to-aws.sh /path/to/your-key.pem"
    exit 1
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}SFAF Plotter - AWS Deployment${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "EC2 Instance: $EC2_IP"
echo "RDS Endpoint: sfaf-plotter-db.cgr4g8o2mlfr.us-east-1.rds.amazonaws.com"
echo ""

# Step 1: Copy all files
echo -e "${YELLOW}📦 Step 1: Copying application files to EC2...${NC}"
scp -i "$SSH_KEY" -r \
  services/ \
  repositories/ \
  handlers/ \
  models/ \
  config/ \
  middleware/ \
  web/ \
  migrations/ \
  cmd/ \
  main.go \
  go.mod \
  go.sum \
  ${EC2_USER}@${EC2_IP}:${REMOTE_DIR}/

# Step 2: Create AWS RDS .env file
echo -e "${YELLOW}📦 Step 2: Creating AWS RDS configuration...${NC}"
cat > /tmp/.env.aws << 'EOF'
# AWS Production Configuration
SERVER_HOST=0.0.0.0
SERVER_PORT=8080

# AWS RDS Database
DB_HOST=sfaf-plotter-db.cgr4g8o2mlfr.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_USER=freqman
DB_PASSWORD=88R*GK2$8t$v!YA%8wbm&bA7
DB_NAME=freqnom_DB
DB_SSLMODE=require

# Application Settings
GIN_MODE=release
LOG_LEVEL=info

# CORS Settings
CORS_ALLOWED_ORIGINS=*
CORS_ALLOWED_METHODS=GET,POST,PUT,DELETE,OPTIONS
CORS_ALLOWED_HEADERS=Content-Type,Authorization

# Feature Flags
ENABLE_MCEB_VALIDATION=true
ENABLE_COORDINATE_CACHING=true
EOF

scp -i "$SSH_KEY" /tmp/.env.aws ${EC2_USER}@${EC2_IP}:${REMOTE_DIR}/.env
rm /tmp/.env.aws

# Step 3: Initialize RDS Database
echo -e "${YELLOW}📊 Step 3: Initializing AWS RDS database...${NC}"
ssh -i "$SSH_KEY" ${EC2_USER}@${EC2_IP} << 'ENDSSH'
cd /opt/sfaf-plotter
echo "Running database migrations..."
export PATH=$PATH:/usr/local/go/bin
/usr/local/go/bin/go run cmd/init_database/main.go
ENDSSH

# Step 4: Build and restart application
echo -e "${YELLOW}🔨 Step 4: Building and restarting application...${NC}"
ssh -i "$SSH_KEY" ${EC2_USER}@${EC2_IP} << 'ENDSSH'
cd /opt/sfaf-plotter

# Stop existing Docker container
sudo docker stop sfaf-plotter-app 2>/dev/null || true
sudo docker rm sfaf-plotter-app 2>/dev/null || true

# Build new image
sudo docker build -t sfaf-plotter-app .

# Run new container
sudo docker run -d \
  --name sfaf-plotter-app \
  -p 8080:8080 \
  --env-file .env \
  --restart unless-stopped \
  sfaf-plotter-app

# Show logs
echo ""
echo "Application logs:"
sudo docker logs --tail 50 sfaf-plotter-app
ENDSSH

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Test the application: http://$EC2_IP:8080"
echo "  2. Create superuser account via API"
echo ""
echo "Create superuser:"
echo "  curl -X POST http://$EC2_IP:8080/api/auth/create-superuser \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"username\":\"admin\",\"password\":\"YourSecurePassword\",\"email\":\"admin@example.com\",\"full_name\":\"Administrator\"}'"
echo ""
