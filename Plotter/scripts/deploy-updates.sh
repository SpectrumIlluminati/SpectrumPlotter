#!/bin/bash

# SFAF Plotter - Quick Update Deployment Script
# Deploys updated files to AWS EC2 instance

set -e

# Configuration
EC2_IP="3.88.235.152"
EC2_USER="ec2-user"
SSH_KEY="$1"  # Pass SSH key path as first argument
REMOTE_DIR="/opt/sfaf-plotter"

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

if [ -z "$SSH_KEY" ]; then
    echo -e "${RED}Error: SSH key path required${NC}"
    echo "Usage: ./deploy-updates.sh /path/to/your-key.pem"
    exit 1
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}SFAF Plotter - Deploying Updates to AWS${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Copy updated Go files with password fix
echo -e "${YELLOW}📦 Copying updated config files (password encoding fix)...${NC}"
scp -i "$SSH_KEY" -r config/ ${EC2_USER}@${EC2_IP}:${REMOTE_DIR}/

echo -e "${YELLOW}📦 Copying updated cmd files (init_database with password fix)...${NC}"
scp -i "$SSH_KEY" -r cmd/ ${EC2_USER}@${EC2_IP}:${REMOTE_DIR}/

echo -e "${YELLOW}📦 Copying updated sfaf_service.go...${NC}"
scp -i "$SSH_KEY" services/sfaf_service.go ${EC2_USER}@${EC2_IP}:${REMOTE_DIR}/services/

echo -e "${YELLOW}📦 Copying updated sfaf_repository.go...${NC}"
scp -i "$SSH_KEY" repositories/sfaf_repository.go ${EC2_USER}@${EC2_IP}:${REMOTE_DIR}/repositories/

echo -e "${YELLOW}📦 Copying updated frequency_repository.go...${NC}"
scp -i "$SSH_KEY" repositories/frequency_repository.go ${EC2_USER}@${EC2_IP}:${REMOTE_DIR}/repositories/

echo -e "${YELLOW}📦 Copying updated frequency_service.go...${NC}"
scp -i "$SSH_KEY" services/frequency_service.go ${EC2_USER}@${EC2_IP}:${REMOTE_DIR}/services/

echo -e "${YELLOW}📦 Copying updated frequency_handler.go...${NC}"
scp -i "$SSH_KEY" handlers/frequency_handler.go ${EC2_USER}@${EC2_IP}:${REMOTE_DIR}/handlers/

echo -e "${YELLOW}📦 Copying updated main.go...${NC}"
scp -i "$SSH_KEY" main.go ${EC2_USER}@${EC2_IP}:${REMOTE_DIR}/

# Copy updated JavaScript files
echo -e "${YELLOW}📦 Copying updated db_viewer.js...${NC}"
scp -i "$SSH_KEY" web/static/js/db_viewer.js ${EC2_USER}@${EC2_IP}:${REMOTE_DIR}/web/static/js/

echo -e "${YELLOW}📦 Copying updated reference_data.js...${NC}"
scp -i "$SSH_KEY" web/static/js/reference_data.js ${EC2_USER}@${EC2_IP}:${REMOTE_DIR}/web/static/js/

# Copy updated CSS files
echo -e "${YELLOW}📦 Copying updated sidebar.css...${NC}"
scp -i "$SSH_KEY" web/static/css/sidebar.css ${EC2_USER}@${EC2_IP}:${REMOTE_DIR}/web/static/css/

echo -e "${YELLOW}📦 Copying updated navBar.css...${NC}"
scp -i "$SSH_KEY" web/static/css/navBar.css ${EC2_USER}@${EC2_IP}:${REMOTE_DIR}/web/static/css/

# Copy updated HTML templates
echo -e "${YELLOW}📦 Copying updated map_viewer.html...${NC}"
scp -i "$SSH_KEY" web/templates/map_viewer.html ${EC2_USER}@${EC2_IP}:${REMOTE_DIR}/web/templates/

echo -e "${YELLOW}📦 Copying updated sidebar.html...${NC}"
scp -i "$SSH_KEY" web/templates/sidebar.html ${EC2_USER}@${EC2_IP}:${REMOTE_DIR}/web/templates/

echo -e "${YELLOW}📦 Copying updated view_manager.html...${NC}"
scp -i "$SSH_KEY" web/templates/view_manager.html ${EC2_USER}@${EC2_IP}:${REMOTE_DIR}/web/templates/

# Copy updated settings-ui.js
echo -e "${YELLOW}📦 Copying updated settings-ui.js...${NC}"
scp -i "$SSH_KEY" web/static/js/modules/settings-ui.js ${EC2_USER}@${EC2_IP}:${REMOTE_DIR}/web/static/js/modules/

echo ""
echo -e "${GREEN}✅ Files uploaded successfully!${NC}"
echo ""
echo -e "${YELLOW}🔨 Step 2: Initializing RDS database...${NC}"

ssh -i "$SSH_KEY" ${EC2_USER}@${EC2_IP} << 'ENDSSH'
cd /opt/sfaf-plotter
echo "Running database migrations with password fix..."
export PATH=$PATH:/usr/local/go/bin
/usr/local/go/bin/go run cmd/init_database/main.go
ENDSSH

echo ""
echo -e "${YELLOW}🔨 Step 3: Rebuilding and restarting Docker container...${NC}"

ssh -i "$SSH_KEY" ${EC2_USER}@${EC2_IP} << 'ENDSSH'
cd /opt/sfaf-plotter

# Stop existing container
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
echo -e "${YELLOW}Application URL: http://${EC2_IP}:8080${NC}"
echo ""
