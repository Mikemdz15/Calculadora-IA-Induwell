-- Tabla para guardar el diagnóstico de la semana actual
CREATE TABLE weekly_diagnostics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  week_id text NOT NULL UNIQUE,
  diagnosis_text text NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Tabla para el respaldo histórico de diagnósticos de semanas pasadas
CREATE TABLE weekly_diagnostics_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  week_id text NOT NULL,
  diagnosis_text text NOT NULL,
  archived_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Habilitar RLS
ALTER TABLE weekly_diagnostics ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_diagnostics_history ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura/escritura abiertas para todos los usuarios (temporal hasta auth)
CREATE POLICY "Enable read access for all users" ON weekly_diagnostics FOR SELECT USING (true);
CREATE POLICY "Enable write access for all users" ON weekly_diagnostics FOR ALL USING (true);

CREATE POLICY "Enable read access for all users" ON weekly_diagnostics_history FOR SELECT USING (true);
CREATE POLICY "Enable write access for all users" ON weekly_diagnostics_history FOR ALL USING (true);
