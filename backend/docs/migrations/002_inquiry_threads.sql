CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.inquiries
  ADD COLUMN IF NOT EXISTS thread_id text;

UPDATE public.inquiries
SET thread_id = gen_random_uuid()::text
WHERE thread_id IS NULL OR btrim(thread_id) = '';

ALTER TABLE public.inquiries
  ALTER COLUMN thread_id SET DEFAULT gen_random_uuid()::text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_inquiries_thread_id
  ON public.inquiries (thread_id);

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

CREATE INDEX IF NOT EXISTS idx_inquiry_replies_inquiry_id
  ON public.inquiry_replies (inquiry_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_inquiry_replies_thread_id
  ON public.inquiry_replies (thread_id, created_at ASC);

INSERT INTO public.inquiry_replies (
  id,
  inquiry_id,
  thread_id,
  sender_type,
  sender_name,
  sender_email,
  message,
  created_at
)
SELECT
  COALESCE(NULLIF(reply->>'id', ''), gen_random_uuid()::text),
  i.id,
  i.thread_id,
  COALESCE(NULLIF(reply->>'senderType', ''), 'admin'),
  COALESCE(NULLIF(reply->>'senderName', ''), ''),
  COALESCE(NULLIF(reply->>'senderEmail', ''), ''),
  COALESCE(NULLIF(reply->>'message', ''), ''),
  COALESCE(NULLIF(reply->>'createdAt', '')::timestamptz, i.updated_at, i.created_at, NOW())
FROM public.inquiries i
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(i.replies, '[]'::jsonb)) AS reply
WHERE NOT EXISTS (
  SELECT 1
  FROM public.inquiry_replies ir
  WHERE ir.id = COALESCE(NULLIF(reply->>'id', ''), '')
);
