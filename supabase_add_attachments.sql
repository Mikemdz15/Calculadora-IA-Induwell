-- 1. Agregar columnas si no existen
ALTER TABLE comments_history 
ADD COLUMN IF NOT EXISTS file_url TEXT,
ADD COLUMN IF NOT EXISTS file_name TEXT;

-- 2. Recrear políticas de RLS para evitar errores de inserción en la base de datos
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON comments_history;
DROP POLICY IF EXISTS "Enable read access for all users" ON comments_history;

CREATE POLICY "Enable read access for all users" ON comments_history FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON comments_history FOR INSERT WITH CHECK (true);

-- 3. Recrear políticas de RLS para Supabase Storage (Bucket attachments)
DROP POLICY IF EXISTS "Permitir lectura publica de adjuntos" ON storage.objects;
CREATE POLICY "Permitir lectura publica de adjuntos"
ON storage.objects FOR SELECT
USING (bucket_id = 'attachments');

DROP POLICY IF EXISTS "Permitir subida publica de adjuntos" ON storage.objects;
CREATE POLICY "Permitir subida publica de adjuntos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'attachments');

DROP POLICY IF EXISTS "Permitir actualizar adjuntos" ON storage.objects;
CREATE POLICY "Permitir actualizar adjuntos"
ON storage.objects FOR UPDATE
WITH CHECK (bucket_id = 'attachments');
