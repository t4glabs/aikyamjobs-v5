# Aikyam Jobs v5 - Production Deployment Guide

## Overview

**Beta Environment:**
- Domain: `beta.aikyamjobs.org`
- Backend Port: `1338`
- Frontend Port: `3001`
- Location: `/var/www/beta-aikyamjobs`

**Production Environment (Later):**
- Domain: `aikyamjobs.org`
- Backend Port: `1339`
- Frontend Port: `3002`
- Location: `/var/www/aikyamjobs`

---

## Prerequisites Completed ✅

- [x] Code pushed to GitHub: `https://github.com/t4glabs/aikyamjobs-v5`
- [x] Production data backup created: `~/aikyam-production-data.tar.gz` (897 MB)

---

## Beta Deployment Steps

### Step 1: Clone Repository on VPS

```bash
# SSH to your VPS as root
ssh root@your-vps-ip

# Clone the repository
cd /var/www
git clone https://github.com/t4glabs/aikyamjobs-v5.git beta-aikyamjobs
cd beta-aikyamjobs
```

### Step 2: Upload and Restore Production Data

**On your local machine:**
```bash
scp ~/aikyam-production-data.tar.gz root@your-vps-ip:/var/www/beta-aikyamjobs/
```

**On VPS:**
```bash
cd /var/www/beta-aikyamjobs/aikyamjobs-backend
tar -xzf ../aikyam-production-data.tar.gz
rm ../aikyam-production-data.tar.gz

# Verify data extracted
ls -lh .tmp/data.db
ls public/uploads/ | head -10
```

### Step 3: Backend Setup

```bash
cd /var/www/beta-aikyamjobs/aikyamjobs-backend

# Install dependencies
npm install

# Create .env file
nano .env
```

**Add this content to `.env`:**
```env
HOST=0.0.0.0
PORT=1338
NODE_ENV=production

# Public URL for image/asset URLs (IMPORTANT!)
PUBLIC_URL=https://beta.aikyamjobs.org

# Generate these with: openssl rand -base64 32
APP_KEYS=your-generated-key-1,your-generated-key-2
API_TOKEN_SALT=your-generated-salt
ADMIN_JWT_SECRET=your-generated-secret
TRANSFER_TOKEN_SALT=your-generated-salt
JWT_SECRET=your-generated-secret

DATABASE_CLIENT=better-sqlite3
DATABASE_FILENAME=.tmp/data.db
```

**Build and start backend:**
```bash
# Build Strapi
npm run build

# Start with PM2
NODE_ENV=production pm2 start npm --name "aikyamjobs-beta-backend" -- run start

# Save PM2 configuration
pm2 save

# Verify it's running
pm2 list
curl http://localhost:1338/api/jobs
```

### Step 4: Frontend Setup

```bash
cd /var/www/beta-aikyamjobs/aikyamjobs-frontend

# Install dependencies
npm install

# Create .env.local file
nano .env.local
```

**Add this content to `.env.local`:**
```env
NEXT_PUBLIC_STRAPI_URL=http://localhost:1338
NEXT_PUBLIC_SITE_URL=https://beta.aikyamjobs.org
```

**Build and start frontend:**
```bash
# Build Next.js
npm run build

# Start with PM2 on port 3001
PORT=3001 NODE_ENV=production pm2 start npm --name "aikyamjobs-beta-frontend" -- run start

# Save PM2 configuration
pm2 save

# Verify both apps are running
pm2 list
```

### Step 5: Configure Nginx

**IMPORTANT:** If your VPS hosts multiple sites with Ghost or other CMSs, proper nginx configuration is critical to avoid SSL certificate conflicts.

**Create nginx root directory (required for Ghost-managed VPS):**
```bash
mkdir -p /var/www/beta-aikyamjobs/system/nginx-root
```

**Check if Next.js is listening on IPv6 only:**
```bash
netstat -tlnp | grep 3001
```

If you see `:::3001` (IPv6 only), you'll need to use IPv6 localhost in nginx. If you see `0.0.0.0:3001` (IPv4), use IPv4 localhost.

**Create Nginx configuration:**
```bash
nano /etc/nginx/sites-available/beta.aikyamjobs.org
```

**Add this configuration:**
```nginx
# Backend API (Strapi on port 1338)
upstream beta_aikyamjobs_backend {
    server 127.0.0.1:1338;
    keepalive 64;
}

# Frontend (Next.js on port 3001)
# IMPORTANT: Use [::1]:3001 if Next.js listens on IPv6 only (:::3001)
# Use 127.0.0.1:3001 if Next.js listens on IPv4 (0.0.0.0:3001)
upstream beta_aikyamjobs_frontend {
    server [::1]:3001;  # Change to 127.0.0.1:3001 if needed
    keepalive 64;
}

# HTTP - Redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name beta.aikyamjobs.org;
    return 301 https://$server_name$request_uri;
}

# HTTPS
server {
    # CRITICAL: default_server ensures correct SSL certificate is served
    # This prevents other sites' certificates from being used
    listen 443 ssl http2 default_server;
    listen [::]:443 ssl http2 default_server;

    server_name beta.aikyamjobs.org;
    root /var/www/beta-aikyamjobs/system/nginx-root;

    # SSL Certificate (will be added by certbot)
    # ssl_certificate /etc/letsencrypt/live/beta.aikyamjobs.org/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/beta.aikyamjobs.org/privkey.pem;

    # Modern SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_ciphers "ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384";
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1440m;
    ssl_session_tickets off;

    add_header Strict-Transport-Security 'max-age=31536000; includeSubDomains' always;
    add_header X-Frame-Options SAMEORIGIN always;
    add_header X-Content-Type-Options nosniff always;

    # Frontend
    location / {
        proxy_pass http://beta_aikyamjobs_frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api {
        rewrite ^/api/(.*)$ /$1 break;
        proxy_pass http://beta_aikyamjobs_backend;
        proxy_http_version 1.1;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Server $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Host $http_host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_pass_request_headers on;
    }

    # Backend Admin Panel
    location /admin {
        proxy_pass http://beta_aikyamjobs_backend/admin;
        proxy_http_version 1.1;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Server $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Host $http_host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_pass_request_headers on;
    }

    # Strapi uploads
    location /uploads {
        proxy_pass http://beta_aikyamjobs_backend/uploads;
        proxy_http_version 1.1;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Server $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Host $http_host;
    }

    client_max_body_size 100M;
}
```

**Enable site and reload Nginx:**
```bash
# Enable the site
ln -s /etc/nginx/sites-available/beta.aikyamjobs.org /etc/nginx/sites-enabled/

# Test configuration
nginx -t

# Reload Nginx
systemctl reload nginx
```

### Step 6: Install SSL Certificate

```bash
# Install certbot if not already installed
apt install certbot python3-certbot-nginx -y

# Get SSL certificate
certbot --nginx -d beta.aikyamjobs.org

# Test auto-renewal
certbot renew --dry-run
```

### Step 7: Update Frontend for HTTPS

```bash
cd /var/www/beta-aikyamjobs/aikyamjobs-frontend

# Update .env.local
nano .env.local
```

**Change to:**
```env
NEXT_PUBLIC_STRAPI_URL=https://beta.aikyamjobs.org/api
NEXT_PUBLIC_SITE_URL=https://beta.aikyamjobs.org
```

**Rebuild and restart:**
```bash
npm run build
pm2 restart aikyamjobs-beta-frontend
```

---

## ✅ Deployment Complete!

Visit: **https://beta.aikyamjobs.org**

Admin Panel: **https://beta.aikyamjobs.org/admin**

---

## Maintenance Commands

### View Logs
```bash
# Backend logs
pm2 logs aikyamjobs-beta-backend

# Frontend logs
pm2 logs aikyamjobs-beta-frontend

# All logs
pm2 logs
```

### Restart Services
```bash
# Restart backend
pm2 restart aikyamjobs-beta-backend

# Restart frontend
pm2 restart aikyamjobs-beta-frontend

# Restart both
pm2 restart all
```

### Deploy Updates
```bash
cd /var/www/beta-aikyamjobs

# Pull latest code
git pull

# Update backend
cd aikyamjobs-backend
npm install
npm run build
pm2 restart aikyamjobs-beta-backend

# Update frontend
cd ../aikyamjobs-frontend
npm install
npm run build
pm2 restart aikyamjobs-beta-frontend
```

### Check Status
```bash
# PM2 status
pm2 list

# Backend health
curl http://localhost:1338/api/jobs

# Frontend health
curl http://localhost:3001

# Nginx status
systemctl status nginx

# Check ports
netstat -tlnp | grep -E "1338|3001"
```

---

## Moving to Production (aikyamjobs.org)

When beta testing is complete and you're ready to launch on the main domain:

### Prerequisites
- Beta site fully tested and working at `https://beta.aikyamjobs.org`
- All content migrated and verified in Strapi admin
- DNS for `aikyamjobs.org` points to your VPS IP
- Cloudflare proxy is OFF (gray cloud, DNS only)

### Step 1: Backup Beta Data
```bash
# Create backup before production migration
cd /var/www/beta-aikyamjobs/aikyamjobs-backend
tar -czf ~/aikyam-beta-backup-$(date +%Y%m%d).tar.gz .tmp/data.db public/uploads/

# Verify backup
ls -lh ~/aikyam-beta-backup-*.tar.gz
```

### Step 2: Copy Beta to Production
```bash
# Copy entire beta directory to production
cp -r /var/www/beta-aikyamjobs /var/www/aikyamjobs

cd /var/www/aikyamjobs
```

### Step 3: Update Backend Configuration
```bash
cd /var/www/aikyamjobs/aikyamjobs-backend

# Edit .env to change port
nano .env
# Change: PORT=1338 → PORT=1339
# All other settings remain the same

# Rebuild Strapi
npm run build
```

### Step 4: Update Frontend Configuration
```bash
cd /var/www/aikyamjobs/aikyamjobs-frontend

# Edit environment
nano .env.local
```

**Update to:**
```env
NEXT_PUBLIC_STRAPI_URL=https://aikyamjobs.org/api
NEXT_PUBLIC_SITE_URL=https://aikyamjobs.org
```

**Rebuild Next.js:**
```bash
npm run build
```

### Step 5: Start Production Services
```bash
# Start backend on port 1339
cd /var/www/aikyamjobs/aikyamjobs-backend
NODE_ENV=production pm2 start npm --name "aikyamjobs-prod-backend" -- run start

# Start frontend on port 3002
cd ../aikyamjobs-frontend
PORT=3002 NODE_ENV=production pm2 start npm --name "aikyamjobs-prod-frontend" -- run start

# Save PM2 configuration
pm2 save

# Verify services
pm2 list
curl http://localhost:1339/api/jobs
curl http://localhost:3002
```

### Step 6: Create Production Nginx Config

**CRITICAL:** Production config must **NOT** use `default_server` since beta still needs it.

```bash
# Create production config from scratch
nano /etc/nginx/sites-available/aikyamjobs.org
```

**Add this configuration:**
```nginx
# Production Backend (Strapi on port 1339)
upstream aikyamjobs_backend {
    server 127.0.0.1:1339;
    keepalive 64;
}

# Production Frontend (Next.js on port 3002)
# Use [::1]:3002 if Next.js listens on IPv6 only
upstream aikyamjobs_frontend {
    server [::1]:3002;  # Change to 127.0.0.1:3002 if needed
    keepalive 64;
}

# HTTP - Redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name aikyamjobs.org www.aikyamjobs.org;
    return 301 https://$server_name$request_uri;
}

# HTTPS
server {
    # DO NOT use default_server here (beta needs it)
    listen 443 ssl http2;
    listen [::]:443 ssl http2;

    server_name aikyamjobs.org www.aikyamjobs.org;
    root /var/www/aikyamjobs/system/nginx-root;

    # SSL Certificate (will be added by certbot)
    # ssl_certificate /etc/letsencrypt/live/aikyamjobs.org/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/aikyamjobs.org/privkey.pem;

    # Modern SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_ciphers "ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384";
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1440m;
    ssl_session_tickets off;

    add_header Strict-Transport-Security 'max-age=31536000; includeSubDomains' always;
    add_header X-Frame-Options SAMEORIGIN always;
    add_header X-Content-Type-Options nosniff always;

    # Frontend
    location / {
        proxy_pass http://aikyamjobs_frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api {
        rewrite ^/api/(.*)$ /$1 break;
        proxy_pass http://aikyamjobs_backend;
        proxy_http_version 1.1;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Server $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Host $http_host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_pass_request_headers on;
    }

    # Backend Admin Panel
    location /admin {
        proxy_pass http://aikyamjobs_backend/admin;
        proxy_http_version 1.1;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Server $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Host $http_host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_pass_request_headers on;
    }

    # Strapi uploads
    location /uploads {
        proxy_pass http://aikyamjobs_backend/uploads;
        proxy_http_version 1.1;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Server $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Host $http_host;
    }

    client_max_body_size 100M;
}
```

**Enable and test:**
```bash
# Create nginx root directory
mkdir -p /var/www/aikyamjobs/system/nginx-root

# Enable site
ln -s /etc/nginx/sites-available/aikyamjobs.org /etc/nginx/sites-enabled/

# Test configuration
nginx -t

# Reload nginx
systemctl reload nginx
```

### Step 7: Install SSL Certificate
```bash
# Install certificate for production domain
certbot --nginx -d aikyamjobs.org -d www.aikyamjobs.org

# Verify certbot updated the nginx config
grep ssl_certificate /etc/nginx/sites-available/aikyamjobs.org

# Test auto-renewal
certbot renew --dry-run
```

### Step 8: Final Verification
```bash
# Check all services
pm2 list

# Test production backend
curl http://localhost:1339/api/jobs

# Test production frontend
curl http://localhost:3002

# Test HTTPS
curl -I https://aikyamjobs.org

# Check certificate
openssl s_client -connect aikyamjobs.org:443 -servername aikyamjobs.org < /dev/null 2>&1 | grep "subject:"
# Should show: subject: CN=aikyamjobs.org
```

### Step 9: Monitor Logs
```bash
# Watch nginx logs
tail -f /var/log/nginx/access.log

# Watch PM2 logs
pm2 logs aikyamjobs-prod-backend
pm2 logs aikyamjobs-prod-frontend
```

## Post-Production Launch

### Keep Beta Running (Recommended)
Keep the beta site running for testing future updates before deploying to production.

### Decommission Beta (Optional)
If you want to shut down beta:

```bash
# Stop beta services
pm2 stop aikyamjobs-beta-frontend
pm2 stop aikyamjobs-beta-backend
pm2 save

# Disable beta nginx site
rm /etc/nginx/sites-enabled/beta.aikyamjobs.org
nginx -t
systemctl reload nginx

# Archive beta directory
tar -czf ~/beta-aikyamjobs-archive.tar.gz /var/www/beta-aikyamjobs
rm -rf /var/www/beta-aikyamjobs
```

### Update Production from Beta
When you have updates tested in beta:

```bash
# In beta directory, pull latest code
cd /var/www/beta-aikyamjobs
git pull

# Test in beta first
# ... (test thoroughly)

# Once verified, deploy to production
cd /var/www/aikyamjobs
git pull

# Update and restart backend
cd aikyamjobs-backend
npm install
npm run build
pm2 restart aikyamjobs-prod-backend

# Update and restart frontend
cd ../aikyamjobs-frontend
npm install
npm run build
pm2 restart aikyamjobs-prod-frontend
```

---

## Troubleshooting

### ERR_SSL_PROTOCOL_ERROR in Browser

**Symptoms:** Site works from VPS (`curl https://beta.aikyamjobs.org` succeeds) but browsers show SSL protocol error.

**Root Cause:** Wrong SSL certificate being served due to nginx SNI (Server Name Indication) routing issues on multi-site servers.

**Diagnosis:**
```bash
# Test what certificate is served when accessing by IP
curl -vk https://YOUR_SERVER_IP -H "Host: beta.aikyamjobs.org" 2>&1 | grep "subject:"
```

If it shows a different domain's certificate (not `CN=beta.aikyamjobs.org`), nginx is serving the wrong certificate.

**Fix:**
```bash
nano /etc/nginx/sites-available/beta.aikyamjobs.org

# Ensure these lines include default_server:
listen 443 ssl http2 default_server;
listen [::]:443 ssl http2 default_server;

# Test and reload
nginx -t
systemctl reload nginx
```

**Verify fix:**
```bash
curl -vk https://YOUR_SERVER_IP -H "Host: beta.aikyamjobs.org" 2>&1 | grep "subject:"
# Should show: subject: CN=beta.aikyamjobs.org
```

### No nginx logs when accessing site

**Symptoms:** Browser can't connect, but `tail -f /var/log/nginx/access.log | grep beta` shows nothing.

**Common causes:**
1. **DNS issue** - Check: `dig beta.aikyamjobs.org +short` (should show your server IP)
2. **Cloudflare proxy still on** - Verify Cloudflare DNS has gray cloud (DNS only), not orange
3. **Firewall blocking port 443** - Check Hetzner Cloud Firewall allows port 443 inbound

**Fix Hetzner Firewall:**
1. Go to Hetzner Cloud Console → Firewalls
2. Ensure inbound rules allow: TCP port 22 (SSH), 80 (HTTP), 443 (HTTPS) from 0.0.0.0/0

### Backend not starting
```bash
# Check logs
pm2 logs aikyamjobs-beta-backend

# Check port
netstat -tlnp | grep 1338

# Verify database
ls -lh /var/www/beta-aikyamjobs/aikyamjobs-backend/.tmp/data.db

# Check if Strapi build completed
ls -la /var/www/beta-aikyamjobs/aikyamjobs-backend/build/
```

### Frontend not starting
```bash
# Check logs
pm2 logs aikyamjobs-beta-frontend

# Check build
cd /var/www/beta-aikyamjobs/aikyamjobs-frontend
npm run build

# Check port and IPv4/IPv6
netstat -tlnp | grep 3001

# If showing :::3001 (IPv6 only), update nginx upstream to use [::1]:3001
```

### 502 Bad Gateway

**Cause:** nginx can't connect to Next.js frontend (IPv4/IPv6 mismatch).

**Diagnosis:**
```bash
# Check what Next.js is listening on
netstat -tlnp | grep 3001

# If :::3001 (IPv6), nginx must use [::1]:3001
# If 0.0.0.0:3001 (IPv4), nginx must use 127.0.0.1:3001
```

**Fix:**
```bash
nano /etc/nginx/sites-available/beta.aikyamjobs.org

# Update upstream:
upstream beta_aikyamjobs_frontend {
    server [::1]:3001;  # For IPv6
    # OR
    server 127.0.0.1:3001;  # For IPv4
}

nginx -t
systemctl reload nginx
```

**Alternative fix - restart PM2 services:**
```bash
pm2 restart all
systemctl reload nginx
```

### Images not loading
```bash
# Check uploads directory
ls /var/www/beta-aikyamjobs/aikyamjobs-backend/public/uploads/

# Check Nginx configuration for /uploads location
nginx -T | grep uploads

# Test direct access
curl -I http://localhost:1338/uploads/test.jpg
```

### SSL Certificate Verification Failed

**Symptoms:** `SSL certificate verify failed` or certificate warnings

**Fix:**
```bash
# Renew certificate
certbot renew --force-renewal -d beta.aikyamjobs.org

# Verify certificate
openssl s_client -connect beta.aikyamjobs.org:443 -servername beta.aikyamjobs.org < /dev/null 2>&1 | grep "Verify return code"

# Should show: Verify return code: 0 (ok)
```
