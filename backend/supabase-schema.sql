-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Terms table
CREATE TABLE IF NOT EXISTS terms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  term TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RMP data table (for direct queries)
CREATE TABLE IF NOT EXISTS rmp_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_key TEXT NOT NULL UNIQUE,
  avg_rating NUMERIC,
  avg_diff NUMERIC,
  take_again_percent INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Courses table (denormalized to match MongoDB document structure)
CREATE TABLE IF NOT EXISTS courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  term TEXT NOT NULL,
  teacher TEXT NOT NULL,
  name_key TEXT NOT NULL,
  lecture JSONB,
  labs JSONB[] DEFAULT '{}',
  discussions JSONB[] DEFAULT '{}',
  midterms JSONB[] DEFAULT '{}',
  final JSONB,
  rmp JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_courses_term ON courses(term);
CREATE INDEX IF NOT EXISTS idx_courses_name_key ON courses(name_key);
CREATE INDEX IF NOT EXISTS idx_courses_teacher ON courses(teacher);
CREATE INDEX IF NOT EXISTS idx_courses_name ON courses(name);
CREATE INDEX IF NOT EXISTS idx_terms_is_active ON terms(is_active);
CREATE INDEX IF NOT EXISTS idx_rmp_data_name_key ON rmp_data(name_key);

-- Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_terms_updated_at BEFORE UPDATE ON terms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rmp_data_updated_at BEFORE UPDATE ON rmp_data
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
