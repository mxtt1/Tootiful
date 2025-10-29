export default {
  apps: [{
    name: 'tuition-backend',
    script: 'src/app.js',
    interpreter: '/home/ec2-user/.nvm/versions/node/v20.*/bin/node',
    interpreter_args: '',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '500M',
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    listen_timeout: 10000,
    kill_timeout: 5000
  }]
};
