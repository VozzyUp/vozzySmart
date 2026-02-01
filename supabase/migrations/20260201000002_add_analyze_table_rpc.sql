-- ============================================================================
-- Migration: RPC function to run ANALYZE on specific tables
-- ============================================================================
-- Permite que API routes chamem ANALYZE via .rpc() após bulk inserts.
-- SECURITY DEFINER garante que roda com permissões do owner (postgres).
-- Whitelist de tabelas evita uso indevido.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.analyze_table(table_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Whitelist: apenas tabelas de alto volume onde bulk ops acontecem
  IF table_name NOT IN (
    'campaign_contacts',
    'contacts',
    'inbox_messages',
    'whatsapp_status_events'
  ) THEN
    RAISE EXCEPTION 'Table "%" is not in the allowed list for ANALYZE', table_name;
  END IF;

  EXECUTE format('ANALYZE %I', table_name);
END;
$$;

-- Apenas service_role/secret key pode chamar (não expõe para anon)
REVOKE ALL ON FUNCTION public.analyze_table(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.analyze_table(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.analyze_table(text) TO service_role;
