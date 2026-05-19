-- 1. Tabla de Empresas
CREATE TABLE companies (
  id text PRIMARY KEY, -- Identificador único sin espacios (ej: grupo_alphalab)
  name text NOT NULL, -- Nombre visible (ej: Grupo Alphalab)
  gid text NOT NULL, -- Identificador de la hoja de Google Sheets
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 2. Habilitar RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de acceso
-- Leer: Todos los usuarios pueden ver la lista de empresas
CREATE POLICY "Enable read access for all users" ON companies FOR SELECT USING (true);

-- Insertar: Solo el director puede agregar nuevas empresas
-- Verificamos el rol en la tabla profiles
CREATE POLICY "Enable insert for directors" ON companies FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'director')
);

-- 4. Insertar empresa inicial por defecto
INSERT INTO companies (id, name, gid) VALUES ('alphalab', 'Grupo Alphalab', '0') ON CONFLICT (id) DO NOTHING;
