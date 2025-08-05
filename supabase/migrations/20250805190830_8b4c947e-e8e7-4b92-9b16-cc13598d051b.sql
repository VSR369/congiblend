-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
  id uuid NOT NULL PRIMARY KEY,
  username text UNIQUE NOT NULL,
  display_name text,
  email text UNIQUE,
  avatar_url text,
  is_verified boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create users policies
DROP POLICY IF EXISTS "Users are publicly visible" ON users;
CREATE POLICY "Users are publicly visible"
ON users FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON users;
CREATE POLICY "Users can update their own profile"
ON users FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
CREATE POLICY "Users can insert their own profile"
ON users FOR INSERT
WITH CHECK (auth.uid() = id);