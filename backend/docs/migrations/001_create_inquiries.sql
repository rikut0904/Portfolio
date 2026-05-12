-- Create inquiries table for Go backend inquiry APIs.
-- Compatible with current code in internal/adapter/http/inquiries_handlers.go

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.inquiries (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  category text NOT NULL DEFAULT '',
  subject text NOT NULL,
  message text NOT NULL,
  contact_name text NOT NULL DEFAULT '',
  contact_email text NOT NULL,
  thread_id text NOT NULL DEFAULT gen_random_uuid()::text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'resolved')),
  replies jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_inquiries_thread_id ON public.inquiries (thread_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON public.inquiries (created_at DESC);

CREATE TABLE IF NOT EXISTS public.inquiry_replies (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  inquiry_id text NOT NULL REFERENCES public.inquiries(id) ON DELETE CASCADE,
  thread_id text NOT NULL,
  sender_type text NOT NULL,
  sender_name text NOT NULL DEFAULT '',
  sender_email text NOT NULL DEFAULT '',
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inquiry_replies_inquiry_id ON public.inquiry_replies (inquiry_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_inquiry_replies_thread_id ON public.inquiry_replies (thread_id, created_at ASC);
