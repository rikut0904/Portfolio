CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image TEXT NOT NULL DEFAULT '',
  link TEXT NOT NULL DEFAULT '',
  github_url TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  technologies TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT '公開',
  deploy_status TEXT NOT NULL DEFAULT '未公開',
  created_year INT NOT NULL,
  created_month INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS section_meta (
  section_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  type TEXT NOT NULL,
  order_no INT NOT NULL,
  editable BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order TEXT
);

CREATE TABLE IF NOT EXISTS sections (
  section_id TEXT PRIMARY KEY REFERENCES section_meta(section_id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL,
  technologies TEXT[] NOT NULL DEFAULT '{}',
  link TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT '非公開',
  created_year INT NOT NULL,
  created_month INT NOT NULL,
  order_no INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  order_no INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS technologies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  contact_name TEXT NOT NULL DEFAULT '',
  contact_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  replies JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  entity TEXT,
  entity_id TEXT,
  user_id TEXT,
  user_email TEXT,
  level TEXT NOT NULL DEFAULT 'info',
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at_id ON admin_logs (created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON inquiries (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_year_month ON products (created_year, created_month);
CREATE INDEX IF NOT EXISTS idx_activities_order ON activities (order_no DESC);
CREATE INDEX IF NOT EXISTS idx_activity_categories_order ON activity_categories (order_no ASC);
