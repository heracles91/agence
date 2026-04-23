#!/bin/bash
# Script de déploiement — exécuté sur le VPS par GitHub Actions
set -euo pipefail

APP_DIR=/var/www/agence

echo "=== Déploiement AGENCE ==="
cd "$APP_DIR"

echo ">> git pull"
git pull origin main

echo ">> npm ci (toutes les workspaces, avec devDependencies)"
NODE_ENV=development npm ci

echo ">> Build client (Vite)"
NODE_ENV=production npm run build -w client

echo ">> Build server (tsc)"
NODE_ENV=production npm run build -w server

echo ">> Prisma generate + migrate"
cd server
npx prisma generate
npx prisma migrate deploy
cd ..

echo ">> Redémarrage PM2"
pm2 restart agence --update-env

echo "=== Déploiement terminé ✓ ==="
