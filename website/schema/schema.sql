-- Aptitude Mind Plus moderation and course enquiries. Apply ONCE to the Cloudflare D1 database.
-- Re-application is safe because all objects use IF NOT EXISTS.
CREATE TABLE IF NOT EXISTS questions (
 id TEXT PRIMARY KEY,
 exam TEXT NOT NULL CHECK (exam IN ('upsc','gate','ssc','bank','state','rail')),
 topic TEXT NOT NULL,
 question TEXT NOT NULL,
 answer TEXT NOT NULL DEFAULT '',
 exam_year INTEGER,
 source_url TEXT NOT NULL DEFAULT '',
 contributor_name TEXT NOT NULL DEFAULT '',
 contributor_email TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
 verified_official INTEGER NOT NULL DEFAULT 0 CHECK (verified_official IN (0,1)),
 created_at TEXT NOT NULL DEFAULT (datetime('now')),
 reviewed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_questions_public ON questions (status,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_questions_exam ON questions (status,exam,created_at DESC);
CREATE TABLE IF NOT EXISTS question_images (
 question_id TEXT PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE,
 mime_type TEXT NOT NULL CHECK (mime_type='image/jpeg'),
 data_base64 TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS course_applications (
 id TEXT PRIMARY KEY,
 name TEXT NOT NULL,
 email TEXT NOT NULL DEFAULT '',
 phone TEXT NOT NULL DEFAULT '',
 exam TEXT NOT NULL CHECK (exam IN ('upsc','gate','ssc','bank','state','rail','custom')),
 message TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_applications_recent ON course_applications (created_at DESC);
CREATE TABLE IF NOT EXISTS request_limits (
 key TEXT PRIMARY KEY,
 hits INTEGER NOT NULL DEFAULT 0,
 updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);