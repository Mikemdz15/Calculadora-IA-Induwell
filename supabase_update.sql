-- 1. Create system config table
CREATE TABLE system_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Insert initial current week (Assuming week 19 of 2024 as starting point)
-- The app will calculate the current ISO week. If the ISO week is greater than this, it will lock.
INSERT INTO system_config (key, value) 
VALUES ('current_week', '{"week_id": "2024-W01"}');

-- 2. Create history table for sku reviews
CREATE TABLE sku_reviews_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  week_id text NOT NULL, -- e.g., "2024-W19"
  sku_id text NOT NULL,
  is_resolved boolean DEFAULT false,
  comment text,
  resolved_by_user_id text,
  archived_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 3. Set up RLS for new tables
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE sku_reviews_history ENABLE ROW LEVEL SECURITY;

-- For now, allow public read/write (like the current sku_reviews table)
CREATE POLICY "Enable read access for all users" ON system_config FOR SELECT USING (true);
CREATE POLICY "Enable write access for all users" ON system_config FOR ALL USING (true);

CREATE POLICY "Enable read access for all users" ON sku_reviews_history FOR SELECT USING (true);
CREATE POLICY "Enable write access for all users" ON sku_reviews_history FOR ALL USING (true);
