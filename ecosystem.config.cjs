module.exports = {
  apps: [
    {
      name: 'agence',
      script: 'server/dist/index.js',
      cwd: '/var/www/agence/server',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};
