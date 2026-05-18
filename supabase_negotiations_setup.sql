-- Tabla para registrar las partidas en negociación
CREATE TABLE partidas_negociacion (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  month_id text NOT NULL, -- Ej: '2026-05'
  director_check boolean DEFAULT false,
  buyer text NOT NULL,
  sku text NOT NULL,
  description text NOT NULL,
  supplier text NOT NULL,
  inventory_qty numeric DEFAULT 0,
  weekly_avg_consumption numeric DEFAULT 0,
  previous_price numeric DEFAULT 0,
  new_price numeric DEFAULT 0,
  submission_date date NOT NULL,
  comments text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Habilitar RLS
ALTER TABLE partidas_negociacion ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura/escritura abiertas para todos los usuarios (temporal hasta auth)
CREATE POLICY "Enable read access for all users" ON partidas_negociacion FOR SELECT USING (true);
CREATE POLICY "Enable write access for all users" ON partidas_negociacion FOR ALL USING (true);
CREATE POLICY "Enable update access for all users" ON partidas_negociacion FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON partidas_negociacion FOR DELETE USING (true);
