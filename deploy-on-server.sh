#!/usr/bin/env bash
set -e

echo "=========================================="
echo " Deploying TunnelSnap on Ubuntu Server    "
echo "=========================================="

APP_DIR="/var/www/tunnelsnap"
DOMAIN="tunnelsnap.pixorva.com"

# 1. Create App Directory
echo "[1/5] Setting up $APP_DIR..."
sudo mkdir -p "$APP_DIR"
sudo chown -R $USER:$USER "$APP_DIR"

# 2. Get application files (via archive or git clone)
if [ -f "/tmp/tunnelsnap-deploy.tar.gz" ]; then
    tar -xzf /tmp/tunnelsnap-deploy.tar.gz -C "$APP_DIR"
    echo "Extracted files to $APP_DIR"
elif [ -d "$APP_DIR/.git" ]; then
    cd "$APP_DIR"
    git pull origin main
else
    git clone https://github.com/pranav2411/TunnelSnap.git "$APP_DIR"
fi

cd "$APP_DIR"

# Ensure .env exists
if [ ! -f "$APP_DIR/.env" ]; then
    cp "$APP_DIR/.env.example" "$APP_DIR/.env" 2>/dev/null || echo "PORT=4050" > "$APP_DIR/.env"
fi

# 3. Install Node.js dependencies & bore tunneling binary
echo "[2/5] Installing production npm packages & tunnel engine..."
npm install --production

if ! command -v bore &> /dev/null; then
    echo "Installing bore tunneling engine..."
    sudo curl -sSL https://github.com/ekzhang/bore/releases/download/v0.5.2/bore-v0.5.2-x86_64-unknown-linux-musl.tar.gz | sudo tar -xz -C /usr/local/bin
    sudo chmod +x /usr/local/bin/bore || true
fi

# 4. Start or restart with PM2
echo "[3/5] Starting application via PM2..."
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
fi

pm2 delete tunnelsnap 2>/dev/null || true
pm2 start server.js --name tunnelsnap --env production
pm2 save

# 5. Configure Nginx Reverse Proxy
echo "[4/5] Configuring Nginx for $DOMAIN..."
NGINX_CONF="/etc/nginx/sites-available/$DOMAIN"

sudo tee "$NGINX_CONF" > /dev/null << 'EOF'
server {
    listen 80;
    server_name tunnelsnap.pixorva.com;

    location / {
        proxy_pass http://127.0.0.1:4050;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
EOF

sudo ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# 6. Request SSL Certificate with Certbot
echo "[5/5] Requesting Let's Encrypt SSL certificate..."
if command -v certbot &> /dev/null; then
    sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email || true
    echo "SSL Certificate configured!"
else
    echo "Certbot not found. Install certbot to enable HTTPS."
fi

echo "=========================================="
echo " TunnelSnap is successfully deployed!     "
echo " Live at: http://$DOMAIN (or https://$DOMAIN)"
echo "=========================================="
