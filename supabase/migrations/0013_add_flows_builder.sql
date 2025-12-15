-- =============================================================================
-- SmartZap - Flow Builder (drafts)
--
-- Catálogo e rascunhos do editor visual (canvas) para WhatsApp Flows.
-- O Flow (telas/campos) ainda é criado na Meta; aqui guardamos o “modelo visual”
-- para orquestrar envio, mapeamento e acompanhamento.
--
-- Updated: 2025-12-15
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS flows (
  id TEXT PRIMARY KEY DEFAULT concat('fl_', replace(uuid_generate_v4()::text, '-', '')::text),

  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT',

  -- ID do Flow na Meta (opcional no draft)
  meta_flow_id TEXT,

  -- Spec do editor (nodes/edges/viewport/metadata)
  spec JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_flows_created_at ON flows(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_flows_status ON flows(status);
CREATE INDEX IF NOT EXISTS idx_flows_meta_flow_id ON flows(meta_flow_id);

-- Força o PostgREST (Supabase API) a recarregar o schema.
-- Útil quando a API ainda não "enxerga" tabelas recém-criadas (schema cache).
NOTIFY pgrst, 'reload schema';
