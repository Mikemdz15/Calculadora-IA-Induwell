ALTER TABLE partidas_negociacion ADD COLUMN currency text DEFAULT 'MXN';
ALTER TABLE partidas_negociacion ADD COLUMN exchange_rate numeric DEFAULT 1;
