module.exports = {
  apps: [{
    name: 'websocket-server',
    script: 'main.js',
    instances: 'max', // Use all available CPU cores
    exec_mode: 'cluster',
    
    // Environment variables
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    
    // Logging
    log_file: './logs/app.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Auto-restart configuration
    watch: false, // Set to true for development
    ignore_watch: ['node_modules', 'logs'],
    max_restarts: 10,
    min_uptime: '10s',
    
    // Memory management
    max_memory_restart: '1G',
    
    // Health monitoring
    kill_timeout: 5000,
    listen_timeout: 3000,
    
    // Advanced PM2 features
    instance_var: 'INSTANCE_ID',
    merge_logs: true,
    
    // Graceful shutdown
    shutdown_with_message: true
  }]
};
