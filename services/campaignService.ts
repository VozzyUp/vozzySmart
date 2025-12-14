import { Campaign, CampaignStatus, Message, MessageStatus } from '../types';
import type { MissingParamDetail } from '../lib/whatsapp/template-contract';

interface CreateCampaignInput {
  name: string;
  templateName: string;
  recipients: number;
  selectedContacts?: { name: string; phone: string; custom_fields?: Record<string, unknown> }[];
  selectedContactIds?: string[];  // For resume functionality
  scheduledAt?: string;           // ISO timestamp for scheduling
  templateVariables?: { header: string[], body: string[], buttons?: Record<string, string> };   // Meta API structure
}

interface RealMessageStatus {
  phone: string;
  status: 'sent' | 'failed';
  messageId?: string;
  error?: string;
  timestamp?: string;
  sentAt?: string; // Alternativo ao timestamp
  webhookStatus?: 'delivered' | 'read' | 'failed'; // From Meta webhook
  webhookTimestamp?: string;
}

// Helper para extrair timestamp de forma segura
function getTimestamp(msg: RealMessageStatus): string {
  const ts = msg.timestamp || msg.sentAt;
  if (!ts) return '-';
  try {
    return new Date(ts).toLocaleString('pt-BR');
  } catch {
    return '-';
  }
}

interface CampaignStatusResponse {
  campaignId: string;
  stats: {
    sent: number;
    delivered: number;
    read: number;
    skipped?: number;
    failed: number;
    total: number;
  };
  messages: RealMessageStatus[];
}

interface PrecheckContactInput {
  id?: string;
  contactId?: string;
  contact_id?: string;
  name?: string;
  phone: string;
  email?: string | null;
  custom_fields?: Record<string, unknown>;
}

export interface CampaignPrecheckResult {
  ok: true;
  templateName: string;
  totals: { total: number; valid: number; skipped: number };
  results: Array<
    | { ok: true; contactId?: string; name: string; phone: string; normalizedPhone: string }
    | {
        ok: false;
        contactId?: string;
        name: string;
        phone: string;
        normalizedPhone?: string;
        skipCode: string;
        reason: string;
        missing?: MissingParamDetail[];
      }
  >;
}

export const campaignService = {
  getAll: async (): Promise<Campaign[]> => {
    // Fetch from real API
    const response = await fetch('/api/campaigns');
    if (!response.ok) {
      console.error('Failed to fetch campaigns:', response.statusText);
      return [];
    }
    return response.json();
  },

  getById: async (id: string): Promise<Campaign | undefined> => {
    // Fetch from Database (SOURCE OF TRUTH for persisted data)
    const response = await fetch(`/api/campaigns/${id}`);
    if (!response.ok) {
      if (response.status === 404) return undefined;
      console.error('Failed to fetch campaign:', response.statusText);
      return undefined;
    }

    const campaign = await response.json();

    // Estratégia: usar status em tempo real (via API) enquanto a campanha está ativa.
    // Quando concluir, o banco é a fonte da verdade.
    const isActive = campaign.status === 'Enviando' || campaign.status === 'Agendado';

    if (isActive) {
      // Tenta buscar stats em tempo real (melhor UX durante envio)
      try {
        const statusResponse = await fetch(`/api/campaign/${id}/status`);
        if (statusResponse.ok) {
          const realStatus: CampaignStatusResponse = await statusResponse.json();
          // Só sobrescreve se vierem dados úteis (evita "voltar" para 0)
          if (realStatus.stats.sent > 0 || realStatus.stats.failed > 0) {
            return {
              ...campaign,
              sent: realStatus.stats.sent,
              delivered: realStatus.stats.delivered,
              read: realStatus.stats.read,
              failed: realStatus.stats.failed,
            };
          }
        }
      } catch (e) {
        console.warn('Falha ao buscar stats em tempo real; usando banco:', e);
      }
    }

    // Para campanhas concluídas (ou se status em tempo real falhar), use o banco (fonte da verdade)
    return campaign;
  },

  getMetrics: async (id: string): Promise<any | null> => {
    try {
      const response = await fetch(`/api/campaigns/${id}/metrics`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      })
      if (!response.ok) return null
      return response.json()
    } catch {
      return null
    }
  },

  // INSTANT: Get pending messages - returns empty array (real data comes from getMessages)
  getPendingMessages: (_id: string): Message[] => {
    // During creation, messages are pending. After dispatch, use getMessages() for real status.
    return [];
  },

  // ASYNC: Get real message status from campaign_contacts table (paginated)
  getMessages: async (id: string, options?: { limit?: number; offset?: number; status?: string }): Promise<{
    messages: Message[];
    stats: { total: number; pending: number; sent: number; delivered: number; read: number; skipped: number; failed: number };
    pagination: { limit: number; offset: number; total: number; hasMore: boolean };
  }> => {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));
    if (options?.status) params.set('status', options.status);

    const url = `/api/campaigns/${id}/messages${params.toString() ? `?${params}` : ''}`;
    const response = await fetch(url);
    if (!response.ok) {
      console.error('Failed to fetch messages:', response.statusText);
      return { messages: [], stats: { total: 0, pending: 0, sent: 0, delivered: 0, read: 0, skipped: 0, failed: 0 }, pagination: { limit: 50, offset: 0, total: 0, hasMore: false } };
    }
    return response.json();
  },

  // Busca status em tempo real
  getRealStatus: async (id: string): Promise<CampaignStatusResponse | null> => {
    try {
      const response = await fetch(`/api/campaign/${id}/status`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Failed to fetch real status:', error);
    }
    return null;
  },

  create: async (input: CreateCampaignInput): Promise<Campaign> => {
    const { name, templateName, recipients, selectedContacts, selectedContactIds, scheduledAt, templateVariables } = input;

    // 1. Create campaign in Database (source of truth) with contacts
    const response = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        templateName,
        recipients,
        scheduledAt,
        selectedContactIds,
        contacts: selectedContacts, // Pass contacts to be saved in campaign_contacts
        templateVariables, // Pass template variables to be saved in database
        status: scheduledAt ? CampaignStatus.SCHEDULED : CampaignStatus.SENDING,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create campaign');
    }

    const newCampaign = await response.json();

    // 2. If scheduled for later, don't dispatch now
    if (scheduledAt) {
      console.log(`Campaign ${newCampaign.id} scheduled for ${scheduledAt}`);
      return newCampaign;
    }

    // 3. Dispatch to Backend immediately (Execution)
    if (selectedContacts && selectedContacts.length > 0) {
      await campaignService.dispatchToBackend(newCampaign.id, templateName, selectedContacts, templateVariables);
    }

    return newCampaign;
  },

  // Dry-run: valida contatos/variáveis SEM criar campanha e SEM persistir.
  precheck: async (input: { templateName: string; contacts: PrecheckContactInput[]; templateVariables?: { header: string[], body: string[], buttons?: Record<string, string> } }): Promise<CampaignPrecheckResult> => {
    const response = await fetch('/api/campaign/precheck', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateName: input.templateName,
        contacts: input.contacts,
        templateVariables: input.templateVariables,
      }),
    })

    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(payload?.error || 'Falha ao validar destinatários')
    }
    return payload as CampaignPrecheckResult
  },

  // Internal: dispatch campaign to backend queue
  dispatchToBackend: async (campaignId: string, templateName: string, contacts?: { id?: string; contactId?: string; name: string; phone: string; email?: string | null; custom_fields?: Record<string, unknown> }[], templateVariables?: { header: string[], body: string[], buttons?: Record<string, string> }): Promise<boolean> => {
    try {
      // Allow omitting contacts: backend will load from campaign_contacts (preferred for scheduled/clone/start).
      // When provided, contacts must include contactId to satisfy dispatch hardening.

      // Não envie credenciais do frontend: servidor busca credenciais salvas (Supabase/env)
      const response = await fetch('/api/campaign/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          templateName,
          ...(contacts && contacts.length > 0 ? { contacts } : {}),
          templateVariables, // Pass template variables to workflow
          // whatsappCredentials buscadas no servidor (Supabase/env)
        })
      });

      if (!response.ok) {
        console.error('Dispatch failed:', await response.text());
        return false;
      }
      return true;
    } catch (error) {
      console.error('Failed to dispatch campaign to backend:', error);
      return false;
    }
  },

  // Re-enqueue only skipped contacts after revalidation
  resendSkipped: async (campaignId: string): Promise<{ status: string; resent: number; stillSkipped: number; message?: string }> => {
    const response = await fetch(`/api/campaigns/${campaignId}/resend-skipped`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      const base = payload?.error || 'Falha ao reenviar ignorados'
      const details = payload?.details ? String(payload.details) : ''
      throw new Error(details ? `${base}: ${details}` : base)
    }
    return payload
  },

  delete: async (id: string): Promise<void> => {
    const response = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      throw new Error('Failed to delete campaign');
    }
  },

  duplicate: async (id: string): Promise<Campaign> => {
    const response = await fetch(`/api/campaigns/${id}/duplicate`, { method: 'POST' });
    if (!response.ok) {
      throw new Error('Failed to duplicate campaign');
    }
    return response.json();
  },

  // Pause a running campaign
  pause: async (id: string): Promise<Campaign | undefined> => {
    // Update Database first (source of truth)
    const updateResponse = await fetch(`/api/campaigns/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: CampaignStatus.PAUSED,
        pausedAt: new Date().toISOString(),
      }),
    });

    if (!updateResponse.ok) {
      console.error('Failed to pause campaign in Database');
      return undefined;
    }

    const campaign = await updateResponse.json();

    // Notify backend to pause queue processing
    try {
      await fetch(`/api/campaign/${id}/pause`, { method: 'POST' });
    } catch (error) {
      console.error('Failed to pause campaign on backend:', error);
    }

    return campaign;
  },

  // Resume a paused campaign
  resume: async (id: string): Promise<Campaign | undefined> => {
    // Get campaign from Database
    const campaign = await campaignService.getById(id);
    if (!campaign) return undefined;

    // Update status in Database
    const updateResponse = await fetch(`/api/campaigns/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: CampaignStatus.SENDING,
        pausedAt: null,
      }),
    });

    if (!updateResponse.ok) {
      console.error('Failed to resume campaign in Database');
      return undefined;
    }

    const updatedCampaign = await updateResponse.json();

    // Notify backend to resume processing
    try {
      await fetch(`/api/campaign/${id}/resume`, { method: 'POST' });
    } catch (error) {
      console.error('Failed to resume campaign on backend:', error);
    }

    return updatedCampaign;
  },

  // Start a scheduled or draft campaign immediately
  start: async (id: string): Promise<Campaign | undefined> => {
    console.log('🚀 Starting campaign:', { id });

    // Get campaign from Database first to get templateVariables and templateName
    const campaignData = await campaignService.getById(id);
    if (!campaignData) {
      console.error('❌ Campaign not found!');
      return undefined;
    }

    // Prefer backend to load recipients snapshot from campaign_contacts.
    // This avoids losing custom_fields when starting scheduled/duplicated campaigns.
    const success = await campaignService.dispatchToBackend(
      id,
      campaignData.templateName,
      undefined,
      campaignData.templateVariables as { header: string[], body: string[], buttons?: Record<string, string> } | undefined
    );

    if (!success) {
      console.error('❌ Failed to dispatch campaign to backend.');
      return undefined;
    }

    // Clear scheduledAt once dispatch is queued (workflow will set status/startedAt).
    const updateResponse = await fetch(`/api/campaigns/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scheduledAt: null,
        qstashScheduleMessageId: null,
        qstashScheduleEnqueuedAt: null,
      }),
    });

    if (!updateResponse.ok) {
      console.warn('Failed to clear scheduled fields after dispatch');
    }

    return campaignService.getById(id);
  },

  // Cancel a scheduled campaign (QStash one-shot)
  cancelSchedule: async (id: string): Promise<{ ok: boolean; campaign?: Campaign | null; error?: string }> => {
    const response = await fetch(`/api/campaigns/${id}/cancel-schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      return { ok: false, error: payload?.error || 'Falha ao cancelar agendamento' }
    }

    return { ok: true, campaign: payload?.campaign ?? null }
  },

  // Update campaign stats from real-time polling
  updateStats: async (id: string): Promise<Campaign | undefined> => {
    const realStatus = await campaignService.getRealStatus(id);

    if (realStatus && realStatus.stats.total > 0) {
      // Get campaign from Database
      const campaign = await campaignService.getById(id);
      if (!campaign) return undefined;

      const isComplete = realStatus.stats.sent + realStatus.stats.failed >= campaign.recipients;

      // Update in Database
      const response = await fetch(`/api/campaigns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sent: realStatus.stats.sent,
          delivered: realStatus.stats.delivered,
          read: realStatus.stats.read,
          failed: realStatus.stats.failed,
          status: isComplete ? CampaignStatus.COMPLETED : campaign.status,
          completedAt: isComplete ? new Date().toISOString() : undefined,
        }),
      });

      if (!response.ok) {
        console.error('Failed to update campaign stats');
        return campaign;
      }

      return response.json();
    }

    return campaignService.getById(id);
  }
};
