CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.products (
  id text PRIMARY KEY,
  category text,
  "createdAt" text,
  "createdMonth" bigint,
  "createdYear" bigint,
  "deployStatus" text,
  description text,
  "githubUrl" text,
  image text,
  link text,
  status text,
  technologies jsonb,
  title text,
  "updatedAt" timestamptz,
  year bigint
);

CREATE TABLE IF NOT EXISTS public.activities (
  id text PRIMARY KEY,
  category text,
  "createdAt" timestamptz,
  description text,
  image text,
  link text,
  "order" bigint,
  status text,
  title text,
  "updatedAt" timestamptz
);

CREATE TABLE IF NOT EXISTS public."activityCategories" (
  id text PRIMARY KEY,
  "createdAt" timestamptz,
  name text,
  "order" bigint
);

CREATE TABLE IF NOT EXISTS public."adminLogs" (
  id text PRIMARY KEY,
  action text,
  "createdAt" timestamptz,
  details jsonb,
  "details_deployStatus" text,
  "details_fileName" text,
  "details_path" text,
  "details_status" text,
  "details_title" text,
  entity text,
  "entityId" text,
  level text,
  "userEmail" text,
  "userId" text
);

CREATE TABLE IF NOT EXISTS public."sectionMeta" (
  id text PRIMARY KEY,
  "displayName" text,
  editable boolean,
  section_id text,
  "order" bigint,
  schema jsonb,
  schema_category jsonb,
  schema_category_label text,
  schema_category_type text,
  schema_date jsonb,
  schema_date_label text,
  schema_date_type text,
  schema_details jsonb,
  schema_details_label text,
  schema_details_type text,
  schema_hobbies jsonb,
  schema_hobbies_label text,
  schema_hobbies_type text,
  schema_hometown jsonb,
  schema_hometown_label text,
  schema_hometown_type text,
  schema_name jsonb,
  schema_name_label text,
  schema_name_type text,
  "schema_profileImage" jsonb,
  "schema_profileImage_label" text,
  "schema_profileImage_type" text,
  schema_university jsonb,
  schema_university_label text,
  schema_university_type text,
  type_name text
);

CREATE TABLE IF NOT EXISTS public.sections (
  id text PRIMARY KEY,
  data jsonb,
  data_hobbies text,
  data_hometown text,
  data_name text,
  "data_profileImage" text,
  data_university text,
  histories jsonb,
  items jsonb,
  type_name text
);

CREATE TABLE IF NOT EXISTS public.technologies (
  id text PRIMARY KEY,
  category text,
  "createdAt" timestamptz,
  name text,
  "updatedAt" timestamptz
);

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

CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON public.inquiries (created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_inquiries_thread_id ON public.inquiries (thread_id);

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
