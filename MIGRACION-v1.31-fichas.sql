-- Ampliación compatible: no modifica datos, permisos ni usuarios existentes.
ALTER TABLE public.bolos ADD COLUMN IF NOT EXISTS readiness_options jsonb NOT NULL DEFAULT '{}'::jsonb;
