-- Crea la tabla de revisiones de SKU
create table sku_reviews (
  id uuid default gen_random_uuid() primary key,
  sku_id text not null unique,
  is_resolved boolean default false,
  comment text default '',
  resolved_by_user_id text, -- ID o nombre del comprador
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS (Row Level Security) - opcional pero recomendado
alter table sku_reviews enable row level security;

-- Crear políticas (Policies) para permitir a los usuarios anónimos leer y escribir (solo para pruebas)
-- ¡IMPORTANTE! Para producción, debes restringir esto a usuarios autenticados
create policy "Allow all read" on sku_reviews for select using (true);
create policy "Allow all insert" on sku_reviews for insert with check (true);
create policy "Allow all update" on sku_reviews for update using (true);
