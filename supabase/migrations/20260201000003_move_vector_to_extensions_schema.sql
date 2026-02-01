-- ============================================================================
-- Migration: Move vector extension from public to extensions schema
-- ============================================================================
-- A extensão pgvector foi instalada no schema public por padrão.
-- Best practice do Supabase: extensões devem ficar no schema "extensions"
-- para não poluir o namespace público com operadores e tipos internos.
--
-- Estratégia segura:
--   1. Drop funções que dependem do tipo vector (search_embeddings)
--   2. Drop o índice HNSW (depende de public.vector_cosine_ops)
--   3. Converte coluna embedding para text (preserva dados)
--   4. Drop a extensão do schema public
--   5. Recria no schema extensions
--   6. Converte coluna de text de volta para extensions.vector(768)
--   7. Recria o índice HNSW com operator class do schema extensions
--   8. Recria as funções search_embeddings com tipo extensions.vector
-- ============================================================================

-- 1. Drop as duas overloads de search_embeddings (ambas assinaturas possíveis)
DROP FUNCTION IF EXISTS public.search_embeddings(public.vector, double precision, integer, uuid);
DROP FUNCTION IF EXISTS public.search_embeddings(public.vector, uuid, integer, double precision, integer);
DROP FUNCTION IF EXISTS public.search_embeddings(extensions.vector, double precision, integer, uuid);
DROP FUNCTION IF EXISTS public.search_embeddings(extensions.vector, uuid, integer, double precision, integer);

-- 2. Remove o índice HNSW que depende de public.vector_cosine_ops
DROP INDEX IF EXISTS public.ai_embeddings_embedding_idx;

-- 3. Converte coluna para text (preserva representação "[0.1, 0.2, ...]")
ALTER TABLE public.ai_embeddings
  ALTER COLUMN embedding TYPE text
  USING embedding::text;

-- 4. Agora podemos dropar a extensão sem dependências
DROP EXTENSION IF EXISTS vector;

-- 5. Recria no schema correto
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- 6. Restaura a coluna com o tipo vector do schema extensions
ALTER TABLE public.ai_embeddings
  ALTER COLUMN embedding TYPE extensions.vector(768)
  USING embedding::extensions.vector;

-- 7. Recria o índice HNSW com o operator class do schema extensions
CREATE INDEX ai_embeddings_embedding_idx
  ON public.ai_embeddings
  USING hnsw (embedding extensions.vector_cosine_ops);

-- 8. Recria as funções search_embeddings com tipo extensions.vector

-- Overload 1: busca genérica (threshold + agent_id opcional)
CREATE OR REPLACE FUNCTION public.search_embeddings(
  query_embedding extensions.vector,
  match_threshold double precision DEFAULT 0.7,
  match_count integer DEFAULT 5,
  p_agent_id uuid DEFAULT NULL::uuid
)
RETURNS TABLE(id uuid, content text, metadata jsonb, similarity double precision)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.content,
    e.metadata,
    1 - (e.embedding <=> query_embedding) as similarity
  FROM public.ai_embeddings e
  WHERE
    (p_agent_id IS NULL OR e.agent_id = p_agent_id)
    AND 1 - (e.embedding <=> query_embedding) > match_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Overload 2: busca com filtro de agent + dimensions
CREATE OR REPLACE FUNCTION public.search_embeddings(
  query_embedding extensions.vector,
  agent_id_filter uuid,
  expected_dimensions integer,
  match_threshold double precision DEFAULT 0.5,
  match_count integer DEFAULT 5
)
RETURNS TABLE(id uuid, content text, similarity double precision, metadata jsonb)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.content,
    (1 - (e.embedding <=> query_embedding))::FLOAT AS similarity,
    e.metadata
  FROM ai_embeddings e
  WHERE e.agent_id = agent_id_filter
    AND e.dimensions = expected_dimensions
    AND (1 - (e.embedding <=> query_embedding)) > match_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
