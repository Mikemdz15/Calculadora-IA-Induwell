-- 1. Create sku_reviews table (Original)
CREATE TABLE sku_reviews (
  id uuid default gen_random_uuid() primary key,
  sku_id text not null unique,
  is_resolved boolean default false,
  comment text default '',
  resolved_by_user_id text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table sku_reviews enable row level security;
create policy "Allow all read" on sku_reviews for select using (true);
create policy "Allow all insert" on sku_reviews for insert with check (true);
create policy "Allow all update" on sku_reviews for update using (true);
create policy "Allow all delete" on sku_reviews for delete using (true);

-- 2. Create system config table (New)
CREATE TABLE system_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Insert initial current week
INSERT INTO system_config (key, value) 
VALUES ('current_week', '{"week_id": "2024-W01"}');

-- 3. Create history table for sku reviews (New)
CREATE TABLE sku_reviews_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  week_id text NOT NULL,
  sku_id text NOT NULL,
  is_resolved boolean DEFAULT false,
  comment text,
  resolved_by_user_id text,
  archived_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 4. Set up RLS for new tables
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE sku_reviews_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON system_config FOR SELECT USING (true);
CREATE POLICY "Enable write access for all users" ON system_config FOR ALL USING (true);

CREATE POLICY "Enable read access for all users" ON sku_reviews_history FOR SELECT USING (true);
CREATE POLICY "Enable write access for all users" ON sku_reviews_history FOR ALL USING (true);
