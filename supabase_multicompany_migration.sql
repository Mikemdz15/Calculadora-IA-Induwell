-- Script de Migración para Múltiples Sociedades (company_id)
-- Ejecutar en el SQL Editor de Supabase

-- 1. Agregar company_id a todas las tablas que lo necesitan
ALTER TABLE partidas_negociacion ADD COLUMN IF NOT EXISTS company_id text DEFAULT 'alphalab';
ALTER TABLE sku_reviews ADD COLUMN IF NOT EXISTS company_id text DEFAULT 'alphalab';
ALTER TABLE sku_reviews_history ADD COLUMN IF NOT EXISTS company_id text DEFAULT 'alphalab';
ALTER TABLE comments_history ADD COLUMN IF NOT EXISTS company_id text DEFAULT 'alphalab';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS company_id text DEFAULT 'alphalab';
ALTER TABLE weekly_diagnostics ADD COLUMN IF NOT EXISTS company_id text DEFAULT 'alphalab';
ALTER TABLE weekly_diagnostics_history ADD COLUMN IF NOT EXISTS company_id text DEFAULT 'alphalab';
ALTER TABLE system_config ADD COLUMN IF NOT EXISTS company_id text DEFAULT 'alphalab';

-- 2. Asegurar que las llaves primarias/restricciones únicas sean por empresa
-- En sku_reviews la regla unique era sku_id, ahora debe ser (sku_id, company_id)
ALTER TABLE sku_reviews DROP CONSTRAINT IF EXISTS sku_reviews_sku_id_key;
ALTER TABLE sku_reviews ADD CONSTRAINT sku_reviews_sku_id_company_id_key UNIQUE (sku_id, company_id);

-- En system_config la regla unique era key, ahora debe ser (key, company_id)
ALTER TABLE system_config DROP CONSTRAINT IF EXISTS system_config_key_key;
ALTER TABLE system_config ADD CONSTRAINT system_config_key_company_id_key UNIQUE (key, company_id);

-- En weekly_diagnostics la regla unique era week_id, ahora debe ser (week_id, company_id)
ALTER TABLE weekly_diagnostics DROP CONSTRAINT IF EXISTS weekly_diagnostics_week_id_key;
ALTER TABLE weekly_diagnostics ADD CONSTRAINT weekly_diagnostics_week_id_company_id_key UNIQUE (week_id, company_id);

-- Opcionalmente: Remover el DEFAULT 'alphalab' para futuras inserciones si quieres obligar a pasarlo
-- ALTER TABLE partidas_negociacion ALTER COLUMN company_id DROP DEFAULT;
-- ALTER TABLE sku_reviews ALTER COLUMN company_id DROP DEFAULT;
-- ALTER TABLE sku_reviews_history ALTER COLUMN company_id DROP DEFAULT;
-- ALTER TABLE comments_history ALTER COLUMN company_id DROP DEFAULT;
-- ALTER TABLE notifications ALTER COLUMN company_id DROP DEFAULT;
-- ALTER TABLE weekly_diagnostics ALTER COLUMN company_id DROP DEFAULT;
-- ALTER TABLE weekly_diagnostics_history ALTER COLUMN company_id DROP DEFAULT;
-- ALTER TABLE system_config ALTER COLUMN company_id DROP DEFAULT;
