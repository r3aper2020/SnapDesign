# Deployment Guide 🚀

This guide covers deploying both the API server and mobile app to production.

## Prerequisites

- Production server (VPS, cloud instance, etc.)
- Domain name (optional but recommended)
- SSL certificate (for HTTPS)
- Node.js 18+ on production server
- PM2 or similar process manager (recommended)

## API Server Deployment

### 1. Prepare Production Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Create app directory
sudo mkdir -p /var/www/snapdesign-api
sudo chown $USER:$USER /var/www/snapdesign-api
```

### 2. Deploy API Code

```bash
# Clone repository
cd /var/www/snapdesign-api
git clone <your-repo-url> .

# Install dependencies
npm ci --only=production

# Build the application
npm run build

# Create production environment file
cp .env.example .env
# Edit .env with production values
nano .env
```

### 3. Configure Environment Variables

```env
# Production Environment
NODE_ENV=production
GEMINI_API_KEY=your_production_key
GEMINI_MODEL=gemini-2.5-flash-image-preview
AMAZON_PARTNER_TAG=your_affiliate_tag
AMAZON_HOST=amazon.com
PORT=4000
```

### 4. Start with PM2

```bash
# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'snapdesign-api',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 4000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF

# Create logs directory
mkdir logs

# Start the application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save
pm2 startup
```

### 5. Configure Nginx (Optional but Recommended)

```bash
# Install Nginx
sudo apt install nginx

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/snapdesign-api
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/snapdesign-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Configure firewall
sudo ufw allow 'Nginx Full'
sudo ufw allow 22
sudo ufw enable
```

### 6. SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

## Mobile App Deployment

### 1. Install EAS CLI

```bash
npm install -g @expo/eas-cli
```

### 2. Configure EAS

```bash
cd app
eas login
eas build:configure
```

### 3. Build for Production

```bash
# Build for Android
eas build --platform android --profile production

# Build for iOS (requires Apple Developer account)
eas build --platform ios --profile production
```

### 4. Submit to App Stores

```bash
# Submit to Google Play Store
eas submit --platform android

# Submit to Apple App Store
eas submit --platform ios
```

## Monitoring and Maintenance

### 1. API Server Monitoring

```bash
# Check PM2 status
pm2 status
pm2 monit

# View logs
pm2 logs snapdesign-api
pm2 logs snapdesign-api --err
pm2 logs snapdesign-api --out

# Restart application
pm2 restart snapdesign-api

# Update application
cd /var/www/snapdesign-api
git pull
npm ci --only=production
npm run build
pm2 restart snapdesign-api
```

### 2. Health Checks

```bash
# Test API health
curl https://your-domain.com/health

# Test design endpoint
curl -X POST https://your-domain.com/design \
  -H "Content-Type: application/json" \
  -d '{"imageBase64":"test","prompt":"test"}'
```

### 3. Backup and Recovery

```bash
# Backup environment variables
cp .env .env.backup.$(date +%Y%m%d)

# Backup PM2 configuration
pm2 save
cp ~/.pm2/dump.pm2 ~/.pm2/dump.pm2.backup

# Restore from backup
pm2 resurrect ~/.pm2/dump.pm2.backup
```

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   sudo netstat -tulpn | grep :4000
   sudo kill -9 <PID>
   ```

2. **Memory issues**
   ```bash
   # Check memory usage
   pm2 monit
   
   # Restart with more memory
   pm2 restart snapdesign-api --max-memory-restart 1G
   ```

3. **SSL certificate expired**
   ```bash
   sudo certbot renew
   sudo systemctl reload nginx
   ```

### Performance Optimization

1. **Enable compression in Nginx**
   ```nginx
   gzip on;
   gzip_types text/plain text/css application/json application/javascript;
   ```

2. **Set up caching headers**
   ```nginx
   location /health {
       expires 1m;
       add_header Cache-Control "public, no-transform";
   }
   ```

3. **Monitor API performance**
   ```bash
   # Install monitoring tools
   npm install -g clinic
   
   # Profile the application
   clinic doctor -- node dist/index.js
   ```

## Security Considerations

1. **Environment Variables**: Never commit `.env` files to version control
2. **Firewall**: Only expose necessary ports (80, 443, 22)
3. **Updates**: Regularly update dependencies and system packages
4. **Monitoring**: Set up alerts for server health and API errors
5. **Backups**: Regular backups of configuration and data

## Support

For deployment issues:
1. Check the logs: `pm2 logs snapdesign-api`
2. Verify environment variables are set correctly
3. Test endpoints individually
4. Check server resources (CPU, memory, disk)
5. Verify network connectivity and firewall rules
