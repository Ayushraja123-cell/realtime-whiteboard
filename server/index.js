require('dotenv').config();
const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const Board = require('./models/Board');
const User = require('./models/User');

// ─── Config from .env ────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_in_production';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/realtime-whiteboard';
const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// ─── Express Setup ───────────────────────────────────────────────────
const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));

// ─── Helpers ─────────────────────────────────────────────────────────
const validateRoomId = (roomId) => {
  return typeof roomId === 'string' && /^[a-zA-Z0-9_-]{1,20}$/.test(roomId);
};

// ─── Auth Middleware ─────────────────────────────────────────────────
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = { username: decoded.username };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// ─── Rate Limiting ───────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

// ─── In-Memory Fallback ─────────────────────────────────────────────
const inMemoryUsers = [];

// ─── Auth Routes ─────────────────────────────────────────────────────
app.post('/register', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    if (typeof username !== 'string' || username.length < 2 || username.length > 30) {
      return res.status(400).json({ error: 'Username must be 2-30 characters' });
    }

    if (mongoose.connection.readyState === 1) {
      const existingUser = await User.findOne({ username });
      if (existingUser) return res.status(400).json({ error: 'Registration failed. Please try a different username.' });

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = new User({ username, password: hashedPassword });
      await user.save();
    } else {
      const existingUser = inMemoryUsers.find(u => u.username === username);
      if (existingUser) return res.status(400).json({ error: 'Registration failed. Please try a different username.' });

      const hashedPassword = await bcrypt.hash(password, 10);
      inMemoryUsers.push({ username, password: hashedPassword });
    }

    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, username });
  } catch (err) {
    console.error('Register Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/login', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    let user;
    if (mongoose.connection.readyState === 1) {
      user = await User.findOne({ username });
    } else {
      user = inMemoryUsers.find(u => u.username === username);
    }

    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, username });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/reset-password', authLimiter, async (req, res) => {
  try {
    const { username, newPassword } = req.body;
    if (!username || !newPassword) return res.status(400).json({ error: 'Username and new password required' });
    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    if (mongoose.connection.readyState === 1) {
      const user = await User.findOne({ username });
      if (!user) return res.status(404).json({ error: 'User not found' });
      user.password = await bcrypt.hash(newPassword, 10);
      await user.save();
    } else {
      const user = inMemoryUsers.find(u => u.username === username);
      if (!user) return res.status(404).json({ error: 'User not found' });
      user.password = await bcrypt.hash(newPassword, 10);
    }

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('Reset Password Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── HTTP Server & Socket.IO ─────────────────────────────────────────
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true
  },
});

// ─── Socket Authentication Middleware ────────────────────────────────
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error('Authentication required'));
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.username = decoded.username;
    next();
  } catch (err) {
    return next(new Error('Invalid or expired token'));
  }
});

// ─── MongoDB Connection ──────────────────────────────────────────────
mongoose.connect(MONGO_URI).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.log('MongoDB connection error. Starting without persistence.');
});

// ─── In-Memory Data ──────────────────────────────────────────────────
const boardData = {}; // { roomId: [element1, element2] }
const roomUsers = {};
const saveTimers = {}; // debounced save timers per room
const roomLastActivity = {}; // track last activity per room

// ─── Debounced Save ──────────────────────────────────────────────────
const scheduleSave = (roomId) => {
  roomLastActivity[roomId] = Date.now();
  if (saveTimers[roomId]) clearTimeout(saveTimers[roomId]);
  saveTimers[roomId] = setTimeout(() => {
    saveBoardToDB(roomId);
    delete saveTimers[roomId];
  }, 2000);
};

const saveBoardToDB = async (roomId) => {
  if (boardData[roomId] && mongoose.connection.readyState === 1) {
    try {
      await Board.findOneAndUpdate(
        { roomId },
        { strokes: boardData[roomId] },
        { upsert: true }
      );
    } catch (e) {
      console.error('Error saving board to DB', e);
    }
  }
};

// ─── Memory Cleanup (every 5 minutes) ────────────────────────────────
setInterval(() => {
  const now = Date.now();
  const INACTIVE_THRESHOLD = 30 * 60 * 1000; // 30 minutes

  for (const roomId in boardData) {
    // Check if room has no connected users
    const hasUsers = roomUsers[roomId] && Object.keys(roomUsers[roomId]).length > 0;
    const lastActivity = roomLastActivity[roomId] || 0;

    if (!hasUsers && (now - lastActivity > INACTIVE_THRESHOLD)) {
      // Save to DB before evicting
      saveBoardToDB(roomId);
      delete boardData[roomId];
      delete roomLastActivity[roomId];
      if (saveTimers[roomId]) {
        clearTimeout(saveTimers[roomId]);
        delete saveTimers[roomId];
      }
      console.log(`Evicted inactive room: ${roomId}`);
    }
  }

  // Clean empty roomUsers entries
  for (const roomId in roomUsers) {
    if (Object.keys(roomUsers[roomId]).length === 0) {
      delete roomUsers[roomId];
    }
  }
}, 5 * 60 * 1000);

// ─── RoomId Validation Middleware ─────────────────────────────────────
const validateRoomIdParam = (req, res, next) => {
  if (!validateRoomId(req.params.roomId)) {
    return res.status(400).json({ error: 'Invalid room ID' });
  }
  next();
};

// ─── Board API Routes (all require auth) ─────────────────────────────
app.get('/board/:roomId', authMiddleware, validateRoomIdParam, async (req, res) => {
  const { roomId } = req.params;

  if (boardData[roomId]) {
    return res.json({ elements: boardData[roomId] });
  }

  if (mongoose.connection.readyState === 1) {
    try {
      const board = await Board.findOne({ roomId });
      if (board) {
        boardData[roomId] = board.strokes || [];
        roomLastActivity[roomId] = Date.now();
        return res.json({ elements: boardData[roomId] });
      }
    } catch (e) {
      console.error(e);
    }
  }

  res.json({ elements: [] });
});

app.post('/board/:roomId/version', authMiddleware, validateRoomIdParam, async (req, res) => {
  if (mongoose.connection.readyState !== 1) return res.status(500).json({ error: 'DB not connected' });
  const { roomId } = req.params;
  const { name, elements: reqElements } = req.body;
  const elements = reqElements || boardData[roomId] || [];

  try {
    const board = await Board.findOneAndUpdate(
      { roomId },
      { $push: { versions: { name: name || `V${Date.now()}`, elements } } },
      { new: true, upsert: true }
    );
    res.json({ success: true, versions: board.versions });
  } catch (err) {
    res.status(500).json({ error: 'Save failed' });
  }
});
app.post('/board/:roomId/init', authMiddleware, validateRoomIdParam, async (req, res) => {
  if (mongoose.connection.readyState !== 1) return res.status(500).json({ error: 'DB not connected' });
  const { roomId } = req.params;
  const { name, elements } = req.body;
  
  // Set in memory
  boardData[roomId] = elements || [];
  roomLastActivity[roomId] = Date.now();
  
  try {
    await Board.findOneAndUpdate(
      { roomId },
      { strokes: boardData[roomId], name: name || roomId, owner: req.user.username },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Initialization failed' });
  }
});

app.post('/board/:roomId/thumbnail', authMiddleware, validateRoomIdParam, async (req, res) => {
  if (mongoose.connection.readyState !== 1) return res.status(500).json({ error: 'DB not connected' });
  const { roomId } = req.params;
  const { thumbnail, owner } = req.body;

  if (typeof thumbnail !== 'string' || thumbnail.length > 500000) {
    return res.status(400).json({ error: 'Invalid thumbnail data' });
  }

  try {
    const updateObj = { thumbnail };
    if (owner) updateObj.owner = owner;

    await Board.findOneAndUpdate(
      { roomId },
      { $set: updateObj },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Save failed' });
  }
});

app.get('/user/:username/boards', authMiddleware, async (req, res) => {
  if (mongoose.connection.readyState !== 1) return res.json({ boards: [] });
  try {
    const boards = await Board.find({ owner: req.params.username }, 'roomId name thumbnail').sort({ _id: -1 });
    res.json({ boards });
  } catch (err) {
    res.status(500).json({ error: 'Fetch failed' });
  }
});

app.get('/board/:roomId/versions', authMiddleware, validateRoomIdParam, async (req, res) => {
  const { roomId } = req.params;
  if (mongoose.connection.readyState !== 1) return res.json({ versions: [] });
  try {
    const board = await Board.findOne({ roomId });
    const versions = (board?.versions || []).map(v => ({ _id: v._id, name: v.name, timestamp: v.timestamp }));
    res.json({ versions });
  } catch (err) {
    res.json({ versions: [] });
  }
});

app.post('/board/:roomId/restore/:versionId', authMiddleware, validateRoomIdParam, async (req, res) => {
  const { roomId } = req.params;
  if (mongoose.connection.readyState !== 1) return res.status(500).json({ error: 'DB not connected' });
  try {
    const board = await Board.findOne({ roomId });
    if (!board) return res.status(404).json({ error: 'Board not found' });
    const version = board.versions.id(req.params.versionId);
    if (!version) return res.status(404).json({ error: 'Version not found' });

    boardData[roomId] = version.elements;
    io.to(roomId).emit('board-update', version.elements);
    scheduleSave(roomId);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Restore failed' });
  }
});

// ─── Board Delete & Rename ───────────────────────────────────────────
app.delete('/board/:roomId', authMiddleware, validateRoomIdParam, async (req, res) => {
  const { roomId } = req.params;
  if (mongoose.connection.readyState !== 1) return res.status(500).json({ error: 'DB not connected' });
  try {
    const board = await Board.findOne({ roomId });
    if (!board) return res.status(404).json({ error: 'Board not found' });
    if (board.owner && board.owner !== req.user.username) {
      return res.status(403).json({ error: 'Not authorized to delete this board' });
    }
    await Board.deleteOne({ roomId });
    delete boardData[roomId];
    if (saveTimers[roomId]) {
      clearTimeout(saveTimers[roomId]);
      delete saveTimers[roomId];
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

app.patch('/board/:roomId', authMiddleware, validateRoomIdParam, async (req, res) => {
  const { roomId } = req.params;
  const { name } = req.body;
  if (mongoose.connection.readyState !== 1) return res.status(500).json({ error: 'DB not connected' });
  if (typeof name !== 'string' || name.length > 100) {
    return res.status(400).json({ error: 'Invalid name' });
  }
  try {
    const board = await Board.findOne({ roomId });
    if (!board) return res.status(404).json({ error: 'Board not found' });
    if (board.owner && board.owner !== req.user.username) {
      return res.status(403).json({ error: 'Not authorized to rename this board' });
    }
    await Board.findOneAndUpdate({ roomId }, { name });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Rename failed' });
  }
});

// ─── AI Proxy Endpoint ──────────────────────────────────────────────
app.post('/api/ai/generate', authMiddleware, async (req, res) => {
  const { apiKey, prompt } = req.body;
  if (!apiKey || !prompt) {
    return res.status(400).json({ error: 'API key and prompt are required' });
  }

  const systemPrompt = `You are an AI flowchart generator for a digital whiteboard. 
The user will give you a topic. You must generate a structured JSON array of drawing elements representing a flowchart.
The elements can be of three types:
1. {"type": "rect", "x1": number, "y1": number, "x2": number, "y2": number, "color": "#000000", "size": 3}
2. {"type": "text", "x1": number, "y1": number, "text": "string", "color": "#000000", "size": 6}
3. {"type": "line", "x1": number, "y1": number, "x2": number, "y2": number, "color": "#000000", "size": 3}

Rules:
- Generate a proper top-down or left-to-right flowchart.
- Base coordinates around x1: 2000, y1: 2000.
- Make rectangles by specifying x1, y1 (top-left) and x2, y2 (bottom-right). Make them roughly 200px wide and 80px high.
- Place text INSIDE the rectangles by setting the text's x1 and y1 to be roughly x1+20 and y1+20 of the rectangle it belongs to.
- Use actual line breaks or keep text short. Do NOT use literal '\\n' characters.
- Connect rectangles with lines exactly from edge to edge.
- Return ONLY a strictly valid JSON array. No markdown, no trailing commas.`;

  try {
    // Fetch available models
    const modelsRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const modelsData = await modelsRes.json();

    if (modelsData.error) {
      return res.status(400).json({ error: modelsData.error.message || 'Invalid API Key' });
    }

    const availableModels = modelsData.models || [];
    const validModels = availableModels.filter(m =>
      m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent') && m.name.includes('gemini')
    );

    if (validModels.length === 0) {
      return res.status(400).json({ error: 'No Gemini models found for this API key' });
    }

    // Sort: flash first, then pro, then others
    validModels.sort((a, b) => {
      if (a.name.includes('flash') && !b.name.includes('flash')) return -1;
      if (!a.name.includes('flash') && b.name.includes('flash')) return 1;
      if (a.name.includes('pro') && !b.name.includes('pro')) return -1;
      if (!a.name.includes('pro') && b.name.includes('pro')) return 1;
      return 0;
    });

    let data = null;
    let lastError = null;

    for (const selectedModel of validModels) {
      const modelName = selectedModel.name;
      const isNewerModel = modelName.includes('1.5') || modelName.includes('2.0');
      const requestBody = {
        contents: [{ parts: [{ text: `${systemPrompt}\n\nUser Topic: ${prompt}` }] }]
      };
      if (isNewerModel) {
        requestBody.generationConfig = { responseMimeType: 'application/json' };
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      data = await response.json();

      if (!data.error) {
        lastError = null;
        break;
      } else {
        lastError = data.error.message || 'API Error';
        if (response.status !== 503 && response.status !== 429 && response.status !== 500) break;
      }
    }

    if (lastError) {
      return res.status(500).json({ error: lastError });
    }

    if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content) {
      return res.status(500).json({
        error: data.promptFeedback?.blockReason
          ? `Blocked by safety filters: ${data.promptFeedback.blockReason}`
          : 'AI returned an empty response.'
      });
    }

    let textOutput = data.candidates[0].content.parts[0].text;
    textOutput = textOutput.replace(/```json/gi, '').replace(/```/g, '').trim();

    let elements = [];
    try {
      let parsed = JSON.parse(textOutput);
      if (!Array.isArray(parsed)) {
        const possibleArray = Object.values(parsed).find(val => Array.isArray(val));
        if (possibleArray) parsed = possibleArray;
        else parsed = [parsed];
      }
      elements = parsed.map(el => ({
        ...el,
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now()
      }));
    } catch (parseErr) {
      return res.status(500).json({ error: 'AI returned invalid JSON. Please try again.' });
    }

    res.json({ elements });
  } catch (err) {
    console.error('AI Proxy Error:', err);
    res.status(500).json({ error: 'Failed to generate flowchart' });
  }
});

// ─── Socket.IO Event Handlers ────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('User connected:', socket.id, `(${socket.username})`);

  socket.on('join-room', (roomId) => {
    if (!validateRoomId(roomId)) return;
    socket.join(roomId);
    if (!roomUsers[roomId]) roomUsers[roomId] = {};
    roomUsers[roomId][socket.id] = { username: socket.username, status: 'idle' };
    io.to(roomId).emit('users-update', Object.values(roomUsers[roomId]));
    roomLastActivity[roomId] = Date.now();
    console.log(`User ${socket.id} (${socket.username}) joined room ${roomId}`);
  });

  socket.on('status', (data) => {
    if (!data || !validateRoomId(data.roomId)) return;
    const { roomId, status } = data;
    if (roomUsers[roomId] && roomUsers[roomId][socket.id]) {
      roomUsers[roomId][socket.id].status = status;
      io.to(roomId).emit('users-update', Object.values(roomUsers[roomId]));
    }
  });

  socket.on('cursor', (data) => {
    if (!data || !validateRoomId(data.roomId)) return;
    socket.to(data.roomId).emit('cursor', { id: socket.id, x: data.x, y: data.y, username: socket.username });
  });

  socket.on('draw-preview', (data) => {
    if (!data || !validateRoomId(data.roomId)) return;
    socket.to(data.roomId).emit('draw-preview', { socketId: socket.id, element: data.element });
  });

  socket.on('draw-commit', (data) => {
    if (!data || !validateRoomId(data.roomId) || !data.element) return;
    const { roomId, element } = data;
    if (!boardData[roomId]) boardData[roomId] = [];

    element.socketId = socket.id;
    boardData[roomId].push(element);

    socket.to(roomId).emit('draw-commit', element);
    scheduleSave(roomId);
  });

  socket.on('element-update', (data) => {
    if (!data || !validateRoomId(data.roomId) || !data.element) return;
    const { roomId, element } = data;
    if (boardData[roomId]) {
      const index = boardData[roomId].findIndex(e => e.id === element.id);
      if (index !== -1) {
        boardData[roomId][index] = element;
        socket.to(roomId).emit('element-update', element);
        scheduleSave(roomId);
      }
    }
  });

  socket.on('element-delete', (data) => {
    if (!data || !validateRoomId(data.roomId) || !data.elementId) return;
    const { roomId, elementId } = data;
    if (boardData[roomId]) {
      boardData[roomId] = boardData[roomId].filter(e => e.id !== elementId);
      socket.to(roomId).emit('element-delete', elementId);
      scheduleSave(roomId);
    }
  });

  socket.on('undo', (roomId) => {
    if (!validateRoomId(roomId)) return;
    if (!boardData[roomId]) return;

    const elements = boardData[roomId];
    for (let i = elements.length - 1; i >= 0; i--) {
      if (elements[i].socketId === socket.id) {
        const removed = elements.splice(i, 1)[0];
        io.to(roomId).emit('board-update', elements);
        scheduleSave(roomId);
        socket.emit('undo-success', removed);
        break;
      }
    }
  });

  socket.on('clear', (roomId) => {
    if (!validateRoomId(roomId)) return;
    socket.to(roomId).emit('clear');
    boardData[roomId] = [];
    scheduleSave(roomId);
  });

  socket.on('clear-user', ({ roomId, username }) => {
    if (!validateRoomId(roomId) || !username) return;
    if (boardData[roomId]) {
      boardData[roomId] = boardData[roomId].filter(el => el.author !== username);
      socket.to(roomId).emit('board-update', boardData[roomId]);
      scheduleSave(roomId);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    for (const roomId in roomUsers) {
      if (roomUsers[roomId][socket.id]) {
        delete roomUsers[roomId][socket.id];
        io.to(roomId).emit('users-update', Object.values(roomUsers[roomId]));
      }
    }
  });
});

// ─── Production Static Serving ───────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDistPath));

  app.use((req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// ─── Graceful Shutdown ───────────────────────────────────────────────
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Saving all board data...`);

  // Clear all debounce timers
  for (const roomId in saveTimers) {
    clearTimeout(saveTimers[roomId]);
  }

  // Save all boards to DB
  const savePromises = Object.keys(boardData).map(roomId => saveBoardToDB(roomId));
  await Promise.all(savePromises);

  console.log('All boards saved. Closing connections...');
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }
  server.close(() => {
    console.log('Server shut down gracefully.');
    process.exit(0);
  });

  // Force exit after 5 seconds
  setTimeout(() => process.exit(1), 5000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ─── Start Server ────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
