module.exports = {
  apps: [
    {
      name: 'whatsapp-worker',
      cwd: '/opt/seemann-portal',
      script: 'npm',
      args: 'run whatsapp:worker',
      interpreter: 'none',
      instances: 1,
      autorestart: true,
      max_restarts: 20,
      min_uptime: '10s',
      exp_backoff_restart_delay: 2000,
      env: {
        NODE_ENV: 'production',
        LOG_LEVEL: 'info',
      },
    },
  ],
};
