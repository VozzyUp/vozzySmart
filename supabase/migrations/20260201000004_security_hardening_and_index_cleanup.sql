-- ============================================================================
-- Migration: Security hardening + index cleanup
-- ============================================================================
-- 1. REVOKE EXECUTE de anon/PUBLIC nas funções SECURITY DEFINER
--    → Apenas service_role pode chamá-las (app usa getSupabaseAdmin)
--    → Impede que alguém com a publishable key chame RPCs como postgres
--
-- 2. DROP de ~11 índices redundantes
--    → Índices simples cobertos por índices compostos ou UNIQUE constraints
--    → Menos índices = writes mais rápidos, menos storage
--
-- NOTA: analyze_table já tem os grants corretos (apenas service_role).
-- NOTA: Não mexemos em RLS policies — app é single-tenant e usa service_role.
-- ============================================================================

-- ============================================================================
-- PARTE 1: Proteger funções SECURITY DEFINER
-- ============================================================================
-- Padrão: REVOKE de todos, depois GRANT apenas para service_role.
-- service_role nunca perde acesso (é superuser-like), mas o GRANT explícito
-- documenta a intenção e garante que funciona mesmo se o comportamento mudar.

-- decrement_unread_count
REVOKE ALL ON FUNCTION public.decrement_unread_count(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.decrement_unread_count(uuid, integer) FROM anon;
REVOKE ALL ON FUNCTION public.decrement_unread_count(uuid, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_unread_count(uuid, integer) TO service_role;

-- get_agent_config
REVOKE ALL ON FUNCTION public.get_agent_config(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_agent_config(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.get_agent_config(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_agent_config(uuid) TO service_role;

-- get_campaign_contact_stats
REVOKE ALL ON FUNCTION public.get_campaign_contact_stats(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_campaign_contact_stats(text) FROM anon;
REVOKE ALL ON FUNCTION public.get_campaign_contact_stats(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_campaign_contact_stats(text) TO service_role;

-- get_campaigns_with_all_tags
REVOKE ALL ON FUNCTION public.get_campaigns_with_all_tags(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_campaigns_with_all_tags(uuid[]) FROM anon;
REVOKE ALL ON FUNCTION public.get_campaigns_with_all_tags(uuid[]) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_campaigns_with_all_tags(uuid[]) TO service_role;

-- get_contact_stats
REVOKE ALL ON FUNCTION public.get_contact_stats() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_contact_stats() FROM anon;
REVOKE ALL ON FUNCTION public.get_contact_stats() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_contact_stats() TO service_role;

-- get_contact_tags
REVOKE ALL ON FUNCTION public.get_contact_tags() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_contact_tags() FROM anon;
REVOKE ALL ON FUNCTION public.get_contact_tags() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_contact_tags() TO service_role;

-- get_dashboard_stats
REVOKE ALL ON FUNCTION public.get_dashboard_stats() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_dashboard_stats() FROM anon;
REVOKE ALL ON FUNCTION public.get_dashboard_stats() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats() TO service_role;

-- increment_campaign_stat (overload 1: text, text)
REVOKE ALL ON FUNCTION public.increment_campaign_stat(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_campaign_stat(text, text) FROM anon;
REVOKE ALL ON FUNCTION public.increment_campaign_stat(text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.increment_campaign_stat(text, text) TO service_role;

-- increment_campaign_stat (overload 2: uuid, text, integer)
REVOKE ALL ON FUNCTION public.increment_campaign_stat(uuid, text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_campaign_stat(uuid, text, integer) FROM anon;
REVOKE ALL ON FUNCTION public.increment_campaign_stat(uuid, text, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.increment_campaign_stat(uuid, text, integer) TO service_role;

-- increment_conversation_counters
REVOKE ALL ON FUNCTION public.increment_conversation_counters(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_conversation_counters(uuid, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.increment_conversation_counters(uuid, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.increment_conversation_counters(uuid, text, text) TO service_role;

-- process_inbound_message (a mais crítica — cria mensagens/conversas)
REVOKE ALL ON FUNCTION public.process_inbound_message(text, text, text, text, text, jsonb, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.process_inbound_message(text, text, text, text, text, jsonb, text) FROM anon;
REVOKE ALL ON FUNCTION public.process_inbound_message(text, text, text, text, text, jsonb, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.process_inbound_message(text, text, text, text, text, jsonb, text) TO service_role;

-- reset_unread_count
REVOKE ALL ON FUNCTION public.reset_unread_count(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reset_unread_count(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.reset_unread_count(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.reset_unread_count(uuid) TO service_role;

-- search_embeddings (overload 1: busca genérica)
REVOKE ALL ON FUNCTION public.search_embeddings(extensions.vector, double precision, integer, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.search_embeddings(extensions.vector, double precision, integer, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.search_embeddings(extensions.vector, double precision, integer, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.search_embeddings(extensions.vector, double precision, integer, uuid) TO service_role;

-- search_embeddings (overload 2: busca com agent filter)
REVOKE ALL ON FUNCTION public.search_embeddings(extensions.vector, uuid, integer, double precision, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.search_embeddings(extensions.vector, uuid, integer, double precision, integer) FROM anon;
REVOKE ALL ON FUNCTION public.search_embeddings(extensions.vector, uuid, integer, double precision, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.search_embeddings(extensions.vector, uuid, integer, double precision, integer) TO service_role;


-- ============================================================================
-- PARTE 2: Remover índices redundantes
-- ============================================================================
-- Cada índice abaixo é coberto por um índice composto ou UNIQUE constraint
-- que começa com a mesma coluna (leftmost prefix rule do B-tree).

-- account_alerts: dismissed é prefixo de (dismissed, created_at DESC)
DROP INDEX IF EXISTS public.idx_account_alerts_dismissed;

-- ai_embeddings: agent_id é prefixo de (agent_id, dimensions)
DROP INDEX IF EXISTS public.ai_embeddings_agent_id_idx;

-- campaign_contacts: campaign_id é prefixo de UNIQUE(campaign_id, contact_id)
-- e de (campaign_id, status), (campaign_id, phone), etc.
DROP INDEX IF EXISTS public.idx_campaign_contacts_campaign;

-- campaign_tag_assignments: campaign_id é prefixo da PK(campaign_id, tag_id)
DROP INDEX IF EXISTS public.idx_campaign_tag_assignments_campaign;

-- custom_field_definitions: entity_type é prefixo de UNIQUE(entity_type, key)
DROP INDEX IF EXISTS public.idx_custom_field_definitions_entity;

-- inbox_conversations: phone é prefixo de (phone, status) e do covering index
DROP INDEX IF EXISTS public.idx_inbox_conversations_phone;

-- inbox_messages: conversation_id é prefixo de (conversation_id, created_at DESC)
DROP INDEX IF EXISTS public.idx_inbox_messages_conversation_id;

-- templates: name é prefixo de UNIQUE(name, language)
DROP INDEX IF EXISTS public.idx_templates_name;

-- contacts: phone duplica o UNIQUE constraint contacts_phone_key
DROP INDEX IF EXISTS public.idx_contacts_phone;

-- attendant_tokens: token duplica o UNIQUE constraint attendant_tokens_token_key
DROP INDEX IF EXISTS public.idx_attendant_tokens_token;
