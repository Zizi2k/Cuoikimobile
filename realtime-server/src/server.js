const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const cors = require('cors');
const crypto = require('crypto');
const config = require('./config');
const { authMiddleware } = require('./auth');
const { registerSocketHandlers } = require('./sockets');

const app = express();
app.use(cors({ origin: config.CORS_ORIGIN }));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'QuanLyPhongTro Realtime Socket.IO Server',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/status', (req, res) => {
  const socketsCount = io.engine ? io.engine.clientsCount : 0;
  res.json({
    status: 'ok',
    connectedClients: socketsCount,
    timestamp: new Date().toISOString()
  });
});

// Internal webhook endpoint for PHP backend to broadcast events
app.post('/api/emit', (req, res) => {
  const secret = req.headers['x-realtime-secret'] || req.headers['authorization'];
  const expected = config.REALTIME_INTERNAL_SECRET;

  const cleanSecret = (secret || '').replace(/^Bearer\s+/i, '').trim();
  const provided = Buffer.from(cleanSecret);
  const known = Buffer.from(expected);
  if (provided.length !== known.length || !crypto.timingSafeEqual(provided, known)) {
    return res.status(403).json({ success: false, message: 'Forbidden: Invalid internal secret' });
  }

  const { event, room, data } = req.body;
  if (!event) {
    return res.status(400).json({ success: false, message: 'Missing event name' });
  }

  if (room) {
    io.to(room).emit(event, data);
    console.log(`[Broadcast] Event "${event}" sent to room "${room}"`);
  } else {
    io.emit(event, data);
    console.log(`[Broadcast] Event "${event}" sent globally`);
  }

  return res.json({ success: true, event, room: room || 'global' });
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingTimeout: 20000,
  pingInterval: 25000
});

// Handshake authentication
io.use(authMiddleware);

// Register event handlers
registerSocketHandlers(io);

server.listen(config.PORT, config.HOST, () => {
  console.log(`====================================================`);
  console.log(`🚀 QuanLyPhongTro Realtime Server listening on port ${config.PORT}`);
  console.log(`   Host: ${config.HOST}`);
  console.log(`   Health check: http://localhost:${config.PORT}/health`);
  console.log(`====================================================`);
});
