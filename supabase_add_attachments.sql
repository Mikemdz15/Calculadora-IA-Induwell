-- 1. Agregar columnas si no existen
ALTER TABLE comments_history 
ADD COLUMN IF NOT EXISTS file_url TEXT,
ADD COLUMN IF NOT EXISTS file_name TEXT;

-- 2. Recrear políticas de RLS para evitar errores de inserción
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON comments_history;
DROP POLICY IF EXISTS "Enable read access for all users" ON comments_history;

CREATE POLICY "Enable read access for all users" ON comments_history FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON comments_history FOR INSERT WITH CHECK (true);
