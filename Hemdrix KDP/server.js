require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');

// ── Routes ────────────────────────────────────────────────────────────────────
const authRoutes = require('./routes/auth');
const pushRoutes = require('./routes/push');
const adminRoutes = require('./routes/admin');
const writerRoutes = require('./routes/writer');
const uploaderRoutes = require('./routes/uploader');

const app = express();
const server = http.createServer(app);

// ── Socket.io Setup ───────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  },
});

// Attach io to app so controllers can emit events
app.set('io', io);

// Socket.io JWT authentication middleware
io.use((socket, next) => {
  try {
    const cookieHeader = socket.handshake.headers.cookie || '';
    const tokenMatch = cookieHeader.match(/token=([^;]+)/);
    if (!tokenMatch) return next(new Error('Authentication error'));
    const decoded = jwt.verify(tokenMatch[1], process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  const userId = socket.user?.id;
  const role = socket.user?.role;
  console.log(`[Socket] Connected: ${userId} (${role})`);

  if (userId) {
    socket.join(`user_${userId}`);
    if (role === 'WRITER') {
      socket.join(`writer_${userId}`);
      console.log(`[Socket] Joined room: writer_${userId}`);
    }
    if (role === 'UPLOADER') {
      socket.join(`uploader_${userId}`);
      console.log(`[Socket] Joined room: uploader_${userId}`);
    }
  }

  socket.on('join:writer', () => {
    if (socket.user?.role === 'WRITER') {
      socket.join(`writer_${socket.user.id}`);
    }
  });

  socket.on('join:uploader', () => {
    if (socket.user?.role === 'UPLOADER') {
      socket.join(`uploader_${socket.user.id}`);
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Disconnected: ${socket.user?.id}`);
  });
});

// ── Core Middleware ───────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/writer', writerRoutes);
app.use('/api/uploader', uploaderRoutes);

// ── SPA Catch-all ─────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

// ── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// ── Database & Server Start ───────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('[DB] Connected to MongoDB Atlas');
    server.listen(PORT, () => {
      console.log(`[Server] BookFlow running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('[DB] Connection failed:', err.message);
    process.exit(1);
  });

module.exports = { app, io };
