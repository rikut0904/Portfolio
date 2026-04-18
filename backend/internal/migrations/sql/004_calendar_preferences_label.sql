ALTER TABLE public.calendar_preferences
  ADD COLUMN IF NOT EXISTS label text NOT NULL DEFAULT '';
