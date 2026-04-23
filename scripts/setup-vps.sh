#!/bin/bash
# Script de configuration initiale du VPS — Debian 12
# À lancer UNE SEULE FOIS en tant que root sur le VPS.
# Usage : bash setup-vps.sh
set -euo pipefail

DOMAIN="agence.kameni.fr"
APP_DIR="/var/www/agence"
GITHUB_REPO="git@github.com:heracles91/agence.git"

echo "=== 1. Mise à jour système ==="
apt-get update && apt-get upgrade -y
apt-get install -y curl git nginx certbot python3-certbot-nginx ufw

echo "=== 2. Node.js 20 LTS ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
node --version  # doit afficher v20.x.x

echo "=== 3. PM2 ==="
npm install -g pm2
pm2 startup systemd -u root --hp /root

echo "=== 4. PostgreSQL 16 ==="
apt-get install -y postgresql postgresql-contrib
systemctl enable --now postgresql

# Créer l'utilisateur et la base de données
PG_USER="agence"
PG_DB="agence"
sudo -u postgres psql -c "CREATE USER $PG_USER;" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE $PG_DB OWNER $PG_USER;" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $PG_DB TO $PG_USER;" 2>/dev/null || true

echo "=== 5. Firewall ==="
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo "=== 6. Cloner le dépôt ==="
mkdir -p "$APP_DIR"
git clone "$GITHUB_REPO" "$APP_DIR"
chmod +x "$APP_DIR/scripts/deploy.sh"

echo "=== 7. Nginx — configuration reverse proxy ==="
cat > /etc/nginx/sites-available/agence << 'NGINX'
server {
    listen 80;
    server_name agence.kameni.fr;

    # WebSocket (Socket.io)
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400;
    }

    # API + static files served by Node.js
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
        client_max_body_size 20M;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/agence /etc/nginx/sites-enabled/agence
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "=== 8. SSL (Let's Encrypt) ==="
echo ">> Assure-toi que $DOMAIN pointe vers ce serveur avant de continuer."
echo ">> DNS : ajoute un enregistrement A   $DOMAIN → $(curl -s ifconfig.me)"
read -p "Appuie sur Entrée quand le DNS est propagé..."
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m support@kapex.app
systemctl enable certbot.timer

echo "=== 9. Variables d'environnement de production ==="
echo ">> Crée le fichier $APP_DIR/server/.env avec ces valeurs :"
cat << 'ENV'
DATABASE_URL=postgresql://agence@localhost/agence?host=/var/run/postgresql
JWT_SECRET=<openssl rand -hex 32>
JWT_EXPIRES_IN=7d
PORT=3001
NODE_ENV=production
ANTHROPIC_API_KEY=sk-ant-api03-...
CORS_ORIGIN=https://agence.kameni.fr
UPLOAD_DIR=uploads
ENV
read -p "Appuie sur Entrée quand tu as créé le .env..."

echo "=== 10. Premier déploiement ==="
cd "$APP_DIR"
npm ci
npm run build -w client
npm run build -w server
cd server && npx prisma generate && npx prisma migrate deploy && cd ..
pm2 start "$APP_DIR/ecosystem.config.cjs" --env production
pm2 save

echo ""
echo "=========================================="
echo " AGENCE est en ligne : https://$DOMAIN"
echo "=========================================="
