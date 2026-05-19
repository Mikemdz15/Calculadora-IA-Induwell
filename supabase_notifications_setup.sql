-- 1. Tabla de Notificaciones
CREATE TABLE notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE, -- Si es null, es un broadcast (ej. a roles)
  target_role text, -- 'director', 'supervisor_planeador', 'comprador', etc.
  target_buyer_name text, -- Para notificar a un comprador específico por su nombre (ya que no todos tienen auth vinculado fuerte)
  message text NOT NULL,
  reference_id text, -- ID de la partida (ej. 'UUID-de-negociacion' o 'SKU-ABC')
  reference_type text, -- 'negociacion', 'sku_review', 'general'
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 2. Habilitar RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de acceso (Quien puede ver/modificar qué)
-- Cualquiera puede insertar notificaciones (los componentes de la app las crearán)
CREATE POLICY "Enable insert access for all users" ON notifications FOR INSERT WITH CHECK (true);

-- Leer: Un usuario puede leer notificaciones si:
-- a) El user_id es exactamente el suyo
-- b) El target_role coincide con su rol en la tabla profiles
-- c) El target_buyer_name coincide con su full_name en la tabla profiles
CREATE POLICY "Users can view their own notifications" ON notifications FOR SELECT USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND (
      (notifications.target_role IS NOT NULL AND profiles.role = notifications.target_role) OR
      (notifications.target_buyer_name IS NOT NULL AND profiles.full_name = notifications.target_buyer_name)
    )
  )
);

-- Actualizar (marcar como leídas):
-- Solo pueden actualizar las que pueden ver
CREATE POLICY "Users can update their own notifications" ON notifications FOR UPDATE USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND (
      (notifications.target_role IS NOT NULL AND profiles.role = notifications.target_role) OR
      (notifications.target_buyer_name IS NOT NULL AND profiles.full_name = notifications.target_buyer_name)
    )
  )
);

-- Borrar (limpiar historial viejo si es necesario):
CREATE POLICY "Users can delete their own notifications" ON notifications FOR DELETE USING (
  user_id = auth.uid()
);
