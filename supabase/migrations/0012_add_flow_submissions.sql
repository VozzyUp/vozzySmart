-- =============================================================================
-- SmartZap - Flow submissions (WhatsApp Flows MVP sem endpoint)
--
-- Armazena respostas de Flows recebidas via webhook:
-- message.interactive.type = 'nfm_reply'
-- message.interactive.nfm_reply.response_json (string JSON)
--
-- Updated: 2025-12-15
-- =============================================================================

-- Requer uuid-ossp (já habilitado no schema inicial). Mantemos aqui como safety.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS flow_submissions (
  id TEXT PRIMARY KEY DEFAULT concat('fs_', replace(uuid_generate_v4()::text, '-', '')::text),

  -- Identificador único da mensagem inbound (idempotência do webhook)
  message_id TEXT NOT NULL UNIQUE,

  -- Quem respondeu ao Flow
  from_phone TEXT NOT NULL,
  contact_id TEXT REFERENCES contacts(id) ON DELETE SET NULL,

  -- Metadados do Flow (quando disponíveis)
  flow_id TEXT,
  flow_name TEXT,
  flow_token TEXT,

  -- Payload do Flow
  response_json_raw TEXT NOT NULL,
  response_json JSONB,

  -- Contexto do webhook
  waba_id TEXT,
  phone_number_id TEXT,
  message_timestamp TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flow_submissions_from_phone ON flow_submissions(from_phone);
CREATE INDEX IF NOT EXISTS idx_flow_submissions_contact_id ON flow_submissions(contact_id);
CREATE INDEX IF NOT EXISTS idx_flow_submissions_flow_id ON flow_submissions(flow_id);
CREATE INDEX IF NOT EXISTS idx_flow_submissions_created_at ON flow_submissions(created_at DESC);

-- Força o PostgREST (Supabase API) a recarregar o schema.
-- Útil quando a API ainda não "enxerga" tabelas recém-criadas (schema cache).
NOTIFY pgrst, 'reload schema';
