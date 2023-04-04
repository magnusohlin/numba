module.exports = {
  apps: [
    {
      name: 'numba-server',
      script: './numba-server.sh',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      restart_delay: 1000,
      max_restarts: 10
    },
    {
      name: 'numba-app',
      script: './numba-app.sh',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      restart_delay: 1000,
      max_restarts: 10
    }
  ]
}
