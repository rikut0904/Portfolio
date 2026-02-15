-- Create inquiries table for Go backend inquiry APIs.
-- Compatible with current code in internal/api/handlers.go

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.inquiries (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  category text NOT NULL DEFAULT '',
  subject text NOT NULL,
  message text NOT NULL,
  contact_name text NOT NULL DEFAULT '',
  contact_email text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'resolved')),
  replies jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON public.inquiries (created_at DESC);
