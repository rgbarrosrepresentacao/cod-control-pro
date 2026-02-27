-- ================================================
-- COD Control Pro – Supabase Database Setup
-- Execute this SQL in the Supabase SQL Editor
-- ================================================

-- =====================
-- 1. TABELA: ads (Anúncios)
-- =====================
CREATE TABLE IF NOT EXISTS ads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL,
  platform text NOT NULL,
  value numeric(10,2) NOT NULL DEFAULT 0,
  campaign text,
  obs text,
  created_at timestamptz DEFAULT now()
);

-- =====================
-- 2. TABELA: sales (Vendas)
-- =====================
CREATE TABLE IF NOT EXISTS sales (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL,
  product text NOT NULL,
  status text NOT NULL DEFAULT 'Entregue',
  gross numeric(10,2) NOT NULL DEFAULT 0,
  commission numeric(10,2) DEFAULT 0,
  cost numeric(10,2) DEFAULT 0,
  shipping numeric(10,2) DEFAULT 0,
  fee numeric(10,2) DEFAULT 0,
  profit numeric(10,2) DEFAULT 0,
  obs text,
  created_at timestamptz DEFAULT now()
);

-- =====================
-- 3. TABELA: settings (Configurações)
-- =====================
CREATE TABLE IF NOT EXISTS settings (
  id integer PRIMARY KEY DEFAULT 1,
  goal numeric(12,2) DEFAULT 100000,
  password text DEFAULT 'cod2024'
);

-- Insert default settings row (ignore if exists)
INSERT INTO settings (id, goal, password)
VALUES (1, 100000, 'cod2024')
ON CONFLICT (id) DO NOTHING;

-- =====================
-- 4. ROW LEVEL SECURITY (RLS)
-- =====================
-- Enable RLS on all tables
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Allow all operations with anon key (since we handle auth ourselves)
CREATE POLICY "Allow all for anon" ON ads FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON sales FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON settings FOR ALL TO anon USING (true) WITH CHECK (true);

-- =====================
-- 5. INDEXES for performance
-- =====================
CREATE INDEX IF NOT EXISTS ads_date_idx ON ads(date);
CREATE INDEX IF NOT EXISTS sales_date_idx ON sales(date);
CREATE INDEX IF NOT EXISTS sales_status_idx ON sales(status);
