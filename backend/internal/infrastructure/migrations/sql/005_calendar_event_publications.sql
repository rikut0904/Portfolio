CREATE TABLE IF NOT EXISTS public.calendar_event_publications (
  calendar_id text NOT NULL,
  event_id text NOT NULL,
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (calendar_id, event_id)
);
