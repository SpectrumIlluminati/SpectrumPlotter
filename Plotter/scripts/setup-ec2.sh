#!/bin/bash
# Setup EC2 instance with Go and dependencies
# Run this script first before deploying

set -e

EC2_IP="3.88.235.152"
EC2_USER="ec2-user"
SSH_KEY="$1"

if [ -z "$SSH_KEY" ]; then
    echo "Error: SSH key path required"
    echo "Usage: ./setup-ec2.sh /path/to/your-key.pem"
    exit 1
fi

echo "========================================="
echo "Setting up EC2 instance..."
echo "========================================="

ssh -i "$SSH_KEY" ${EC2_USER}@${EC2_IP} << 'ENDSSH'
# Update system
sudo yum update -y

# Install Go
echo "Installing Go..."
wget https://go.dev/dl/go1.21.5.linux-amd64.tar.gz
sudo rm -rf /usr/local/go
sudo tar -C /usr/local -xzf go1.21.5.linux-amd64.tar.gz
rm go1.21.5.linux-amd64.tar.gz

# Add Go to PATH
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
echo 'export GOPATH=$HOME/go' >> ~/.bashrc
source ~/.bashrc

# Install Docker if not already installed
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    sudo yum install -y docker
    sudo systemctl start docker
    sudo systemctl enable docker
    sudo usermod -a -G docker ec2-user
fi

# Install PostgreSQL client for testing
sudo yum install -y postgresql15

# Create application directory
sudo mkdir -p /opt/sfaf-plotter
sudo chown ec2-user:ec2-user /opt/sfaf-plotter

echo "EC2 setup complete!"
echo "Go version:"
/usr/local/go/bin/go version
ENDSSH

echo ""
echo "✅ EC2 instance is ready!"
echo ""
echo "Next step: Run ./deploy-to-aws.sh to deploy the application"
