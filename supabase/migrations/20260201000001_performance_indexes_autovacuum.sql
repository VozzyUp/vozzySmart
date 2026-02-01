-- ============================================================================
-- Migration: Performance indexes + autovacuum tuning
-- ============================================================================
--
-- CONTEXTO:
-- Análise contra Postgres Best Practices identificou oportunidades de
-- performance em 3 áreas: composite indexes, autovacuum tuning e partial
-- indexes para hot paths.
--
-- MUDANÇAS:
-- 1. Composite index inbox_messages(conversation_id, created_at) — chat pagination
-- 2. Composite index campaign_contacts(campaign_id, status) — campaign detail view
-- 3. Partial index campaigns WHERE status IN ('Enviando','Agendado') — active campaigns
-- 4. Autovacuum tuning para tabelas de alto volume
-- ============================================================================

-- ============================================================================
-- STEP 1: Composite indexes para multi-column queries
-- ============================================================================

-- inbox_messages: O hot path do chat faz:
--   SELECT * FROM inbox_messages WHERE conversation_id = $1 ORDER BY created_at DESC
-- Sem composite, Postgres combina dois índices separados via Bitmap Scan.
-- Com composite, é um único Index Scan direto (5-10x mais rápido).
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inbox_messages_conversation_created
  ON public.inbox_messages (conversation_id, created_at DESC);

-- campaign_contacts: A tela de detalhes da campanha filtra por status:
--   SELECT * FROM campaign_contacts WHERE campaign_id = $1 AND status = $2
-- O índice existente em (campaign_id) obriga um filter step no status.
-- Composite evita o filter, especialmente com centenas de milhares de contacts.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaign_contacts_campaign_status
  ON public.campaign_contacts (campaign_id, status);

-- ============================================================================
-- STEP 2: Partial index para hot path de campanhas ativas
-- ============================================================================

-- campaigns: Dashboard e polling verificam campanhas ativas frequentemente:
--   SELECT * FROM campaigns WHERE status IN ('Enviando', 'Agendado')
-- O índice full em status inclui Rascunho/Concluído/Pausado (maioria dos rows).
-- Partial index é menor e mais rápido para o hot path.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaigns_active
  ON public.campaigns (status, scheduled_date)
  WHERE status IN ('Enviando', 'Agendado');

-- ============================================================================
-- STEP 3: Autovacuum tuning para tabelas de alto volume
-- ============================================================================
--
-- Defaults do Postgres:
--   autovacuum_vacuum_scale_factor = 0.20 (vacuum quando 20% dead tuples)
--   autovacuum_analyze_scale_factor = 0.10 (analyze quando 10% mudanças)
--
-- Para tabelas com muitas writes (campaign dispatch, inbox, status events),
-- esses thresholds são altos demais — queremos vacuum/analyze mais frequentes
-- para manter estatísticas frescas e evitar bloat.
--
-- Referência: https://supabase.com/docs/guides/database/database-size#vacuum-operations

-- campaign_contacts: alto volume durante envios (milhares de INSERTs + UPDATEs)
ALTER TABLE public.campaign_contacts SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02,
  autovacuum_vacuum_cost_delay = 2
);

-- inbox_messages: cresce constantemente com mensagens inbound/outbound
ALTER TABLE public.inbox_messages SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02,
  autovacuum_vacuum_cost_delay = 2
);

-- inbox_conversations: atualizações frequentes (contadores, status, last_message_at)
ALTER TABLE public.inbox_conversations SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02,
  autovacuum_vacuum_cost_delay = 2
);

-- whatsapp_status_events: alto volume de INSERTs + UPDATEs (apply_state changes)
ALTER TABLE public.whatsapp_status_events SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02,
  autovacuum_vacuum_cost_delay = 2
);

-- campaigns: UPDATEs frequentes nos contadores (sent, delivered, read, failed)
ALTER TABLE public.campaigns SET (
  autovacuum_vacuum_scale_factor = 0.10,
  autovacuum_analyze_scale_factor = 0.05
);

-- ============================================================================
-- RESULTADO ESPERADO:
-- ============================================================================
-- ✅ Chat pagination: 5-10x mais rápido (composite index)
-- ✅ Campaign detail: filter step eliminado
-- ✅ Active campaigns: partial index menor e mais rápido
-- ✅ Autovacuum: vacuum a 5% dead tuples (vs 20%), analyze a 2% (vs 10%)
-- ✅ Estatísticas do query planner sempre frescas
-- ============================================================================
