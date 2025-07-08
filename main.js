const http = require("http");
const express = require("express");
const app = express();

app.use(express.static("public"));
// require("dotenv").config();

const serverPort = process.env.PORT || 3000;
const server = http.createServer(app);
const WebSocket = require("ws");
const winston = require("winston");
const rateLimit = require("express-rate-limit");

let heartbeatInterval;
const clientConnections = new Map(); // Track connections per IP

// Configure structured logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'websocket-server' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

const wss =
  process.env.NODE_ENV === "production"
    ? new WebSocket.Server({ server })
    : new WebSocket.Server({ port: 5001 });

// Add server-level error handling
server.on('error', (error) => {
  logger.error('HTTP Server error:', { error: error.message, code: error.code });
  if (error.code === 'EADDRINUSE') {
    logger.error('Port already in use, retrying...');
    setTimeout(() => {
      server.close();
      server.listen(serverPort);
    }, 1000);
  }
});

// Add WebSocket server error handling
wss.on('error', (error) => {
  logger.error('WebSocket Server error:', { error: error.message });
});

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  const healthCheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now(),
    connections: wss.clients.size,
    memory: process.memoryUsage()
  };
  res.status(200).json(healthCheck);
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
  const metrics = {
    activeConnections: wss.clients.size,
    totalMemoryUsage: process.memoryUsage(),
    uptime: process.uptime(),
    connectionsPerIP: Array.from(clientConnections.entries())
  };
  res.status(200).json(metrics);
});

server.listen(serverPort);
logger.info(`Server started on port ${serverPort} in stage ${process.env.NODE_ENV}`);

// Simple authentication function (replace with your auth logic)
function authenticateClient(req) {
  const token = req.headers.authorization;
  // For demo purposes - replace with proper JWT validation
  return token === 'Bearer valid-token';    
}

// Connection limits per IP
const MAX_CONNECTIONS_PER_IP = 10;
const MAX_TOTAL_CONNECTIONS = 1000;

function trackClientConnection(ip) {
  const current = clientConnections.get(ip) || 0;
  clientConnections.set(ip, current + 1);
}

function untrackClientConnection(ip) {
  const current = clientConnections.get(ip) || 0;
  if (current <= 1) {
    clientConnections.delete(ip);
  } else {
    clientConnections.set(ip, current - 1);
  }
}

wss.on("connection", function (ws, req) {
  const clientIP = req.socket.remoteAddress;
  
  // Authentication check
  if (!authenticateClient(req)) {
    logger.warn('Unauthorized connection attempt', { ip: clientIP });
    ws.close(1008, 'Unauthorized');
    return;
  }

  // Connection limits
  if (wss.clients.size >= MAX_TOTAL_CONNECTIONS) {
    logger.warn('Server at max capacity', { ip: clientIP });
    ws.close(1013, 'Server overloaded');
    return;
  }

  const connectionsFromIP = clientConnections.get(clientIP) || 0;
  if (connectionsFromIP >= MAX_CONNECTIONS_PER_IP) {
    logger.warn('Too many connections from IP', { ip: clientIP, count: connectionsFromIP });
    ws.close(1008, 'Too many connections');
    return;
  }

  trackClientConnection(clientIP);
  
  logger.info('Connection opened', { 
    ip: clientIP, 
    totalClients: wss.clients.size,
    connectionsFromIP: clientConnections.get(clientIP)
  });

  // Critical: Add error handler for each connection
  ws.on('error', (error) => {
    logger.error('WebSocket connection error:', { error: error.message, ip: clientIP });
  });

  // Add proper heartbeat tracking
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  // Start heartbeat when first connection is made
  if (wss.clients.size === 1 && !heartbeatInterval) {
    logger.info('Starting heartbeat interval');
    startHeartbeat();
  }

  ws.on("message", (data) => {
    let stringifiedData = data.toString();
    if (stringifiedData === 'pong') {
      logger.debug('Heartbeat pong received', { ip: clientIP });
      return;
    }
    broadcast(ws, stringifiedData, false);
  });

  ws.on("close", (code, reason) => {
    untrackClientConnection(clientIP);
    logger.info('Connection closed', { 
      ip: clientIP, 
      code, 
      reason: reason.toString(),
      totalClients: wss.clients.size
    });

    // Stop heartbeat when no clients remain
    if (wss.clients.size === 0 && heartbeatInterval) {
      logger.info('Stopping heartbeat interval - no clients connected');
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
  });
});

// Implement broadcast function because of ws doesn't have it
const broadcast = (ws, message, includeSelf) => {
  if (includeSelf) {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  } else {
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
};

/**
 * Proper WebSocket heartbeat implementation using ping/pong frames
 */
const startHeartbeat = () => {
  heartbeatInterval = setInterval(() => {
    wss.clients.forEach((client) => {
      if (client.isAlive === false) {
        console.log('Terminating unresponsive client');
        return client.terminate();
      }

      client.isAlive = false;
      if (client.readyState === WebSocket.OPEN) {
        client.ping();
      }
    });
  }, 30000);
};

// Cleanup on server close
wss.on('close', () => {
  clearInterval(heartbeatInterval);
});


app.get('/', (req, res) => {
    res.send('Hello World!');
});