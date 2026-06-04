# AIKYAM JOBS V5 - PRODUCTION DEPLOYMENT GUIDE
============================================

## OVERVIEW
- Beta: beta.aikyamjobs.org (Port: Backend 1338, Frontend 3001)
- Production: aikyamjobs.org (Port: Backend 1339, Frontend 3002)
- No conflicts with existing Ghost sites

## STEP-BY-STEP DEPLOYMENT

### 1. PUSH TO GITHUB (Do this first on local machine)

cd /Users/jinsoraj/Desktop/aikyamjobsv5
git init
git add .
git commit -m "Initial commit: Aikyam Jobs v5"
git remote add origin https://github.com/t4glabs/aikyamjobs-v5.git
git branch -M main
git push -u origin main

### 2. BACKUP LOCAL DATA (Critical!)

cd /Users/jinsoraj/Desktop/aikyamjobsv5/aikyamjobs-backend
tar -czf ~/aikyam-production-data.tar.gz .tmp/data.db public/uploads/

### 3. SERVER SETUP (SSH to your VPS)

# Create directory
sudo mkdir -p /var/www/aikyamjobs-beta
sudo chown -R $USER:$USER /var/www/aikyamjobs-beta
cd /var/www/aikyamjobs-beta

# Clone from GitHub
git clone https://github.com/t4glabs/aikyamjobs-v5.git .

### 4. INSTALL NODE.JS 20 (if not installed)

curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20

### 5. BACKEND SETUP

cd /var/www/aikyamjobs-beta/aikyamjobs-backend
npm install --production

# Create .env file
cat > .env << 'ENVEOF'
HOST=0.0.0.0
PORT=1338
APP_KEYS=YOUR_RANDOM_KEYS_HERE
API_TOKEN_SALT=YOUR_RANDOM_SALT_HERE
ADMIN_JWT_SECRET=YOUR_RANDOM_SECRET_HERE
TRANSFER_TOKEN_SALT=YOUR_RANDOM_SALT_HERE
JWT_SECRET=YOUR_RANDOM_SECRET_HERE
DATABASE_CLIENT=better-sqlite3
DATABASE_FILENAME=.tmp/data.db
NODE_ENV=production
ENVEOF

# Build Strapi
NODE_ENV=production npm run build

### 6. TRANSFER DATA FROM LOCAL TO SERVER

# On local machine:
scp ~/aikyam-production-data.tar.gz your-server:/var/www/aikyamjobs-beta/aikyamjobs-backend/

# On server:
cd /var/www/aikyamjobs-beta/aikyamjobs-backend
tar -xzf aikyam-production-data.tar.gz
rm aikyam-production-data.tar.gz

### 7. FRONTEND SETUP

cd /var/www/aikyamjobs-beta/aikyamjobs-frontend
npm install --production

# Create .env.production
cat > .env.production << 'ENVEOF'
NEXT_PUBLIC_STRAPI_URL=http://localhost:1338/api
ENVEOF

# Build Next.js
npm run build

### 8. PM2 SETUP

npm install -g pm2

# Create ecosystem file
cat > /var/www/aikyamjobs-beta/ecosystem.config.js << 'PMEOF'
module.exports = {
  apps: [
    {
      name: 'aikyamjobs-beta-backend',
      cwd: '/var/www/aikyamjobs-beta/aikyamjobs-backend',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 1338
      }
    },
    {
      name: 'aikyamjobs-beta-frontend',
      cwd: '/var/www/aikyamjobs-beta/aikyamjobs-frontend',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    }
  ]
};
PMEOF

# Start services
cd /var/www/aikyamjobs-beta
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Run the command it outputs

### 9. NGINX CONFIGURATION

# See separate file: nginx-beta.conf

sudo nano /etc/nginx/sites-available/beta.aikyamjobs.org
# Paste the nginx configuration

# Enable site
sudo ln -s /etc/nginx/sites-available/beta.aikyamjobs.org /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

### 10. SSL CERTIFICATE

sudo certbot --nginx -d beta.aikyamjobs.org

### 11. UPDATE FRONTEND ENV FOR HTTPS

cd /var/www/aikyamjobs-beta/aikyamjobs-frontend
nano .env.production
# Change to: NEXT_PUBLIC_STRAPI_URL=https://beta.aikyamjobs.org/api

npm run build
pm2 restart aikyamjobs-beta-frontend

============================================
DONE! Visit https://beta.aikyamjobs.org
============================================

## MOVING TO MAIN DOMAIN (Later)

1. Copy /var/www/aikyamjobs-beta to /var/www/aikyamjobs
2. Update ecosystem.config.js (ports: 1339, 3002)
3. Update frontend .env.production (NEXT_PUBLIC_STRAPI_URL=https://aikyamjobs.org/api)
4. Create new nginx config for aikyamjobs.org
5. Get SSL: sudo certbot --nginx -d aikyamjobs.org -d www.aikyamjobs.org
6. Start PM2: cd /var/www/aikyamjobs && pm2 start ecosystem.config.js

## MAINTENANCE

# View logs
pm2 logs aikyamjobs-beta-backend
pm2 logs aikyamjobs-beta-frontend

# Restart
pm2 restart aikyamjobs-beta-backend
pm2 restart aikyamjobs-beta-frontend

# Deploy updates
cd /var/www/aikyamjobs-beta
git pull
cd aikyamjobs-frontend && npm install && npm run build
cd ../aikyamjobs-backend && npm install && npm run build
pm2 restart all
