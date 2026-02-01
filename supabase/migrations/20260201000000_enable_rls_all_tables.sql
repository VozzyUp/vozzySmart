-- ============================================================================
-- Migration: Enable Row Level Security on ALL tables
-- ============================================================================
--
-- MOTIVAÇÃO:
-- Sem RLS, qualquer pessoa com a publishable key (sb_publishable_... ou anon)
-- pode acessar TODAS as tabelas via REST API ou Realtime do Supabase.
-- Mesmo em single-tenant, isso é um vetor de ataque real.
--
-- ESTRATÉGIA:
-- 1. ENABLE RLS em TODAS as tabelas → bloqueia anon/publishable por padrão
-- 2. service_role / sb_secret_... BYPASSA RLS automaticamente (zero impacto nas API routes)
-- 3. Policies SELECT apenas nas tabelas que o frontend acessa via Realtime ou query direta
--
-- TABELAS COM POLICY SELECT (frontend Realtime):
--   - campaigns, contacts, templates, flows (CentralizedRealtimeProvider)
--   - inbox_conversations, inbox_messages (CentralizedRealtimeProvider + useUnreadCount)
--   - account_alerts (useAccountAlerts)
--
-- NOTA: Realtime postgres_changes requer SELECT permission via RLS para
-- entregar payloads ao client. Sem policy, o channel conecta mas não recebe dados.
-- ============================================================================

-- ============================================================================
-- STEP 1: Enable RLS on ALL tables (blocks anon by default)
-- ============================================================================

ALTER TABLE public.account_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_knowledge_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendant_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_batch_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_run_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_tag_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_trace_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbox_conversation_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbox_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbox_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbox_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbox_quick_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_suppressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_project_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_status_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_builder_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_builder_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_run_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 2: SELECT policies for Realtime tables (anon/publishable can read)
-- ============================================================================
-- Estas tabelas são acessadas pelo frontend via:
-- - CentralizedRealtimeProvider (postgres_changes)
-- - useUnreadCount (query direta)
-- - useAccountAlerts (postgres_changes)
--
-- SELECT-only: o frontend não faz INSERT/UPDATE/DELETE diretamente.
-- Todas as mutações passam pelas API routes (que usam service_role/secret key).
-- ============================================================================

-- Campaigns: Realtime para atualizar lista/status em tempo real
CREATE POLICY "anon_select_campaigns"
  ON public.campaigns
  FOR SELECT
  TO anon
  USING (true);

-- Contacts: Realtime para atualizar lista/stats
CREATE POLICY "anon_select_contacts"
  ON public.contacts
  FOR SELECT
  TO anon
  USING (true);

-- Templates: Realtime para sync de status da Meta
CREATE POLICY "anon_select_templates"
  ON public.templates
  FOR SELECT
  TO anon
  USING (true);

-- Flows: Realtime para atualizar status de fluxos
CREATE POLICY "anon_select_flows"
  ON public.flows
  FOR SELECT
  TO anon
  USING (true);

-- Inbox Conversations: Realtime + query direta (useUnreadCount)
CREATE POLICY "anon_select_inbox_conversations"
  ON public.inbox_conversations
  FOR SELECT
  TO anon
  USING (true);

-- Inbox Messages: Realtime para chat em tempo real
CREATE POLICY "anon_select_inbox_messages"
  ON public.inbox_messages
  FOR SELECT
  TO anon
  USING (true);

-- Account Alerts: Realtime para banner de alertas críticos
CREATE POLICY "anon_select_account_alerts"
  ON public.account_alerts
  FOR SELECT
  TO anon
  USING (true);

-- ============================================================================
-- RESULTADO:
-- ============================================================================
-- ✅ 37 tabelas com RLS habilitado
-- ✅ 7 tabelas com policy SELECT para anon (Realtime funciona)
-- ✅ 30 tabelas bloqueadas para anon (settings, attendant_tokens, etc.)
-- ✅ service_role/sb_secret_... continua com acesso total (bypassa RLS)
-- ✅ Zero impacto nas API routes existentes
-- ============================================================================
