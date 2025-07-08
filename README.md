# Production WebSocket Server

A robust, production-ready WebSocket server with authentication, rate limiting, structured logging, and PM2 process management.

## Features

- ✅ **WebSocket Server**: Real-time bidirectional communication
- ✅ **Authentication**: Token-based client authentication
- ✅ **Rate Limiting**: Per-IP connection and request limits
- ✅ **Structured Logging**: Winston-based JSON logging
- ✅ **Health Monitoring**: Health check and metrics endpoints
- ✅ **Process Management**: PM2 clustering and auto-restart
- ✅ **Error Handling**: Comprehensive error handling and recovery
- ✅ **Heartbeat**: Proper ping/pong connection monitoring

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Development Mode
```bash
npm run dev
```

### 3. Production with PM2
```bash
# Install PM2 globally
npm install -g pm2

# Start application
npm run pm2:start

# Monitor
npm run pm2:monit

# View logs
npm run pm2:logs
```

## API Endpoints

### Health Check
```
GET /health
```
Returns server health status, uptime, memory usage, and connection count.

### Metrics
```
GET /metrics
```
Returns detailed metrics including active connections and per-IP connection counts.

## WebSocket Authentication

Clients must provide an `Authorization` header with a Bearer token:
```
Authorization: Bearer valid-token
```

## Configuration

### Connection Limits
- **Max total connections**: 1000
- **Max connections per IP**: 10
- **Rate limit**: 100 requests per 15 minutes per IP

### Environment Variables
- `NODE_ENV`: Environment (development/production)
- `PORT`: Server port (default: 3000)

## PM2 Commands

```bash
# Start
pm2 start ecosystem.config.js

# Stop
pm2 stop websocket-server

# Restart
pm2 restart websocket-server

# Delete
pm2 delete websocket-server

# Monitor
pm2 monit

# Logs
pm2 logs websocket-server

# Status
pm2 status
```

## Logging

Logs are written to:
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only
- Console output in development

## Production Deployment

1. **Environment Setup**:
   ```bash
   export NODE_ENV=production
   export PORT=3000
   ```

2. **Start with PM2**:
   ```bash
   pm2 start ecosystem.config.js --env production
   ```

3. **Save PM2 Configuration**:
   ```bash
   pm2 save
   pm2 startup
   ```

## Security Considerations

- Replace the demo authentication with proper JWT validation
- Use HTTPS in production
- Implement origin validation
- Set up firewall rules
- Monitor logs for suspicious activity

## Monitoring

- Health checks available at `/health`
- Metrics available at `/metrics`
- PM2 monitoring with `pm2 monit`
- Structured JSON logs for external monitoring tools
