// PM2 Ecosystem Configuration for OpenRouter Proxy
// Start with: pm2 start ecosystem.config.cjs

module.exports = {
  apps: [{
    name: 'openrouter-proxy',
    script: 'node_modules/.bin/tsx',
    args: 'watch src/index.ts',
    cwd: __dirname,
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'development',
      PORT: 3001
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: 'D:\\logs\\openrouter-proxy\\error.log',
    out_file: 'D:\\logs\\openrouter-proxy\\out.log',
    log_file: 'D:\\logs\\openrouter-proxy\\combined.log',
    time: true,
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};

