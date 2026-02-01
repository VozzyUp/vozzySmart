-- ================================================================
-- SECURITY HARDENING — SmartZap (smartzap-fresh-test)
-- Auditoria completa em 2026-02-01
-- ================================================================
-- Corrige:
--   P0 #1: REVOKE full privileges de anon/authenticated em 31 tabelas
--   P0 #2: Remover INSERT/UPDATE/DELETE de anon/authenticated nas 7 tabelas com policies
--   P0 #3: Revogar grants em sequences
--   P1 #1: REVOKE PUBLIC execute em 5 trigger functions
--   P1 #2: Restringir analyze_table a service_role only
--   P2:    Corrigir default privileges (current role)
-- ================================================================

BEGIN;

-- ================================================================
-- SEÇÃO 1: [P0] REVOKE ALL nas 31 tabelas SEM policies
-- ================================================================

REVOKE ALL ON TABLE public.ai_agents FROM anon, authenticated;
REVOKE ALL ON TABLE public.ai_agent_logs FROM anon, authenticated;
REVOKE ALL ON TABLE public.ai_embeddings FROM anon, authenticated;
REVOKE ALL ON TABLE public.ai_knowledge_files FROM anon, authenticated;
REVOKE ALL ON TABLE public.attendant_tokens FROM anon, authenticated;
REVOKE ALL ON TABLE public.settings FROM anon, authenticated;
REVOKE ALL ON TABLE public.campaign_batch_metrics FROM anon, authenticated;
REVOKE ALL ON TABLE public.campaign_contacts FROM anon, authenticated;
REVOKE ALL ON TABLE public.campaign_folders FROM anon, authenticated;
REVOKE ALL ON TABLE public.campaign_run_metrics FROM anon, authenticated;
REVOKE ALL ON TABLE public.campaign_tag_assignments FROM anon, authenticated;
REVOKE ALL ON TABLE public.campaign_tags FROM anon, authenticated;
REVOKE ALL ON TABLE public.campaign_trace_events FROM anon, authenticated;
REVOKE ALL ON TABLE public.custom_field_definitions FROM anon, authenticated;
REVOKE ALL ON TABLE public.flow_submissions FROM anon, authenticated;
REVOKE ALL ON TABLE public.inbox_conversation_labels FROM anon, authenticated;
REVOKE ALL ON TABLE public.inbox_labels FROM anon, authenticated;
REVOKE ALL ON TABLE public.inbox_quick_replies FROM anon, authenticated;
REVOKE ALL ON TABLE public.lead_forms FROM anon, authenticated;
REVOKE ALL ON TABLE public.phone_suppressions FROM anon, authenticated;
REVOKE ALL ON TABLE public.push_subscriptions FROM anon, authenticated;
REVOKE ALL ON TABLE public.template_project_items FROM anon, authenticated;
REVOKE ALL ON TABLE public.template_projects FROM anon, authenticated;
REVOKE ALL ON TABLE public.whatsapp_status_events FROM anon, authenticated;
REVOKE ALL ON TABLE public.workflow_builder_executions FROM anon, authenticated;
REVOKE ALL ON TABLE public.workflow_builder_logs FROM anon, authenticated;
REVOKE ALL ON TABLE public.workflow_conversations FROM anon, authenticated;
REVOKE ALL ON TABLE public.workflow_run_logs FROM anon, authenticated;
REVOKE ALL ON TABLE public.workflow_runs FROM anon, authenticated;
REVOKE ALL ON TABLE public.workflow_versions FROM anon, authenticated;
REVOKE ALL ON TABLE public.workflows FROM anon, authenticated;

-- View
REVOKE ALL ON TABLE public.campaign_stats_summary FROM anon, authenticated;


-- ================================================================
-- SEÇÃO 2: [P0] Nas 7 tabelas com anon SELECT policy,
-- remover tudo exceto SELECT.
-- ================================================================

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.account_alerts FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.campaigns FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.contacts FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.flows FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.inbox_conversations FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.inbox_messages FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.templates FROM anon, authenticated;


-- ================================================================
-- SEÇÃO 3: [P1] REVOKE PUBLIC execute em trigger functions
-- ================================================================

REVOKE ALL ON FUNCTION public.ensure_default_ai_agent() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_default_ai_agent() TO service_role;

REVOKE ALL ON FUNCTION public.update_attendant_tokens_updated_at() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_attendant_tokens_updated_at() TO service_role;

REVOKE ALL ON FUNCTION public.update_campaign_dispatch_metrics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_campaign_dispatch_metrics() TO service_role;

REVOKE ALL ON FUNCTION public.update_campaign_folders_updated_at() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_campaign_folders_updated_at() TO service_role;

REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO service_role;


-- ================================================================
-- SEÇÃO 4: [P1] Restringir analyze_table a service_role only
-- ================================================================

REVOKE ALL ON FUNCTION public.analyze_table(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.analyze_table(text) TO service_role;


-- ================================================================
-- SEÇÃO 5: [P0] Revogar grants em sequences existentes
-- ================================================================

REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;


-- ================================================================
-- SEÇÃO 6: [P2] Corrigir default privileges (current role only)
-- Previne que novas tabelas/funções/sequences auto-concedam a anon.
-- ================================================================

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON TABLES FROM authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM authenticated;

COMMIT;
