ALTER TABLE public.calendar_event_publications
  ADD COLUMN IF NOT EXISTS public_description text NOT NULL DEFAULT '';
