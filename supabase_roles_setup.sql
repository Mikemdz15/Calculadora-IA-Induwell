-- 1. Tabla de Perfiles de Usuario (Roles)
CREATE TABLE profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  role text NOT NULL CHECK (role IN ('comprador', 'supervisor_planeador', 'director')),
  full_name text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Director can update all profiles." ON profiles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'director')
);

-- 2. Actualización a Tabla: sku_reviews (Matriz de Riesgo)
ALTER TABLE sku_reviews
ADD COLUMN IF NOT EXISTS supervisor_check boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS planeador_check boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS director_vobo boolean DEFAULT false;

-- 3. Actualización a Tabla: partidas_negociacion
ALTER TABLE partidas_negociacion
ADD COLUMN IF NOT EXISTS supervisor_check boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS planeador_check boolean DEFAULT false;
-- (director_check ya existe en esta tabla)

-- 4. Tabla de Historial de Comentarios
CREATE TABLE comments_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reference_id text NOT NULL, -- Puede ser el sku_id o el ID de la partida de negociación
  reference_type text NOT NULL CHECK (reference_type IN ('sku_review', 'negociacion')),
  user_id uuid REFERENCES auth.users ON DELETE SET NULL,
  user_name text NOT NULL, -- Guardamos el nombre para historial fácil
  comment text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE comments_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON comments_history FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON comments_history FOR INSERT WITH CHECK (auth.role() = 'authenticated');
-- No permitimos UPDATE ni DELETE en el historial de comentarios por seguridad
