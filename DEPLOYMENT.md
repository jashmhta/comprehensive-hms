# Deployment Guide - Comprehensive Hospital Management System

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm 8+
- Docker and Docker Compose
- PostgreSQL 15+
- MongoDB 6.0+
- Redis 7+

### Local Development Setup

1. **Clone Repository**
```bash
git clone https://github.com/jashmhta/comprehensive-hms.git
cd comprehensive-hms
```

2. **Environment Configuration**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Install Dependencies**
```bash
# Root dependencies
npm install

# Backend dependencies
cd server && npm install

# Frontend dependencies
cd ../client && npm install

# Mobile dependencies
cd ../mobile && npm install
```

4. **Database Setup**
```bash
# Start databases with Docker
docker-compose up -d postgres mongodb redis

# Run database migrations
cd server && npm run migrate

# Seed initial data
npm run seed
```

5. **Start Development Servers**
```bash
# Start all services
npm run dev

# Or start individually:
# Backend: cd server && npm run dev
# Frontend: cd client && npm start
# Mobile: cd mobile && npm start
```

## 🐳 Docker Deployment

### Development Environment
```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production Environment
```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Start production services
docker-compose -f docker-compose.prod.yml up -d

# Scale services
docker-compose -f docker-compose.prod.yml up -d --scale api=3
```

## ☁️ Cloud Deployment

### AWS Deployment

#### 1. Infrastructure Setup (Terraform)
```bash
cd infrastructure/terraform/aws
terraform init
terraform plan
terraform apply
```

#### 2. ECS Deployment
```bash
# Build and push images to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

docker build -t hms-api ./server
docker tag hms-api:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/hms-api:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/hms-api:latest

docker build -t hms-web ./client
docker tag hms-web:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/hms-web:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/hms-web:latest

# Deploy to ECS
aws ecs update-service --cluster hms-cluster --service hms-api-service --force-new-deployment
aws ecs update-service --cluster hms-cluster --service hms-web-service --force-new-deployment
```

#### 3. RDS Setup
```bash
# Create RDS PostgreSQL instance
aws rds create-db-instance \
  --db-instance-identifier hms-postgres \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --master-username hmsadmin \
  --master-user-password <secure-password> \
  --allocated-storage 100 \
  --vpc-security-group-ids sg-xxxxxxxxx \
  --db-subnet-group-name hms-db-subnet-group
```

### Azure Deployment

#### 1. Container Instances
```bash
# Create resource group
az group create --name hms-rg --location eastus

# Create container registry
az acr create --resource-group hms-rg --name hmsregistry --sku Basic

# Build and push images
az acr build --registry hmsregistry --image hms-api:latest ./server
az acr build --registry hmsregistry --image hms-web:latest ./client

# Deploy container instances
az container create \
  --resource-group hms-rg \
  --name hms-api \
  --image hmsregistry.azurecr.io/hms-api:latest \
  --cpu 2 \
  --memory 4 \
  --ports 5000
```

#### 2. Azure Database for PostgreSQL
```bash
az postgres server create \
  --resource-group hms-rg \
  --name hms-postgres-server \
  --location eastus \
  --admin-user hmsadmin \
  --admin-password <secure-password> \
  --sku-name GP_Gen5_2
```

### Google Cloud Platform

#### 1. Cloud Run Deployment
```bash
# Build and deploy API
gcloud builds submit --tag gcr.io/PROJECT-ID/hms-api ./server
gcloud run deploy hms-api \
  --image gcr.io/PROJECT-ID/hms-api \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated

# Build and deploy Web
gcloud builds submit --tag gcr.io/PROJECT-ID/hms-web ./client
gcloud run deploy hms-web \
  --image gcr.io/PROJECT-ID/hms-web \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

#### 2. Cloud SQL Setup
```bash
gcloud sql instances create hms-postgres \
  --database-version=POSTGRES_13 \
  --tier=db-f1-micro \
  --region=us-central1
```

## 📱 Mobile App Deployment

### Android Deployment

#### 1. Build APK
```bash
cd mobile
npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle

cd android
./gradlew assembleRelease
```

#### 2. Build AAB for Play Store
```bash
cd android
./gradlew bundleRelease
```

#### 3. Upload to Google Play Console
- Upload the AAB file to Google Play Console
- Configure app details, screenshots, and descriptions
- Submit for review

### iOS Deployment

#### 1. Build for iOS
```bash
cd mobile
npx react-native bundle --platform ios --dev false --entry-file index.js --bundle-output ios/main.jsbundle

cd ios
xcodebuild -workspace HMSMobile.xcworkspace -scheme HMSMobile -configuration Release -destination generic/platform=iOS -archivePath HMSMobile.xcarchive archive
```

#### 2. Export IPA
```bash
xcodebuild -exportArchive -archivePath HMSMobile.xcarchive -exportPath ./build -exportOptionsPlist ExportOptions.plist
```

#### 3. Upload to App Store Connect
- Use Xcode or Application Loader to upload IPA
- Configure app metadata in App Store Connect
- Submit for review

## 🔧 Configuration Management

### Environment Variables
```bash
# Production environment variables
export NODE_ENV=production
export DB_HOST=your-production-db-host
export MONGODB_URI=your-production-mongodb-uri
export REDIS_URL=your-production-redis-url
export JWT_SECRET=your-super-secure-jwt-secret
```

### SSL/TLS Configuration
```bash
# Generate SSL certificates (Let's Encrypt)
certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Configure Nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /api {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 📊 Monitoring and Logging

### Application Monitoring
```bash
# Install monitoring tools
npm install --save newrelic
npm install --save @sentry/node

# Configure New Relic
export NEW_RELIC_LICENSE_KEY=your-license-key
export NEW_RELIC_APP_NAME="HMS Production"

# Configure Sentry
export SENTRY_DSN=your-sentry-dsn
```

### Log Management
```bash
# Configure log rotation
sudo nano /etc/logrotate.d/hms

/var/log/hms/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 hms hms
    postrotate
        systemctl reload hms
    endscript
}
```

### Health Checks
```bash
# API Health Check
curl -f http://localhost:5000/health || exit 1

# Database Health Check
pg_isready -h localhost -p 5432 -U hms_user

# Redis Health Check
redis-cli ping
```

## 🔐 Security Configuration

### Firewall Setup
```bash
# UFW Configuration
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw deny 5432/tcp  # PostgreSQL (internal only)
sudo ufw deny 27017/tcp # MongoDB (internal only)
sudo ufw deny 6379/tcp  # Redis (internal only)
sudo ufw enable
```

### Database Security
```bash
# PostgreSQL security
sudo -u postgres psql
ALTER USER hms_user WITH PASSWORD 'new-secure-password';
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO hms_user;

# MongoDB security
use admin
db.createUser({
  user: "hms_admin",
  pwd: "new-secure-password",
  roles: ["userAdminAnyDatabase", "dbAdminAnyDatabase", "readWriteAnyDatabase"]
})
```

## 🔄 Backup and Recovery

### Automated Backups
```bash
# PostgreSQL backup script
#!/bin/bash
BACKUP_DIR="/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h localhost -U hms_user hospital_db > $BACKUP_DIR/hospital_db_$DATE.sql
gzip $BACKUP_DIR/hospital_db_$DATE.sql

# MongoDB backup script
#!/bin/bash
BACKUP_DIR="/backups/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)
mongodump --host localhost --port 27017 --db hospital_docs --out $BACKUP_DIR/hospital_docs_$DATE
tar -czf $BACKUP_DIR/hospital_docs_$DATE.tar.gz $BACKUP_DIR/hospital_docs_$DATE
```

### Disaster Recovery
```bash
# PostgreSQL restore
gunzip hospital_db_backup.sql.gz
psql -h localhost -U hms_user -d hospital_db < hospital_db_backup.sql

# MongoDB restore
tar -xzf hospital_docs_backup.tar.gz
mongorestore --host localhost --port 27017 --db hospital_docs hospital_docs_backup/hospital_docs
```

## 🚀 Performance Optimization

### Database Optimization
```sql
-- PostgreSQL performance tuning
-- postgresql.conf
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
```

### Application Optimization
```bash
# Node.js production optimizations
export NODE_ENV=production
export NODE_OPTIONS="--max-old-space-size=4096"

# Enable gzip compression
# Enable HTTP/2
# Configure CDN for static assets
```

## 📋 Deployment Checklist

### Pre-deployment
- [ ] Environment variables configured
- [ ] Database migrations tested
- [ ] SSL certificates installed
- [ ] Backup systems configured
- [ ] Monitoring tools setup
- [ ] Security configurations applied
- [ ] Performance testing completed
- [ ] Load testing passed

### Post-deployment
- [ ] Health checks passing
- [ ] Monitoring alerts configured
- [ ] Log aggregation working
- [ ] Backup verification
- [ ] Security scan completed
- [ ] Performance metrics baseline
- [ ] Documentation updated
- [ ] Team training completed

## 🆘 Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql
sudo -u postgres psql -c "SELECT version();"

# Check MongoDB status
sudo systemctl status mongod
mongo --eval "db.adminCommand('ismaster')"

# Check Redis status
redis-cli ping
```

#### Application Issues
```bash
# Check application logs
tail -f /var/log/hms/application.log

# Check system resources
htop
df -h
free -m

# Check network connectivity
netstat -tulpn | grep :5000
```

#### Performance Issues
```bash
# Monitor database performance
pg_stat_activity
db.currentOp()

# Monitor application performance
npm install -g clinic
clinic doctor -- node server/index.js
```

## 📞 Support

For deployment support and issues:
- Email: support@hospital-hms.com
- Documentation: https://docs.hospital-hms.com
- GitHub Issues: https://github.com/jashmhta/comprehensive-hms/issues