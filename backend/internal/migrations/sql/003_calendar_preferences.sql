CREATE TABLE IF NOT EXISTS public.calendar_preferences (
  calendar_id text PRIMARY KEY,
  color text NOT NULL,
  label text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);
