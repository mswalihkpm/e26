const express = require('express');
const http = require('http');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const xlsx = require('xlsx');
const multer = require('multer');
const WebSocket = require('ws');
const compression = require('compression');
const supabaseProvider = require('./db/supabase');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'data', 'db.json');

// --- UPLOAD DIRECTORIES ---
const VIDEO_UPLOADS_DIR = path.join(__dirname, 'public', 'videos', 'uploads');
const ITEMS_UPLOADS_DIR = path.join(__dirname, 'public', 'uploads', 'items');
const GALLERY_UPLOADS_DIR = path.join(__dirname, 'public', 'uploads', 'gallery');
const NEWS_UPLOADS_DIR = path.join(__dirname, 'public', 'uploads', 'news');
const GENERAL_UPLOADS_DIR = path.join(__dirname, 'public', 'uploads', 'images');

[VIDEO_UPLOADS_DIR, ITEMS_UPLOADS_DIR, GALLERY_UPLOADS_DIR, NEWS_UPLOADS_DIR, GENERAL_UPLOADS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// --- MULTER STORAGE CONFIGURATIONS ---
const videoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync(VIDEO_UPLOADS_DIR)) fs.mkdirSync(VIDEO_UPLOADS_DIR, { recursive: true });
    cb(null, VIDEO_UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase() || '.mp4';
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 40);
    const uniqueName = `fiesta_${Date.now()}_${base}${ext}`;
    cb(null, uniqueName);
  }
});

const uploadVideo = multer({
  storage: videoStorage,
  limits: { fileSize: 1024 * 1024 * 1024 }, // 1GB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const isVideo = file.mimetype.startsWith('video/') || /\.(mp4|webm|ogg|mov|mkv|avi|m4v|3gp|wmv|quicktime|flv)$/i.test(ext);
    if (isVideo) {
      cb(null, true);
    } else {
      cb(new Error('Only video files (MP4, MOV, WebM, MKV, AVI, etc.) are allowed!'), false);
    }
  }
});

const galleryStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync(GALLERY_UPLOADS_DIR)) fs.mkdirSync(GALLERY_UPLOADS_DIR, { recursive: true });
    cb(null, GALLERY_UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 40);
    const uniqueName = `gal_${Date.now()}_${Math.floor(Math.random()*1000)}_${base}${ext}`;
    cb(null, uniqueName);
  }
});

const uploadGallery = multer({
  storage: galleryStorage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB per photo
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const isImage = file.mimetype.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg|bmp|avif|heic|heif)$/i.test(ext);
    if (isImage) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPG, PNG, WebP, GIF, SVG, etc.) are allowed!'), false);
    }
  }
});

const imageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync(GENERAL_UPLOADS_DIR)) fs.mkdirSync(GENERAL_UPLOADS_DIR, { recursive: true });
    cb(null, GENERAL_UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 40);
    const uniqueName = `img_${Date.now()}_${base}${ext}`;
    cb(null, uniqueName);
  }
});

const uploadImage = multer({
  storage: imageStorage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const isImage = file.mimetype.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg|bmp|avif|heic|heif)$/i.test(ext);
    if (isImage) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPG, PNG, WebP, etc.) are allowed!'), false);
    }
  }
});

const newsStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync(NEWS_UPLOADS_DIR)) fs.mkdirSync(NEWS_UPLOADS_DIR, { recursive: true });
    cb(null, NEWS_UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 40);
    const uniqueName = `news_${Date.now()}_${base}${ext}`;
    cb(null, uniqueName);
  }
});

const uploadNews = multer({
  storage: newsStorage,
  limits: { fileSize: 100 * 1024 * 1024 }
});

const itemStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync(ITEMS_UPLOADS_DIR)) fs.mkdirSync(ITEMS_UPLOADS_DIR, { recursive: true });
    cb(null, ITEMS_UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 40);
    const uniqueName = `item_${Date.now()}_${base}${ext}`;
    cb(null, uniqueName);
  }
});

const uploadItem = multer({
  storage: itemStorage,
  limits: { fileSize: 1024 * 1024 * 1024 }, // 1GB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const isImage = file.mimetype.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg|bmp|avif)$/i.test(ext);
    const isVideo = file.mimetype.startsWith('video/') || /\.(mp4|webm|ogg|mov|mkv|avi|m4v|3gp|wmv|quicktime|flv)$/i.test(ext);
    const isPdf = file.mimetype === 'application/pdf' || /\.pdf$/i.test(ext);

    if (isImage || isVideo || isPdf) {
      cb(null, true);
    } else {
      cb(new Error('Only Images, Videos, or PDF files are allowed!'), false);
    }
  }
});

// --- EXPRESS MIDDLEWARE WITH GZIP / BROTLI COMPRESSION & CACHING ---
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// High-speed static assets with caching headers
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    } else if (filePath.match(/\.(jpg|jpeg|png|webp|gif|svg|woff2|woff|ttf|mp4|css|js)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    }
  }
}));

// --- WEBSOCKET REAL-TIME BROADCAST ENGINE ---
const wss = new WebSocket.Server({ server });
const studioClients = new Set();
const cameraClients = new Map();
const viewerClients = new Set();

function broadcastStateUpdate(db) {
  if (!wss || !wss.clients) return;
  const payload = JSON.stringify({
    type: 'STATE_UPDATE',
    state: db,
    timestamp: Date.now()
  });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(payload);
      } catch (e) {
        console.warn('Failed to send WebSocket payload to client:', e.message);
      }
    }
  });
}

wss.on('connection', (ws, req) => {
  ws.isAlive = true;
  ws.role = 'generic';
  ws.on('pong', () => { ws.isAlive = true; });

  // Instantly send current database state
  const db = inMemoryDbCache || readDatabase();
  if (db) {
    try {
      ws.send(JSON.stringify({
        type: 'INITIAL_STATE',
        state: db,
        timestamp: Date.now()
      }));
    } catch (e) {}
  }

  ws.on('message', (message, isBinary) => {
    // Binary frame relay from studio -> viewers
    if (isBinary) {
      viewerClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          try { client.send(message, { binary: true }); } catch (e) {}
        }
      });
      return;
    }

    try {
      const data = JSON.parse(message.toString());
      if (data.type === 'PING') {
        ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
        return;
      }
      if (data.type === 'join') {
        ws.role = data.role || 'viewer';
        if (ws.role === 'studio') {
          studioClients.add(ws);
          ws.send(JSON.stringify({ type: 'joined', role: 'studio', success: true }));
        } else if (ws.role === 'camera') {
          ws.camId = data.camId || 'CAM-1';
          cameraClients.set(ws.camId, ws);
          ws.send(JSON.stringify({ type: 'joined', role: 'camera', camId: ws.camId, success: true }));
        } else {
          viewerClients.add(ws);
          ws.send(JSON.stringify({ type: 'joined', role: 'viewer', success: true }));
        }
        return;
      }
      if (data.type === 'frame_relay') {
        const frameMsg = JSON.stringify({
          type: 'camera_frame',
          camId: ws.camId || data.camId || 'CAM-1',
          frame: data.frame,
          fps: data.fps || 30
        });
        studioClients.forEach(studio => {
          if (studio.readyState === WebSocket.OPEN) {
            try { studio.send(frameMsg); } catch (e) {}
          }
        });
        return;
      }
      if (data.type === 'tally_update') {
        const targetCam = cameraClients.get(data.camId);
        if (targetCam && targetCam.readyState === WebSocket.OPEN) {
          try {
            targetCam.send(JSON.stringify({ type: 'tally', status: data.status, camId: data.camId }));
          } catch (e) {}
        }
        return;
      }
      if (data.type === 'program_broadcast_frame') {
        const bcastMsg = JSON.stringify({
          type: 'broadcast_frame',
          frame: data.frame,
          timestamp: Date.now()
        });
        viewerClients.forEach(viewer => {
          if (viewer.readyState === WebSocket.OPEN) {
            try { viewer.send(bcastMsg); } catch (e) {}
          }
        });
        return;
      }
      // Broadcast live studio/cam relays to all other connected peers
      if (data.type === 'STUDIO_RELAY' || data.type === 'CAMERA_FRAME' || data.type === 'STREAM_CONTROL') {
        wss.clients.forEach(client => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            try { client.send(message.toString()); } catch (e) {}
          }
        });
      }
    } catch (e) {}
  });

  ws.on('close', () => {
    if (ws.role === 'studio') studioClients.delete(ws);
    if (ws.role === 'camera' && ws.camId) cameraClients.delete(ws.camId);
    if (ws.role === 'viewer') viewerClients.delete(ws);
  });

  ws.on('error', (err) => {
    console.warn('WebSocket client error:', err.message);
  });
});

const heartbeatInterval = setInterval(() => {
  if (!wss || !wss.clients) return;
  wss.clients.forEach(ws => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    try { ws.ping(); } catch (e) {}
  });
}, 25000);

wss.on('close', () => {
  clearInterval(heartbeatInterval);
});

// --- DATABASE ENGINE (IN-MEMORY CACHE-FIRST & ASYNC PERSISTENCE) ---
let inMemoryDbCache = null;
let cachedStateJson = null;
let cachedStateEtag = null;
let isWritingToDisk = false;
let pendingDiskState = null;

function updateStateCache(db) {
  inMemoryDbCache = db;
  cachedStateJson = JSON.stringify(db);
  cachedStateEtag = '"' + crypto.createHash('md5').update(cachedStateJson).digest('hex') + '"';
}

function readDatabase(forceReload = false) {
  if (inMemoryDbCache && !forceReload) {
    return inMemoryDbCache;
  }
  try {
    if (!fs.existsSync(DB_PATH)) {
      throw new Error("DB file does not exist");
    }
    const data = fs.readFileSync(DB_PATH, 'utf8');
    const db = JSON.parse(data);
    recalculateTeamPoints(db);
    updateStateCache(db);
    return db;
  } catch (err) {
    console.error("Error reading DB:", err);
    return inMemoryDbCache || null;
  }
}

function persistToDiskAsync(db) {
  pendingDiskState = db;
  if (isWritingToDisk) return;
  isWritingToDisk = true;

  setImmediate(() => {
    const stateToWrite = pendingDiskState;
    pendingDiskState = null;
    const tempPath = DB_PATH + '.tmp';
    const jsonStr = JSON.stringify(stateToWrite, null, 2);

    fs.writeFile(tempPath, jsonStr, 'utf8', (err) => {
      if (err) {
        console.error("Async DB write error:", err.message);
        isWritingToDisk = false;
        return;
      }
      fs.rename(tempPath, DB_PATH, (renameErr) => {
        isWritingToDisk = false;
        if (renameErr) {
          console.error("Async DB rename error:", renameErr.message);
        }
        if (pendingDiskState) {
          persistToDiskAsync(pendingDiskState);
        }
      });
    });
  });
}

function saveDatabase(db, changedTable = null) {
  try {
    recalculateTeamPoints(db);
    updateStateCache(db);

    // Asynchronous non-blocking atomic disk persistence
    persistToDiskAsync(db);
    
    // Real-time broadcast to all connected devices across the world
    broadcastStateUpdate(db);

    // Debounced asynchronous background sync to Supabase Cloud Database
    if (supabaseProvider && supabaseProvider.isConfigured()) {
      supabaseProvider.queueTableSync(changedTable, db, 1200);
    }

    return true;
  } catch (err) {
    console.error("Error saving DB:", err);
    return false;
  }
}

// Dynamic Recalculation Engine Supporting Multiple 1st, 2nd, 3rd, and Grade Positions
function recalculateTeamPoints(db) {
  if (!db || !db.teams) return;

  const teamMap = {};
  db.teams.forEach(team => {
    teamMap[team.name.toLowerCase()] = {
      ...team,
      points: 0,
      firstCount: 0,
      secondCount: 0,
      thirdCount: 0,
      categoryPoints: {
        'A-Zone': 0,
        'B-Zone': 0,
        'C-Zone': 0,
        'General': 0
      }
    };
  });

  const cutoff = (db.settings && typeof db.settings.maxVisibleResultNumber !== 'undefined' && db.settings.maxVisibleResultNumber !== null && !isNaN(db.settings.maxVisibleResultNumber))
    ? Number(db.settings.maxVisibleResultNumber)
    : null;

  if (Array.isArray(db.results)) {
    db.results.forEach(res => {
      if (cutoff !== null) {
        const rNum = (typeof res.resultNumber !== 'undefined' && res.resultNumber !== null && !isNaN(res.resultNumber))
          ? Number(res.resultNumber)
          : 1;
        if (rNum > cutoff) return;
      }

      const cat = res.category || 'A-Zone';

      if (Array.isArray(res.winners)) {
        res.winners.forEach(w => {
          if (!w || !w.team) return;
          const tKey = w.team.toLowerCase();
          if (!teamMap[tKey]) return;

          const pts = Number(w.points) || 0;
          w.points = pts;

          teamMap[tKey].points += pts;
          teamMap[tKey].categoryPoints[cat] = (teamMap[tKey].categoryPoints[cat] || 0) + pts;

          const pos = String(w.position || '').toLowerCase();
          if (pos.includes('1')) teamMap[tKey].firstCount += 1;
          else if (pos.includes('2')) teamMap[tKey].secondCount += 1;
          else if (pos.includes('3')) teamMap[tKey].thirdCount += 1;
        });
      } else {
        ['first', 'second', 'third'].forEach((k, idx) => {
          if (res[k] && res[k].team) {
            const tKey = res[k].team.toLowerCase();
            if (teamMap[tKey]) {
              const pts = Number(res[k].totalPoints) || Number(res[k].points) || 0;
              teamMap[tKey].points += pts;
              teamMap[tKey].categoryPoints[cat] = (teamMap[tKey].categoryPoints[cat] || 0) + pts;
              if (idx === 0) teamMap[tKey].firstCount += 1;
              if (idx === 1) teamMap[tKey].secondCount += 1;
              if (idx === 2) teamMap[tKey].thirdCount += 1;
            }
          }
        });
        if (Array.isArray(res.additionalGrades)) {
          res.additionalGrades.forEach(ag => {
            if (ag.team) {
              const tKey = ag.team.toLowerCase();
              if (teamMap[tKey]) {
                const pts = Number(ag.totalPoints) || Number(ag.points) || Number(ag.gradePoints) || 0;
                teamMap[tKey].points += pts;
                teamMap[tKey].categoryPoints[cat] = (teamMap[tKey].categoryPoints[cat] || 0) + pts;
              }
            }
          });
        }
      }
    });
  }

  const updatedTeams = Object.values(teamMap);
  updatedTeams.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.firstCount !== a.firstCount) return b.firstCount - a.firstCount;
    return b.secondCount - a.secondCount;
  });

  updatedTeams.forEach((team, index) => {
    team.rank = index + 1;
  });

  db.teams = updatedTeams;
}

// Initial recalculation & cache
const initialDb = readDatabase();
if (initialDb) saveDatabase(initialDb);

// Stream status API
app.get('/api/stream/status', (req, res) => {
  const db = readDatabase();
  res.json({
    success: true,
    liveStream: db?.settings?.liveStream || {},
    activeCameras: Array.from(cameraClients.keys()).map(id => ({ id, name: id })),
    studioConnected: studioClients.size > 0,
    viewersCount: viewerClients.size
  });
});

// --- AUTH ROUTE (ADMIN & CAMERA CLEARANCES) ---
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const userTrimmed = String(username || '').trim().toLowerCase();
  const passTrimmed = String(password || '').trim();
  const db = readDatabase();

  const adminUser = (db.settings.adminUsername || "e26@gmail.com").toLowerCase();
  const adminPass = db.settings.adminPasswordHash || "e26msoe";
  const cameraUser = (db.settings.cameraUsername || "e26camera").toLowerCase();
  const cameraPass = db.settings.cameraPasswordHash || "e26cam";

  if (userTrimmed === adminUser && passTrimmed === adminPass) {
    const token = 'token_admin_' + Buffer.from(`${username}:${Date.now()}`).toString('base64');
    return res.json({
      success: true,
      token,
      role: 'ADMIN',
      user: { username: adminUser, role: 'ADMIN', title: 'Administrator' },
      message: 'Admin clearance verified'
    });
  }

  if (userTrimmed === cameraUser && passTrimmed === cameraPass) {
    const token = 'token_camera_' + Buffer.from(`${username}:${Date.now()}`).toString('base64');
    return res.json({
      success: true,
      token,
      role: 'CAMERA',
      user: { username: cameraUser, role: 'CAMERA', title: 'Camera Controller' },
      message: 'Camera Controller clearance verified'
    });
  }

  return res.status(401).json({
    success: false,
    message: 'Invalid credentials. Please verify your username/email and password.'
  });
});

// --- FULL STATE (WITH ZERO-LATENCY ETAG CACHING & 304 NOT MODIFIED) ---
app.get('/api/state', (req, res) => {
  if (!inMemoryDbCache || !cachedStateJson || !cachedStateEtag) {
    const db = readDatabase();
    if (!db) return res.status(500).json({ error: 'Failed to read database state' });
  }

  // Check conditional HTTP request (If-None-Match)
  const clientEtag = req.headers['if-none-match'];
  if (clientEtag && clientEtag === cachedStateEtag) {
    res.setHeader('ETag', cachedStateEtag);
    res.setHeader('Cache-Control', 'private, no-cache');
    return res.status(304).end();
  }

  res.setHeader('ETag', cachedStateEtag);
  res.setHeader('Cache-Control', 'private, no-cache');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.send(cachedStateJson);
});

// --- SETTINGS ENDPOINTS ---
function handleSettingsUpdate(req, res) {
  const db = readDatabase();
  if (!db.settings) db.settings = {};

  if (typeof req.body.showTeamScores !== 'undefined') {
    db.settings.showTeamScores = Boolean(req.body.showTeamScores);
  }
  if (typeof req.body.maxVisibleResultNumber !== 'undefined') {
    const val = req.body.maxVisibleResultNumber;
    db.settings.maxVisibleResultNumber = (val === null || val === '' || isNaN(val)) ? null : Number(val);
  }
  if (typeof req.body.standingsSlideInterval !== 'undefined') {
    const val = req.body.standingsSlideInterval;
    db.settings.standingsSlideInterval = (val === null || val === '' || isNaN(val)) ? 3 : Math.max(0, Number(val));
  }

  ['eventName', 'institution', 'theme', 'dates', 'location', 'footerText'].forEach(key => {
    if (typeof req.body[key] !== 'undefined') {
      db.settings[key] = req.body[key];
    }
  });

  saveDatabase(db);
  res.json({ success: true, settings: db.settings, state: db });
}

app.put('/api/settings', handleSettingsUpdate);
app.post('/api/settings', handleSettingsUpdate);
app.post('/api/settings/visibility', handleSettingsUpdate);

// --- RESULTS ENDPOINTS ---
let lastResultPost = { time: 0, key: '', result: null };

app.post('/api/results', (req, res) => {
  const db = readDatabase();
  if (!db.results) db.results = [];

  const postKey = `${req.body.programId || req.body.programName || ''}_${req.body.category || ''}_${JSON.stringify(req.body.winners || [])}`;
  const now = Date.now();
  if (now - lastResultPost.time < 3000 && lastResultPost.key === postKey && lastResultPost.result) {
    return res.status(200).json({ success: true, result: lastResultPost.result, state: db, deduplicated: true });
  }

  const maxNum = db.results.reduce((max, r) => Math.max(max, Number(r.resultNumber) || 0), 0);
  const resultNum = req.body.resultNumber ? Number(req.body.resultNumber) : maxNum + 1;

  const newResult = {
    id: 'res-' + Date.now(),
    resultNumber: resultNum,
    isPublic: typeof req.body.isPublic !== 'undefined' ? Boolean(req.body.isPublic) : true,
    publishedAt: new Date().toISOString(),
    winners: [],
    ...req.body
  };
  newResult.resultNumber = resultNum;

  db.results.unshift(newResult);

  if (newResult.programId && Array.isArray(db.programs)) {
    const p = db.programs.find(prog => prog.id === newResult.programId || prog.code === newResult.programCode);
    if (p) p.status = 'Completed';
  }

  saveDatabase(db);
  lastResultPost = { time: now, key: postKey, result: newResult };
  res.status(201).json({ success: true, result: newResult, state: db });
});

app.post('/api/results/renumber', (req, res) => {
  const db = readDatabase();
  if (!Array.isArray(db.results)) db.results = [];

  db.results.forEach((r, idx) => {
    r.resultNumber = idx + 1;
  });

  saveDatabase(db);
  res.json({ success: true, results: db.results, state: db });
});

app.post('/api/results/:id/toggle-visibility', (req, res) => {
  const { id } = req.params;
  const db = readDatabase();
  const index = db.results.findIndex(r => r.id === id);

  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Result not found' });
  }

  const currentStatus = db.results[index].isPublic !== false;
  const newStatus = typeof req.body.isPublic !== 'undefined' ? Boolean(req.body.isPublic) : !currentStatus;
  
  db.results[index].isPublic = newStatus;
  db.results[index].updatedAt = new Date().toISOString();

  saveDatabase(db);
  res.json({
    success: true,
    isPublic: newStatus,
    result: db.results[index],
    state: db,
    message: newStatus ? `Result #${db.results[index].resultNumber} is now Shown (Public)` : `Result #${db.results[index].resultNumber} is now Hidden`
  });
});

app.put('/api/results/:id', (req, res) => {
  const { id } = req.params;
  const db = readDatabase();
  const index = db.results.findIndex(r => r.id === id);

  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Result not found' });
  }

  const updatedResult = {
    ...db.results[index],
    ...req.body,
    updatedAt: new Date().toISOString()
  };

  if (req.body.resultNumber) {
    updatedResult.resultNumber = Number(req.body.resultNumber);
  }
  if (typeof req.body.isPublic !== 'undefined') {
    updatedResult.isPublic = Boolean(req.body.isPublic);
  }

  db.results[index] = updatedResult;

  saveDatabase(db);
  res.json({ success: true, result: db.results[index], state: db });
});

app.delete('/api/results/:id', (req, res) => {
  const { id } = req.params;
  const db = readDatabase();
  const index = db.results.findIndex(r => r.id === id);

  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Result not found' });
  }

  const deleted = db.results.splice(index, 1)[0];
  saveDatabase(db);
  res.json({ success: true, deleted, state: db });
});

app.post('/api/results/bulk-delete', (req, res) => {
  const { ids, all, category } = req.body;
  const db = readDatabase();
  let deletedCount = 0;
  if (all) {
    deletedCount = db.results.length;
    db.results = [];
  } else if (category && category !== 'ALL') {
    const before = db.results.length;
    db.results = db.results.filter(r => r.category !== category);
    deletedCount = before - db.results.length;
  } else if (Array.isArray(ids) && ids.length > 0) {
    const idSet = new Set(ids);
    const before = db.results.length;
    db.results = db.results.filter(r => !idSet.has(r.id));
    deletedCount = before - db.results.length;
  }
  saveDatabase(db);
  res.json({ success: true, count: deletedCount, total: db.results.length, state: db });
});

// --- PARTICIPANTS & BULK EXCEL ---
app.post('/api/participants', (req, res) => {
  const db = readDatabase();
  const participant = {
    id: 'p-' + Date.now(),
    ...req.body
  };
  if (!db.participants) db.participants = [];
  db.participants.push(participant);
  saveDatabase(db);
  res.status(201).json({ success: true, participant, state: db });
});

app.post('/api/participants/bulk', (req, res) => {
  const { participants, overwrite } = req.body;
  if (!Array.isArray(participants)) {
    return res.status(400).json({ success: false, message: 'Invalid participants list' });
  }

  const db = readDatabase();
  if (overwrite) {
    db.participants = [];
  }
  if (!db.participants) db.participants = [];

  let count = 0;
  participants.forEach(p => {
    const name = String(p.name || p.Name || p.StudentName || '').trim();
    if (name) {
      db.participants.push({
        id: 'p-' + Date.now() + '-' + Math.floor(Math.random() * 10000),
        name: name,
        team: p.team || p.Team || 'Bukhara',
        category: p.category || p.Category || 'A-Zone',
        class: p.class || p.Class || ''
      });
      count++;
    }
  });

  saveDatabase(db);
  res.status(201).json({ success: true, count, total: db.participants.length, state: db });
});

app.delete('/api/participants/:id', (req, res) => {
  const { id } = req.params;
  const db = readDatabase();
  db.participants = db.participants.filter(p => p.id !== id);
  saveDatabase(db);
  res.json({ success: true, state: db });
});

app.post('/api/participants/bulk-delete', (req, res) => {
  const { ids, all } = req.body;
  const db = readDatabase();
  let deletedCount = 0;
  if (all) {
    deletedCount = db.participants.length;
    db.participants = [];
  } else if (Array.isArray(ids) && ids.length > 0) {
    const idSet = new Set(ids);
    const before = db.participants.length;
    db.participants = db.participants.filter(p => !idSet.has(p.id));
    deletedCount = before - db.participants.length;
  }
  saveDatabase(db);
  res.json({ success: true, count: deletedCount, total: db.participants.length, state: db });
});

// Excel Template
app.get('/api/template/participants', (req, res) => {
  const sampleData = [
    { Name: 'Zayan Rayan', Team: 'Bukhara', Category: 'A-Zone', Class: 'Class 8-A' },
    { Name: 'Aman Farhan', Team: 'Undulus', Category: 'A-Zone', Class: 'Class 8-B' },
    { Name: 'Ihsan Thameem', Team: 'Samarkhand', Category: 'B-Zone', Class: 'Class 10-A' },
    { Name: 'Danish Rafeeq', Team: 'Qurthuba', Category: 'B-Zone', Class: 'Class 10-C' },
    { Name: 'Bilal Ahsan', Team: 'Bukhara', Category: 'C-Zone', Class: 'Class 12-A' },
    { Name: 'Rayan Kabeer', Team: 'Undulus', Category: 'C-Zone', Class: 'Class 12-B' },
    { Name: 'Salman Faris', Team: 'Samarkhand', Category: 'C-Zone', Class: 'Class 11-A' },
    { Name: 'Nawaf Basil', Team: 'Qurthuba', Category: 'C-Zone', Class: 'Class 11-C' }
  ];

  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(sampleData);
  xlsx.utils.book_append_sheet(wb, ws, "Participants_Template");

  const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', 'attachment; filename="Excellentia_Participants_Template.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
});

// --- LIVE STREAM & VIDEOS ---
function updateStreamSettings(req, res) {
  const db = readDatabase();
  db.settings.liveStream = {
    ...db.settings.liveStream,
    ...req.body
  };
  saveDatabase(db);
  res.json({ success: true, liveStream: db.settings.liveStream, state: db });
}

app.put('/api/livestream', updateStreamSettings);
app.post('/api/livestream', updateStreamSettings);
app.post('/api/settings/stream', updateStreamSettings);

// Direct Video File Upload from PC
app.post('/api/videos/upload', (req, res) => {
  const uploadHandler = (req, res) => {
    uploadVideo.single('videoFile')(req, res, (err) => {
      if (err) {
        console.error('Video upload error:', err);
        return res.status(400).json({ success: false, message: err.message || 'Video upload failed' });
      }
      if (!req.file) {
        // Try fallback 'file'
        return uploadVideo.single('file')(req, res, (err2) => {
          if (err2 || !req.file) {
            return res.status(400).json({ success: false, message: 'No video file provided' });
          }
          const videoUrl = `/videos/uploads/${req.file.filename}`;
          return res.status(201).json({
            success: true,
            url: videoUrl,
            filename: req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size
          });
        });
      }
      const videoUrl = `/videos/uploads/${req.file.filename}`;
      res.status(201).json({
        success: true,
        url: videoUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size
      });
    });
  };
  uploadHandler(req, res);
});

let lastVideoPost = { time: 0, key: '', video: null };

app.post('/api/videos', (req, res) => {
  const db = readDatabase();
  const postKey = `${req.body.title || ''}_${req.body.url || ''}`;
  const now = Date.now();
  if (now - lastVideoPost.time < 3000 && lastVideoPost.key === postKey && lastVideoPost.video) {
    return res.status(200).json({ success: true, video: lastVideoPost.video, state: db, deduplicated: true });
  }

  const video = {
    id: 'vid-' + Date.now(),
    date: new Date().toISOString().split('T')[0],
    ...req.body
  };
  if (!db.videos) db.videos = [];
  db.videos.unshift(video);
  saveDatabase(db);
  lastVideoPost = { time: now, key: postKey, video: video };
  res.status(201).json({ success: true, video, state: db });
});

app.delete('/api/videos/:id', (req, res) => {
  const { id } = req.params;
  const db = readDatabase();
  const video = (db.videos || []).find(v => v.id === id);
  if (video && video.url && video.url.startsWith('/videos/uploads/')) {
    const filename = path.basename(video.url);
    const filePath = path.join(VIDEO_UPLOADS_DIR, filename);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.warn('Failed to delete uploaded video file:', err.message);
      }
    }
  }
  db.videos = (db.videos || []).filter(v => v.id !== id);
  saveDatabase(db);
  res.json({ success: true, state: db });
});

// --- PROGRAMS ---
app.post('/api/programs', (req, res) => {
  const db = readDatabase();
  const newProgram = {
    id: 'prog-' + Date.now(),
    status: 'Upcoming',
    ...req.body
  };
  delete newProgram.code;
  if (!db.programs) db.programs = [];
  db.programs.push(newProgram);
  saveDatabase(db);
  res.status(201).json({ success: true, program: newProgram, state: db });
});

app.post('/api/programs/bulk', (req, res) => {
  const { programs, overwrite } = req.body;
  if (!Array.isArray(programs)) {
    return res.status(400).json({ success: false, message: 'Invalid programs array' });
  }

  const db = readDatabase();
  if (overwrite) db.programs = [];
  if (!db.programs) db.programs = [];

  let count = 0;
  programs.forEach(p => {
    const name = String(p.name || p.ProgramName || p['Program Name'] || p.title || '').trim();
    const rawCat = String(p.category || p.Category || p.zone || 'A-Zone').trim();
    let category = 'A-Zone';
    if (rawCat.toLowerCase().includes('gen')) category = 'General';
    else if (rawCat.includes('B')) category = 'B-Zone';
    else if (rawCat.includes('C')) category = 'C-Zone';

    if (name) {
      db.programs.push({
        id: 'prog-' + Date.now() + '-' + Math.floor(Math.random() * 10000),
        name: name,
        category: category,
        status: p.status || 'Upcoming'
      });
      count++;
    }
  });

  saveDatabase(db);
  res.status(201).json({ success: true, count, total: db.programs.length, state: db });
});

app.get('/api/template/programs', (req, res) => {
  const sampleData = [
    { 'Program Name': 'English Elocution', 'Category': 'A-Zone' },
    { 'Program Name': 'Malayalam Recitation', 'Category': 'A-Zone' },
    { 'Program Name': 'Sufi Song Solo', 'Category': 'B-Zone' },
    { 'Program Name': 'Arabic Calligraphy', 'Category': 'B-Zone' },
    { 'Program Name': 'Qawwali Group', 'Category': 'C-Zone' },
    { 'Program Name': 'Theatrical Stage Drama', 'Category': 'General' }
  ];

  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(sampleData);
  xlsx.utils.book_append_sheet(wb, ws, "Programs_Template");

  const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', 'attachment; filename="Excellentia_Programs_Template.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
});

app.delete('/api/programs/:id', (req, res) => {
  const { id } = req.params;
  const db = readDatabase();
  db.programs = db.programs.filter(p => p.id !== id);
  saveDatabase(db);
  res.json({ success: true, state: db });
});

app.post('/api/programs/bulk-delete', (req, res) => {
  const { ids, all, category } = req.body;
  const db = readDatabase();
  let deletedCount = 0;
  if (all) {
    deletedCount = db.programs.length;
    db.programs = [];
  } else if (category && category !== 'ALL') {
    const before = db.programs.length;
    db.programs = db.programs.filter(p => p.category !== category);
    deletedCount = before - db.programs.length;
  } else if (Array.isArray(ids) && ids.length > 0) {
    const idSet = new Set(ids);
    const before = db.programs.length;
    db.programs = db.programs.filter(r => !idSet.has(r.id));
    deletedCount = before - db.programs.length;
  }
  saveDatabase(db);
  res.json({ success: true, count: deletedCount, total: db.programs.length, state: db });
});

// --- PUBLIC DISCREPANCY REPORTS & REQUESTS ---
const handleReportSubmission = (req, res) => {
  const db = readDatabase();
  const notif = {
    id: 'notif-' + Date.now(),
    type: 'result_report',
    title: `Discrepancy Report: ${req.body.programName || 'Result Discrepancy'}`,
    timestamp: new Date().toISOString(),
    status: 'pending',
    ...req.body
  };
  delete notif.phone;
  delete notif.contact;

  if (!db.notifications) db.notifications = [];
  db.notifications.unshift(notif);
  saveDatabase(db);
  res.status(201).json({ success: true, message: 'Your discrepancy report has been submitted to the fiesta audit committee.', notification: notif });
};

app.post('/api/reports', handleReportSubmission);
app.post('/api/requests', handleReportSubmission);

app.post('/api/notifications/:id/action', (req, res) => {
  const { id } = req.params;
  const { action } = req.body;
  const db = readDatabase();
  const notif = db.notifications.find(n => n.id === id);

  if (!notif) return res.status(404).json({ error: 'Notification not found' });

  if (action === 'delete') {
    db.notifications = db.notifications.filter(n => n.id !== id);
  } else if (action === 'ignore') {
    notif.status = 'ignored';
  } else if (action === 'resolve') {
    notif.status = 'resolved';
  }

  saveDatabase(db);
  res.json({ success: true, notification: notif, state: db });
});

// --- GENERIC IMAGE UPLOAD ENDPOINT (For news, thumbnails, posters) ---
app.post('/api/upload/image', (req, res) => {
  uploadImage.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message || 'Image upload failed' });
    }
    const file = req.file;
    if (!file) {
      // Try single 'file' field
      return uploadImage.single('file')(req, res, (err2) => {
        if (err2 || !req.file) {
          return res.status(400).json({ success: false, message: 'No image file uploaded' });
        }
        const fileUrl = `/uploads/images/${req.file.filename}`;
        return res.status(201).json({
          success: true,
          url: fileUrl,
          filename: req.file.filename,
          originalName: req.file.originalname,
          size: req.file.size
        });
      });
    }
    const fileUrl = `/uploads/images/${file.filename}`;
    res.status(201).json({
      success: true,
      url: fileUrl,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size
    });
  });
});

// --- GALLERY MANAGEMENT (Single & Bulk PC File Upload) ---
let lastGalleryPost = { time: 0, key: '', items: [] };

// 1. Direct PC Photo Upload (Multipart Form-Data for Single or Multiple Images)
app.post('/api/gallery/upload', (req, res) => {
  uploadGallery.array('images', 100)(req, res, (err) => {
    if (err) {
      console.error('Gallery file upload error:', err);
      return res.status(400).json({ success: false, message: err.message || 'Gallery upload failed' });
    }
    let files = req.files || [];
    if (files.length === 0 && req.file) files = [req.file];

    if (files.length === 0) {
      return res.status(400).json({ success: false, message: 'No photo files provided' });
    }

    const defaultCat = req.body.category || req.body.defaultCategory || 'A-Zone';
    const db = readDatabase();
    if (!db.gallery) db.gallery = [];

    const added = [];
    files.forEach((file, idx) => {
      const fileUrl = `/uploads/gallery/${file.filename}`;
      const title = (file.originalname || 'Fiesta Capture').replace(/\.[^/.]+$/, "").replace(/[-_]/g, ' ');
      const item = {
        id: 'gal-' + Date.now() + '-' + idx,
        date: new Date().toISOString().split('T')[0],
        title: title,
        category: defaultCat,
        caption: '',
        image: fileUrl,
        filename: file.filename,
        originalName: file.originalname,
        size: file.size
      };
      db.gallery.unshift(item);
      added.push(item);
    });

    saveDatabase(db);
    res.status(201).json({
      success: true,
      count: added.length,
      total: db.gallery.length,
      items: added,
      state: db
    });
  });
});

// 2. Create single gallery photo with URL or Base64 fallback
app.post('/api/gallery', (req, res) => {
  const db = readDatabase();
  const postKey = `${req.body.title || ''}_${(req.body.image || '').substring(0, 50)}`;
  const now = Date.now();
  if (now - lastGalleryPost.time < 3000 && lastGalleryPost.key === postKey && lastGalleryPost.items.length > 0) {
    return res.status(200).json({ success: true, gallery: lastGalleryPost.items[0], state: db, deduplicated: true });
  }

  const item = {
    id: 'gal-' + Date.now(),
    date: new Date().toISOString().split('T')[0],
    title: req.body.title || 'Fiesta Capture',
    category: req.body.category || 'A-Zone',
    caption: req.body.caption || '',
    image: req.body.image
  };
  if (!db.gallery) db.gallery = [];
  db.gallery.unshift(item);
  saveDatabase(db);
  lastGalleryPost = { time: now, key: postKey, items: [item] };
  res.status(201).json({ success: true, gallery: item, state: db });
});

// 3. Bulk Gallery Creation (JSON Array)
app.post('/api/gallery/bulk', (req, res) => {
  const { images, defaultCategory } = req.body;
  if (!Array.isArray(images) || images.length === 0) {
    return res.status(400).json({ success: false, message: 'No images provided' });
  }

  const bulkKey = `bulk_${images.length}_${(images[0]?.title || '')}_${String(images[0]?.image || '').substring(0, 30)}`;
  const now = Date.now();
  const db = readDatabase();
  if (now - lastGalleryPost.time < 3000 && lastGalleryPost.key === bulkKey) {
    return res.status(200).json({ success: true, count: lastGalleryPost.items.length, total: db.gallery.length, state: db, deduplicated: true });
  }

  if (!db.gallery) db.gallery = [];

  const added = [];
  images.forEach((imgData, idx) => {
    const item = {
      id: 'gal-' + Date.now() + '-' + idx,
      date: new Date().toISOString().split('T')[0],
      title: imgData.title || `Fiesta Moment #${db.gallery.length + 1}`,
      category: imgData.category || defaultCategory || 'A-Zone',
      caption: imgData.caption || '',
      image: typeof imgData === 'string' ? imgData : (imgData.image || imgData.url)
    };
    if (item.image) {
      db.gallery.unshift(item);
      added.push(item);
    }
  });

  saveDatabase(db);
  lastGalleryPost = { time: now, key: bulkKey, items: added };
  res.status(201).json({ success: true, count: added.length, total: db.gallery.length, state: db });
});

app.delete('/api/gallery/:id', (req, res) => {
  const { id } = req.params;
  const db = readDatabase();
  const item = (db.gallery || []).find(g => g.id === id);
  if (item && item.image && item.image.startsWith('/uploads/gallery/')) {
    const filename = path.basename(item.image);
    const filePath = path.join(GALLERY_UPLOADS_DIR, filename);
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (e) {}
    }
  }
  db.gallery = db.gallery.filter(g => g.id !== id);
  saveDatabase(db);
  res.json({ success: true, state: db });
});

app.post('/api/gallery/bulk-delete', (req, res) => {
  const { ids, all } = req.body;
  const db = readDatabase();
  if (all) {
    (db.gallery || []).forEach(item => {
      if (item.image && item.image.startsWith('/uploads/gallery/')) {
        const filename = path.basename(item.image);
        const filePath = path.join(GALLERY_UPLOADS_DIR, filename);
        if (fs.existsSync(filePath)) {
          try { fs.unlinkSync(filePath); } catch (e) {}
        }
      }
    });
    db.gallery = [];
  } else if (Array.isArray(ids)) {
    const idSet = new Set(ids);
    (db.gallery || []).forEach(item => {
      if (idSet.has(item.id) && item.image && item.image.startsWith('/uploads/gallery/')) {
        const filename = path.basename(item.image);
        const filePath = path.join(GALLERY_UPLOADS_DIR, filename);
        if (fs.existsSync(filePath)) {
          try { fs.unlinkSync(filePath); } catch (e) {}
        }
      }
    });
    db.gallery = db.gallery.filter(g => !idSet.has(g.id));
  }
  saveDatabase(db);
  res.json({ success: true, count: db.gallery.length, state: db });
});

// --- NEWS MANAGEMENT ---
app.post('/api/news', (req, res) => {
  const db = readDatabase();
  const item = {
    id: req.body.id || 'news-' + Date.now(),
    date: req.body.date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    title: (req.body.title || '').trim(),
    category: (req.body.category || 'Announcement').trim(),
    badge: (req.body.badge || req.body.category || 'Official').trim(),
    image: req.body.image || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800',
    summary: (req.body.summary || '').trim(),
    isUploaded: true,
    isPublic: typeof req.body.isPublic !== 'undefined' ? Boolean(req.body.isPublic) : true,
    isPublished: typeof req.body.isPublished !== 'undefined' ? Boolean(req.body.isPublished) : true,
    createdAt: new Date().toISOString()
  };

  if (!item.title) {
    return res.status(400).json({ success: false, message: 'Article title is required' });
  }

  if (!db.news) db.news = [];
  db.news.unshift(item);
  saveDatabase(db);
  res.status(201).json({ success: true, news: item, state: db });
});

app.put('/api/news/:id', (req, res) => {
  const { id } = req.params;
  const db = readDatabase();
  if (!db.news) db.news = [];
  const idx = db.news.findIndex(n => n.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'News article not found' });
  }

  db.news[idx] = {
    ...db.news[idx],
    ...req.body,
    id: db.news[idx].id,
    isUploaded: true,
    updatedAt: new Date().toISOString()
  };

  saveDatabase(db);
  res.json({ success: true, news: db.news[idx], state: db });
});

app.patch('/api/news/:id/toggle-visibility', (req, res) => {
  const { id } = req.params;
  const db = readDatabase();
  if (!db.news) db.news = [];
  const idx = db.news.findIndex(n => n.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'News article not found' });
  }

  const currentStatus = db.news[idx].isPublic !== false && db.news[idx].isPublished !== false;
  const newStatus = typeof req.body.isPublic !== 'undefined' ? Boolean(req.body.isPublic) : !currentStatus;
  db.news[idx].isPublic = newStatus;
  db.news[idx].isPublished = newStatus;
  db.news[idx].isUploaded = true;

  saveDatabase(db);
  res.json({
    success: true,
    isPublic: newStatus,
    isPublished: newStatus,
    message: newStatus ? `Article is now Published to Public` : `Article is now Hidden (Draft)`,
    state: db
  });
});

app.delete('/api/news/:id', (req, res) => {
  const { id } = req.params;
  const db = readDatabase();
  db.news = (db.news || []).filter(n => n.id !== id);
  saveDatabase(db);
  res.json({ success: true, state: db });
});

app.post('/api/news/bulk-delete', (req, res) => {
  const { ids, all } = req.body;
  const db = readDatabase();
  if (all) {
    db.news = [];
  } else if (Array.isArray(ids)) {
    const idSet = new Set(ids);
    db.news = (db.news || []).filter(n => !idSet.has(n.id));
  }
  saveDatabase(db);
  res.json({ success: true, count: db.news.length, state: db });
});

app.post('/api/news/clean-unuploaded', (req, res) => {
  const db = readDatabase();
  const beforeCount = (db.news || []).length;
  db.news = (db.news || []).filter(n => {
    if (!n || !n.title || !n.title.trim()) return false;
    if (n.isUploaded === false || n.isPublic === false || n.isPublished === false || n.status === 'draft' || n.status === 'unuploaded') {
      return false;
    }
    return true;
  });
  saveDatabase(db);
  const removed = beforeCount - db.news.length;
  res.json({ success: true, removedCount: removed, remainingCount: db.news.length, state: db });
});

// --- WINNING ITEMS & WORKS MANAGEMENT (Photos, Videos, PDFs, Rich Text) ---

// 1. Upload PC Media (Photos, Videos, PDFs)
app.post('/api/items/upload', (req, res) => {
  uploadItem.single('file')(req, res, (err) => {
    if (err) {
      console.error('Item upload error:', err);
      return res.status(400).json({ success: false, message: err.message || 'File upload failed' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided' });
    }
    const ext = path.extname(req.file.originalname).toLowerCase();
    let mediaType = 'image';
    if (req.file.mimetype.startsWith('video/') || /\.(mp4|webm|ogg|mov|mkv|avi|m4v|3gp|wmv|quicktime|flv)$/i.test(ext)) {
      mediaType = 'video';
    } else if (req.file.mimetype === 'application/pdf' || /\.pdf$/i.test(ext)) {
      mediaType = 'pdf';
    }

    const fileUrl = `/uploads/items/${req.file.filename}`;
    res.status(201).json({
      success: true,
      url: fileUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mediaType: mediaType,
      size: req.file.size
    });
  });
});

// 2. Fetch all winning items
app.get('/api/items', (req, res) => {
  const db = readDatabase();
  res.json({ success: true, items: db.items || [] });
});

// 3. Create or update a winning item
app.post('/api/items', (req, res) => {
  const db = readDatabase();
  if (!db.items) db.items = [];

  const {
    id,
    resultId,
    resultNumber,
    programName,
    category,
    place,
    participantName,
    team,
    subject,
    textContent,
    mediaType,
    mediaUrl,
    originalName,
    fileSize
  } = req.body;

  if (!resultId || !place) {
    return res.status(400).json({ success: false, message: 'Result ID and Place (1st, 2nd, 3rd) are required' });
  }

  const existingIndex = id ? db.items.findIndex(item => item.id === id) : db.items.findIndex(item => item.resultId === resultId && item.place === place && (item.participantName === participantName || !participantName));

  const itemData = {
    id: id || (existingIndex !== -1 ? db.items[existingIndex].id : 'item-' + Date.now()),
    resultId,
    resultNumber: resultNumber || null,
    programName: programName || '',
    category: category || 'A-Zone',
    place: place || '1st',
    participantName: participantName || '',
    team: team || '',
    subject: subject || 'Fiesta Winning Work',
    textContent: textContent || '',
    mediaType: mediaType || 'text',
    mediaUrl: mediaUrl || '',
    originalName: originalName || '',
    fileSize: fileSize || null,
    updatedAt: new Date().toISOString()
  };

  if (existingIndex !== -1) {
    db.items[existingIndex] = { ...db.items[existingIndex], ...itemData };
  } else {
    db.items.unshift(itemData);
  }

  saveDatabase(db);
  res.status(201).json({
    success: true,
    item: existingIndex !== -1 ? db.items[existingIndex] : itemData,
    items: db.items,
    state: db
  });
});

// 4. Delete an item
app.delete('/api/items/:id', (req, res) => {
  const { id } = req.params;
  const db = readDatabase();
  if (!db.items) db.items = [];

  const item = db.items.find(it => it.id === id);
  if (item && item.mediaUrl && item.mediaUrl.startsWith('/uploads/items/')) {
    const filename = path.basename(item.mediaUrl);
    const filePath = path.join(ITEMS_UPLOADS_DIR, filename);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.warn('Failed to delete uploaded item media file:', err.message);
      }
    }
  }

  db.items = db.items.filter(it => it.id !== id);
  saveDatabase(db);
  res.json({ success: true, deletedId: id, items: db.items, state: db });
});

// 5. Bulk Delete Items
app.post('/api/items/bulk-delete', (req, res) => {
  const { ids, all } = req.body;
  const db = readDatabase();
  if (!db.items) db.items = [];

  if (all) {
    db.items.forEach(item => {
      if (item.mediaUrl && item.mediaUrl.startsWith('/uploads/items/')) {
        const filename = path.basename(item.mediaUrl);
        const filePath = path.join(ITEMS_UPLOADS_DIR, filename);
        if (fs.existsSync(filePath)) {
          try { fs.unlinkSync(filePath); } catch (e) {}
        }
      }
    });
    db.items = [];
  } else if (Array.isArray(ids) && ids.length > 0) {
    const idSet = new Set(ids);
    db.items.forEach(item => {
      if (idSet.has(item.id) && item.mediaUrl && item.mediaUrl.startsWith('/uploads/items/')) {
        const filename = path.basename(item.mediaUrl);
        const filePath = path.join(ITEMS_UPLOADS_DIR, filename);
        if (fs.existsSync(filePath)) {
          try { fs.unlinkSync(filePath); } catch (e) {}
        }
      }
    });
    db.items = db.items.filter(it => !idSet.has(it.id));
  }

  saveDatabase(db);
  res.json({ success: true, count: db.items.length, items: db.items, state: db });
});

// --- SUPABASE CLOUD DATABASE API ENDPOINTS ---
app.get('/api/supabase/status', (req, res) => {
  res.json({
    success: true,
    configured: supabaseProvider.isConfigured(),
    connected: supabaseProvider.isConnected,
    url: supabaseProvider.url ? supabaseProvider.url.replace(/:[^@]+@/, ':***@') : '',
    lastSyncTime: supabaseProvider.lastSyncTime
  });
});

app.post('/api/supabase/config', async (req, res) => {
  const { url, key } = req.body;
  if (!url || !key) {
    return res.status(400).json({ success: false, error: 'Supabase URL and Key are required.' });
  }
  supabaseProvider.initClient(url, key);
  const connTest = await supabaseProvider.testConnection();
  if (connTest.success) {
    const db = readDatabase();
    supabaseProvider.syncAllToSupabase(db).catch(() => {});
    return res.json({ success: true, message: 'Connected to Supabase successfully.' });
  } else {
    return res.status(400).json({ success: false, error: connTest.error || connTest.message });
  }
});

app.post('/api/supabase/sync', async (req, res) => {
  if (!supabaseProvider.isConfigured()) {
    return res.status(400).json({ success: false, error: 'Supabase is not configured yet.' });
  }
  const db = readDatabase();
  const syncRes = await supabaseProvider.syncAllToSupabase(db);
  if (syncRes.success) {
    return res.json({ success: true, syncedAt: syncRes.syncedAt });
  } else {
    return res.status(500).json({ success: false, error: syncRes.error });
  }
});

// --- FALLBACK TO SPA ---
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const HOST = '0.0.0.0';

if (require.main === module || !process.env.VERCEL) {
  server.listen(PORT, HOST, () => {
    console.log(`====================================================`);
    console.log(`EXCELLENTIA ARTS FIESTA 2026 - DISCOVER THE UNSEEN`);
    console.log(`Server listening on: http://${HOST}:${PORT}`);
    console.log(`Real-Time WebSocket Sync: Enabled (Active on port ${PORT})`);
    console.log(`Admin clearance: e26@gmail.com / e26msoe`);
    console.log(`Environment: ${process.env.NODE_ENV || 'production'}`);
    console.log(`====================================================`);
  });
}

module.exports = app;
module.exports.server = server;
