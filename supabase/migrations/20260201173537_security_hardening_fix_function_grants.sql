-- ================================================================
-- SECURITY HARDENING FIX — Revogar grants explícitos de anon/authenticated
-- em trigger functions e analyze_table.
-- A migration anterior removeu PUBLIC, mas anon/authenticated tinham
-- grants explícitos (criados pelo ALTER DEFAULT PRIVILEGES do Supabase).
-- ================================================================

-- Trigger functions: revogar de anon E authenticated
REVOKE EXECUTE ON FUNCTION public.ensure_default_ai_agent() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_attendant_tokens_updated_at() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_campaign_dispatch_metrics() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_campaign_folders_updated_at() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated;

-- analyze_table: revogar de authenticated (anon já não tinha)
REVOKE EXECUTE ON FUNCTION public.analyze_table(text) FROM authenticated;
