-- =============================================================================
-- WhatsApp webhook status events (durable inbox)
-- Goal: never lose delivered/read/failed events even if DB correlation fails
-- or webhook processing errors happen.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.whatsapp_status_events (
  id TEXT PRIMARY KEY DEFAULT concat('wse_', replace(uuid_generate_v4()::text, '-', '')::text),

  -- Correlation
  message_id TEXT NOT NULL,
  status TEXT NOT NULL,

  -- Meta timestamps (best-effort)
  event_ts TIMESTAMPTZ,
  event_ts_raw TEXT,

  -- Dedupe key to guarantee idempotency even when event_ts is null
  dedupe_key TEXT NOT NULL,

  -- Optional extra fields from webhook
  recipient_id TEXT,
  errors JSONB,

  -- Raw payload subset for forensics (avoid huge bodies)
  payload JSONB,

  -- Processing state
  apply_state TEXT NOT NULL DEFAULT 'pending', -- pending | applied | unmatched | error
  applied BOOLEAN NOT NULL DEFAULT false,
  applied_at TIMESTAMPTZ,
  apply_error TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,

  -- Links when applied
  campaign_contact_id TEXT REFERENCES public.campaign_contacts(id) ON DELETE SET NULL,
  campaign_id TEXT REFERENCES public.campaigns(id) ON DELETE SET NULL,

  -- Bookkeeping
  first_received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique dedupe to make retries safe
CREATE UNIQUE INDEX IF NOT EXISTS ux_whatsapp_status_events_dedupe_key
  ON public.whatsapp_status_events (dedupe_key);

-- Lookup by message_id is the hot path
CREATE INDEX IF NOT EXISTS idx_whatsapp_status_events_message_id
  ON public.whatsapp_status_events (message_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_status_events_apply_state
  ON public.whatsapp_status_events (apply_state);

CREATE INDEX IF NOT EXISTS idx_whatsapp_status_events_last_received_at
  ON public.whatsapp_status_events (last_received_at DESC);
