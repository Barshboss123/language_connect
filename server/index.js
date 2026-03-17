import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const JWT_SECRET = process.env.JWT_SECRET || 'language_connect_secret_2024';
const PORT = process.env.PORT || 3001;

// ── Database setup ──────────────────────────────────────────────────────────
const db = new Database(join(__dirname, 'data.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    native_lang TEXT NOT NULL,
    learning_lang TEXT NOT NULL,
    bio TEXT DEFAULT '',
    interests TEXT DEFAULT '[]',
    avatar_color TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user1_id TEXT NOT NULL,
    user2_id TEXT NOT NULL,
    started_at INTEGER DEFAULT (strftime('%s','now')),
    ended_at INTEGER,
    FOREIGN KEY(user1_id) REFERENCES users(id),
    FOREIGN KEY(user2_id) REFERENCES users(id)
  );
`);

// ── Express setup ────────────────────────────────────────────────────────────
const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// ── Auth middleware ──────────────────────────────────────────────────────────
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

const AVATAR_COLORS = [
  '#FF6B6B','#4ECDC4','#45B7D1','#96CEB4','#FFEAA7',
  '#DDA0DD','#98D8C8','#F7DC6F','#BB8FCE','#85C1E9'
];

// ── REST Routes ──────────────────────────────────────────────────────────────

// Register
app.post('/api/register', async (req, res) => {
  const { username, email, password, native_lang, learning_lang, bio, interests } = req.body;
  if (!username || !email || !password || !native_lang || !learning_lang)
    return res.status(400).json({ error: 'All fields required' });

  try {
    const hashed = await bcrypt.hash(password, 10);
    const id = uuidv4();
    const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
    db.prepare(`
      INSERT INTO users (id,username,email,password,native_lang,learning_lang,bio,interests,avatar_color)
      VALUES (?,?,?,?,?,?,?,?,?)
    `).run(id, username, email, hashed, native_lang, learning_lang, bio || '', JSON.stringify(interests || []), color);

    const token = jwt.sign({ id, username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id, username, native_lang, learning_lang, bio, interests, avatar_color: color } });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Username or email already taken' });
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({
    token,
    user: {
      id: user.id, username: user.username, native_lang: user.native_lang,
      learning_lang: user.learning_lang, bio: user.bio,
      interests: JSON.parse(user.interests), avatar_color: user.avatar_color
    }
  });
});

// Get current user
app.get('/api/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({
    id: user.id, username: user.username, native_lang: user.native_lang,
    learning_lang: user.learning_lang, bio: user.bio,
    interests: JSON.parse(user.interests), avatar_color: user.avatar_color
  });
});

// Update profile
app.put('/api/me', authMiddleware, (req, res) => {
  const { bio, interests } = req.body;
  db.prepare('UPDATE users SET bio=?, interests=? WHERE id=?')
    .run(bio || '', JSON.stringify(interests || []), req.user.id);
  res.json({ success: true });
});

// Get available partners (opposite language pairing)
app.get('/api/partners', authMiddleware, (req, res) => {
  const me = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  const partners = db.prepare(`
    SELECT id, username, native_lang, learning_lang, bio, interests, avatar_color
    FROM users
    WHERE id != ?
      AND native_lang = ?
      AND learning_lang = ?
    ORDER BY created_at DESC
    LIMIT 50
  `).all(req.user.id, me.learning_lang, me.native_lang);

  res.json(partners.map(p => ({ ...p, interests: JSON.parse(p.interests) })));
});

// ── Socket.io (WebRTC signaling + matching) ──────────────────────────────────
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: true, credentials: true }
});

// online users: socketId → { userId, username, native_lang, learning_lang, avatar_color }
const onlineUsers = new Map();
// room members: roomId → Set<socketId>
const rooms = new Map();
// waiting queue: userId → socketId (users waiting for a random match)
const waitingQueue = new Map();

function verifySocketToken(token) {
  try { return jwt.verify(token, JWT_SECRET); } catch { return null; }
}

io.on('connection', (socket) => {
  const token = socket.handshake.auth.token;
  const decoded = verifySocketToken(token);
  if (!decoded) { socket.disconnect(); return; }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id);
  if (!user) { socket.disconnect(); return; }

  const userInfo = {
    userId: user.id,
    username: user.username,
    native_lang: user.native_lang,
    learning_lang: user.learning_lang,
    avatar_color: user.avatar_color,
    socketId: socket.id
  };
  onlineUsers.set(socket.id, userInfo);

  // Broadcast online count
  io.emit('online_count', onlineUsers.size);

  // ── Direct call to specific user ──
  socket.on('call_user', ({ targetUserId }) => {
    const targetSocket = [...onlineUsers.entries()]
      .find(([, u]) => u.userId === targetUserId);
    if (!targetSocket) {
      socket.emit('call_error', { message: 'User is not online' });
      return;
    }
    const roomId = uuidv4();
    socket.emit('call_initiated', { roomId, partner: targetSocket[1] });
    io.to(targetSocket[0]).emit('incoming_call', {
      roomId,
      caller: userInfo
    });
  });

  socket.on('call_accepted', ({ roomId, callerId }) => {
    const callerSocket = [...onlineUsers.entries()]
      .find(([, u]) => u.userId === callerId);
    if (callerSocket) {
      io.to(callerSocket[0]).emit('call_accepted', { roomId, partner: userInfo });
    }
  });

  socket.on('call_rejected', ({ callerId }) => {
    const callerSocket = [...onlineUsers.entries()]
      .find(([, u]) => u.userId === callerId);
    if (callerSocket) {
      io.to(callerSocket[0]).emit('call_rejected', { username: userInfo.username });
    }
  });

  // ── Random match queue ──
  socket.on('join_queue', () => {
    // Check if there's a compatible partner waiting
    const matchEntry = [...waitingQueue.entries()].find(([waitingUserId, waitingSocketId]) => {
      const waitingUser = onlineUsers.get(waitingSocketId);
      if (!waitingUser) return false;
      // Compatible: their native = my learning AND their learning = my native
      return waitingUser.native_lang === userInfo.learning_lang &&
             waitingUser.learning_lang === userInfo.native_lang;
    });

    if (matchEntry) {
      const [matchedUserId, matchedSocketId] = matchEntry;
      waitingQueue.delete(matchedUserId);
      const roomId = uuidv4();
      const matchedUser = onlineUsers.get(matchedSocketId);

      socket.emit('match_found', { roomId, partner: matchedUser });
      io.to(matchedSocketId).emit('match_found', { roomId, partner: userInfo });
    } else {
      waitingQueue.set(userInfo.userId, socket.id);
      socket.emit('queue_joined');
    }
  });

  socket.on('leave_queue', () => {
    waitingQueue.delete(userInfo.userId);
    socket.emit('queue_left');
  });

  // ── WebRTC Signaling ──
  socket.on('join_room', ({ roomId }) => {
    socket.join(roomId);
    if (!rooms.has(roomId)) rooms.set(roomId, new Set());
    rooms.get(roomId).add(socket.id);

    const others = [...rooms.get(roomId)].filter(id => id !== socket.id);
    socket.emit('room_joined', { roomId, others });
    others.forEach(otherId => {
      io.to(otherId).emit('peer_joined', { socketId: socket.id, user: userInfo });
    });
  });

  socket.on('offer', ({ to, offer }) => {
    io.to(to).emit('offer', { from: socket.id, offer, user: userInfo });
  });

  socket.on('answer', ({ to, answer }) => {
    io.to(to).emit('answer', { from: socket.id, answer });
  });

  socket.on('ice_candidate', ({ to, candidate }) => {
    io.to(to).emit('ice_candidate', { from: socket.id, candidate });
  });

  // ── Chat in room ──
  socket.on('chat_message', ({ roomId, message }) => {
    socket.to(roomId).emit('chat_message', {
      from: userInfo.username,
      message,
      timestamp: Date.now()
    });
  });

  socket.on('leave_room', ({ roomId }) => {
    socket.leave(roomId);
    const room = rooms.get(roomId);
    if (room) {
      room.delete(socket.id);
      if (room.size === 0) rooms.delete(roomId);
    }
    socket.to(roomId).emit('peer_left', { socketId: socket.id });
  });

  // ── Disconnect ──
  socket.on('disconnect', () => {
    waitingQueue.delete(userInfo.userId);
    rooms.forEach((members, roomId) => {
      if (members.has(socket.id)) {
        members.delete(socket.id);
        socket.to(roomId).emit('peer_left', { socketId: socket.id });
        if (members.size === 0) rooms.delete(roomId);
      }
    });
    onlineUsers.delete(socket.id);
    io.emit('online_count', onlineUsers.size);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Language Connect server running on port ${PORT}`);
});
