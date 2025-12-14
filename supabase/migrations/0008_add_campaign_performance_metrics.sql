-- Campaign performance metrics (baseline + evolução)
--
-- Objetivo:
-- - Persistir métricas de disparo por batch (latência Meta/DB, contagens, config usada)
-- - Persistir uma “execução” (run) por campanha/traceId para comparar configurações ao longo do tempo

-- ============================================================================
-- BATCH METRICS
-- ============================================================================

create table if not exists public.campaign_batch_metrics (
  id uuid primary key default gen_random_uuid(),
  campaign_id text not null,
  trace_id text not null,
  batch_index integer not null,

  -- Config efetivamente usada no runtime
  configured_batch_size integer null,
  batch_size integer not null,
  concurrency integer not null,
  adaptive_enabled boolean not null default false,
  target_mps integer null,
  floor_delay_ms integer null,

  -- Contagens
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  skipped_count integer not null default 0,
  meta_requests integer not null default 0,

  -- Tempos acumulados dentro do batch
  meta_time_ms integer not null default 0,
  db_time_ms integer not null default 0,

  -- Sinais
  saw_throughput_429 boolean not null default false,
  batch_ok boolean not null default true,
  error text null,

  created_at timestamptz not null default now()
);

create index if not exists campaign_batch_metrics_campaign_idx
  on public.campaign_batch_metrics (campaign_id, created_at desc);

create index if not exists campaign_batch_metrics_trace_idx
  on public.campaign_batch_metrics (trace_id, batch_index);

-- ============================================================================
-- RUN METRICS
-- ============================================================================

create table if not exists public.campaign_run_metrics (
  id uuid primary key default gen_random_uuid(),
  campaign_id text not null,
  trace_id text not null,

  template_name text null,
  recipients integer null,

  -- Contagens finais (snapshot)
  sent_total integer null,
  failed_total integer null,
  skipped_total integer null,

  -- Duração (sent-only) e throughput
  first_dispatch_at timestamptz null,
  last_sent_at timestamptz null,
  dispatch_duration_ms integer null,
  throughput_mps numeric null,

  -- Médias agregadas a partir de batches
  meta_avg_ms numeric null,
  db_avg_ms numeric null,
  saw_throughput_429 boolean not null default false,

  -- Config usada (para comparar presets)
  config jsonb null,
  config_hash text null,

  created_at timestamptz not null default now(),

  unique (campaign_id, trace_id)
);

create index if not exists campaign_run_metrics_created_idx
  on public.campaign_run_metrics (created_at desc);

create index if not exists campaign_run_metrics_campaign_idx
  on public.campaign_run_metrics (campaign_id, created_at desc);

create index if not exists campaign_run_metrics_config_hash_idx
  on public.campaign_run_metrics (config_hash, created_at desc);
