-- =========================================================================
-- EXCELLENTIA ARTS FIESTA 2026 - SUPABASE DATABASE SCHEMA
-- PostgreSQL schema for Supabase Cloud Database & Storage
-- =========================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TEAMS TABLE
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  points NUMERIC DEFAULT 0,
  rank INTEGER DEFAULT 1,
  color TEXT,
  crest TEXT,
  categoryPoints JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. RESULTS TABLE
CREATE TABLE IF NOT EXISTS results (
  id TEXT PRIMARY KEY,
  programCode TEXT,
  programName TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  resultNumber INTEGER,
  winners JSONB DEFAULT '[]'::jsonb,
  additionalGrades JSONB DEFAULT '[]'::jsonb,
  isPublic BOOLEAN DEFAULT TRUE,
  publishedAt TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_results_resnum ON results(resultNumber DESC);
CREATE INDEX IF NOT EXISTS idx_results_cat ON results(category);
CREATE INDEX IF NOT EXISTS idx_results_ispublic ON results(isPublic);

-- 3. PROGRAMS TABLE
CREATE TABLE IF NOT EXISTS programs (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE,
  name TEXT NOT NULL,
  category TEXT,
  stage TEXT,
  scheduleTime TEXT,
  status TEXT DEFAULT 'Scheduled',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. PARTICIPANTS TABLE
CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  chestNumber TEXT,
  team TEXT,
  category TEXT,
  events JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. VIDEOS TABLE (Highlights & Live Streams)
CREATE TABLE IF NOT EXISTS videos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT DEFAULT 'Highlight',
  videoUrl TEXT NOT NULL,
  thumbnail TEXT,
  duration TEXT,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. GALLERY TABLE (High-Resolution Photos)
CREATE TABLE IF NOT EXISTS gallery (
  id TEXT PRIMARY KEY,
  title TEXT,
  category TEXT DEFAULT 'General',
  image TEXT NOT NULL,
  likes INTEGER DEFAULT 0,
  uploadedAt TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. NEWS TABLE (Bulletins & Announcements)
CREATE TABLE IF NOT EXISTS news (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT DEFAULT 'Notice',
  content TEXT,
  date TEXT,
  isPinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. WINNING WORKS / ITEMS TABLE
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  resultId TEXT,
  participantName TEXT,
  team TEXT,
  place TEXT,
  mediaType TEXT DEFAULT 'text',
  itemType TEXT DEFAULT 'text',
  subject TEXT,
  content TEXT,
  mediaUrl TEXT,
  thumbnailUrl TEXT,
  viewsCount INTEGER DEFAULT 0,
  isApproved BOOLEAN DEFAULT TRUE,
  publishedAt TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_items_resultid ON items(resultId);

-- 9. SETTINGS TABLE
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY DEFAULT 'main',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. DISCREPANCY REPORTS / NOTIFICATIONS
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  programName TEXT,
  participantName TEXT,
  requesterTeam TEXT,
  requesterName TEXT,
  phone TEXT,
  notes TEXT,
  status TEXT DEFAULT 'Pending',
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Public read access policies
CREATE POLICY "Public Read Teams" ON teams FOR SELECT USING (true);
CREATE POLICY "Public Read Results" ON results FOR SELECT USING (true);
CREATE POLICY "Public Read Programs" ON programs FOR SELECT USING (true);
CREATE POLICY "Public Read Participants" ON participants FOR SELECT USING (true);
CREATE POLICY "Public Read Videos" ON videos FOR SELECT USING (true);
CREATE POLICY "Public Read Gallery" ON gallery FOR SELECT USING (true);
CREATE POLICY "Public Read News" ON news FOR SELECT USING (true);
CREATE POLICY "Public Read Items" ON items FOR SELECT USING (true);
CREATE POLICY "Public Read Settings" ON settings FOR SELECT USING (true);
CREATE POLICY "Public Insert Reports" ON reports FOR INSERT WITH CHECK (true);
