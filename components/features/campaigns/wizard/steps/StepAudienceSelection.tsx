'use client';

import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Check,
  FlaskConical,
  Link as LinkIcon,
  Search,
  ShieldAlert,
  Smartphone,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { Contact, ContactStatus, TestContact, Template, CustomFieldDefinition } from '@/types';
import { getPricingBreakdown } from '@/lib/whatsapp-pricing';
import { AudienceDraft } from '@/hooks/campaigns/useCampaignWizardUI';
import { CampaignValidation } from '@/lib/meta-limits';

// Inline CheckCircleFilled component (same as parent)
const CheckCircleFilled = ({ size }: { size: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm-1.25 17.292l-4.5-4.364 1.857-1.858 2.643 2.506 5.643-5.784 1.857 1.857-7.5 7.643z" />
  </svg>
);

// Types for audience criteria
export interface AudienceCriteria {
  status: 'OPT_IN' | 'OPT_OUT' | 'UNKNOWN' | 'ALL';
  includeTag?: string | null;
  createdWithinDays?: number | null;
  excludeOptOut?: boolean;
  noTags?: boolean;
  uf?: string | null;
  ddi?: string | null;
  customFieldKey?: string | null;
  customFieldMode?: 'exists' | 'equals' | null;
  customFieldValue?: string | null;
}

export type AudiencePreset =
  | 'opt_in'
  | 'new_7d'
  | 'tag_top'
  | 'no_tags'
  | 'manual'
  | 'all'
  | 'test'
  | null;

export interface AudienceStats {
  eligible: number;
  optInEligible: number;
  suppressed: number;
  topTagEligible: number;
  noTagsEligible: number;
  brUfCounts?: Array<{ uf: string; count: number }>;
  tagCountsEligible?: Array<{ tag: string; count: number }>;
  ddiCountsEligible?: Array<{ ddi: string; count: number }>;
  customFieldCountsEligible?: Array<{ key: string; count: number }>;
}

export interface StepAudienceSelectionProps {
  // Recipient source state
  recipientSource: 'all' | 'specific' | 'test' | null;
  setRecipientSource: (source: 'all' | 'specific' | 'test' | null) => void;

  // Contact data
  totalContacts: number;
  recipientCount: number;
  allContacts: Contact[];
  filteredContacts: Contact[];
  selectedContacts: Contact[];
  selectedContactIds: string[];

  // Contact search
  contactSearchTerm: string;
  setContactSearchTerm: (term: string) => void;

  // Contact selection
  toggleContact: (contactId: string) => void;

  // Test contact
  testContact?: TestContact;

  // Template & pricing
  selectedTemplate?: Template;
  exchangeRate?: number | null;

  // Audience mode (Jobs/Ive)
  isJobsAudienceMode: boolean;
  audiencePreset?: AudiencePreset;
  audienceCriteria?: AudienceCriteria;
  audienceStats?: AudienceStats;
  topTag?: string | null;

  // Audience actions
  selectAudiencePreset?: (preset: NonNullable<AudiencePreset>) => void;
  applyAudienceCriteria?: (criteria: AudienceCriteria, preset?: NonNullable<AudiencePreset>) => void;

  // Limits
  currentLimit: number;
  isOverLimit?: boolean;

  // UI State from hook
  isAudienceRefineOpen: boolean;
  setIsAudienceRefineOpen: (open: boolean) => void;
  isSegmentsSheetOpen: boolean;
  setIsSegmentsSheetOpen: (open: boolean) => void;
  segmentTagDraft: string;
  setSegmentTagDraft: (value: string) => void;
  segmentDdiDraft: string;
  setSegmentDdiDraft: (value: string) => void;
  segmentCustomFieldKeyDraft: string;
  setSegmentCustomFieldKeyDraft: (value: string) => void;
  segmentCustomFieldModeDraft: 'exists' | 'equals';
  setSegmentCustomFieldModeDraft: (value: 'exists' | 'equals') => void;
  segmentCustomFieldValueDraft: string;
  setSegmentCustomFieldValueDraft: (value: string) => void;
  segmentOneContactDraft: string;
  setSegmentOneContactDraft: (value: string) => void;
  audienceDraft: AudienceDraft;
  setAudienceDraft: (value: AudienceDraft | ((prev: AudienceDraft) => AudienceDraft)) => void;

  // Custom fields
  customFields: CustomFieldDefinition[];

  // Live validation
  liveValidation?: CampaignValidation | null;

  // Upgrade modal
  setShowUpgradeModal: (open: boolean) => void;
}

export function StepAudienceSelection({
  recipientSource,
  setRecipientSource,
  totalContacts,
  recipientCount,
  allContacts,
  filteredContacts,
  selectedContacts,
  selectedContactIds,
  contactSearchTerm,
  setContactSearchTerm,
  toggleContact,
  testContact,
  selectedTemplate,
  exchangeRate,
  isJobsAudienceMode,
  audiencePreset,
  audienceCriteria,
  audienceStats,
  selectAudiencePreset,
  applyAudienceCriteria,
  currentLimit,
  isOverLimit,
  isAudienceRefineOpen,
  setIsAudienceRefineOpen,
  isSegmentsSheetOpen,
  setIsSegmentsSheetOpen,
  segmentTagDraft,
  setSegmentTagDraft,
  segmentDdiDraft,
  setSegmentDdiDraft,
  segmentCustomFieldKeyDraft,
  setSegmentCustomFieldKeyDraft,
  segmentCustomFieldModeDraft,
  setSegmentCustomFieldModeDraft,
  segmentCustomFieldValueDraft,
  setSegmentCustomFieldValueDraft,
  segmentOneContactDraft,
  setSegmentOneContactDraft,
  audienceDraft,
  setAudienceDraft,
  customFields,
  liveValidation,
  setShowUpgradeModal,
}: StepAudienceSelectionProps) {
  // Derived state: eligible contacts count
  const eligibleContactsCount = useMemo(() => {
    if (audienceStats) return audienceStats.eligible;
    return (allContacts || []).filter((c) => c.status !== ContactStatus.OPT_OUT).length;
  }, [allContacts, audienceStats]);

  // Derived state: segments subtitle
  const segmentsSubtitle = useMemo(() => {
    if (audiencePreset === 'no_tags' || audienceCriteria?.noTags) {
      return `Sem tags • ${audienceStats?.noTagsEligible ?? 0} contatos`;
    }

    if (audienceCriteria?.uf) {
      const uf = String(audienceCriteria.uf).trim().toUpperCase();
      const count = (audienceStats?.brUfCounts ?? []).find((x) => x.uf === uf)?.count ?? 0;
      return `UF: ${uf} • ${count} contatos`;
    }

    if (audienceCriteria?.ddi) {
      const ddi = String(audienceCriteria.ddi).trim().replace(/^\+/, '');
      const count = (audienceStats?.ddiCountsEligible ?? []).find((x) => String(x.ddi) === ddi)?.count ?? 0;
      return `DDI +${ddi} • ${count} contatos`;
    }

    if (audienceCriteria?.customFieldKey) {
      const key = String(audienceCriteria.customFieldKey).trim();
      const def = (customFields || []).find((f) => f.key === key);
      const label = def?.label || key;
      const count = (audienceStats?.customFieldCountsEligible ?? []).find((x) => x.key === key)?.count ?? 0;
      return `${label} • ${count} contatos`;
    }

    if (audienceCriteria?.includeTag) {
      const tag = String(audienceCriteria.includeTag).trim();
      const tagKey = tag.toLowerCase();
      const count = (audienceStats?.tagCountsEligible ?? []).find((x) => String(x.tag).trim().toLowerCase() === tagKey)?.count ?? 0;
      return `Tag: ${tag} • ${count} contatos`;
    }

    const totalTags = audienceStats?.tagCountsEligible?.length ?? 0;
    return totalTags > 0 ? `${totalTags} tags disponíveis` : 'Escolha uma tag';
  }, [audienceCriteria, audiencePreset, audienceStats, customFields]);

  // Derived state: is all criteria selected (no refinements)
  const isAllCriteriaSelected = useMemo(() => {
    if (!audienceCriteria) return audiencePreset === 'all';
    const status = audienceCriteria.status ?? 'ALL';
    const includeTag = (audienceCriteria.includeTag || '').trim();
    const uf = (audienceCriteria.uf || '').trim();
    const ddi = (audienceCriteria.ddi || '').trim();
    const cfk = (audienceCriteria.customFieldKey || '').trim();
    const createdWithinDays = audienceCriteria.createdWithinDays ?? null;
    const noTags = !!audienceCriteria.noTags;

    return (
      status === 'ALL' &&
      !includeTag &&
      !uf &&
      !ddi &&
      !cfk &&
      !noTags &&
      !createdWithinDays
    );
  }, [audienceCriteria, audiencePreset]);

  // Derived state: is auto specific selection (segment-based)
  const isAutoSpecificSelection = useMemo(() => {
    if (recipientSource !== 'specific') return false;
    if (!isJobsAudienceMode) return false;
    return (audienceCriteria?.excludeOptOut ?? true) === true;
  }, [recipientSource, isJobsAudienceMode, audienceCriteria?.excludeOptOut]);

  // Derived state: is "All" card selected
  const isAllCardSelected = useMemo(() => {
    if (!isJobsAudienceMode) return false;
    if (recipientSource === 'test') return false;
    return (audiencePreset === 'all') || (recipientSource === 'specific' && isAllCriteriaSelected);
  }, [audiencePreset, isAllCriteriaSelected, isJobsAudienceMode, recipientSource]);

  // Derived state: is "Segments" card selected
  const isSegmentsCardSelected = useMemo(() => {
    if (!isJobsAudienceMode) return false;
    if (recipientSource === 'test') return false;
    return recipientSource === 'specific' && !isAllCriteriaSelected;
  }, [isAllCriteriaSelected, isJobsAudienceMode, recipientSource]);

  // Helper: pick one contact
  const pickOneContact = (contactId: string, prefillSearch?: string) => {
    if (recipientSource === 'test') return;
    selectAudiencePreset?.('manual');
    if (prefillSearch !== undefined) setContactSearchTerm(prefillSearch);
    setTimeout(() => {
      toggleContact(contactId);
    }, 0);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-auto p-6 pb-8">
      <div className="text-center mb-4 shrink-0">
        <h2 className="text-2xl font-bold text-white mb-2">Escolha seu Público</h2>
        <p className="text-gray-400">Quem deve receber esta campanha?</p>
      </div>

      {isJobsAudienceMode ? (
        <>
          {/* Test Contact Card - Always visible if configured */}
          {testContact && (
            <div className="mb-4">
              <button
                onClick={() => selectAudiencePreset?.('test')}
                className={`relative w-full p-4 rounded-2xl border transition-all duration-200 flex items-center gap-4 ${(audiencePreset === 'test' || recipientSource === 'test')
                  ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                  : 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20 hover:border-amber-500/50 text-amber-300'
                  }`}
              >
                {(audiencePreset === 'test' || recipientSource === 'test') && (
                  <div className="absolute top-3 right-3 text-black">
                    <CheckCircleFilled size={18} />
                  </div>
                )}
                <div className={`p-3 rounded-xl ${(audiencePreset === 'test' || recipientSource === 'test')
                  ? 'bg-black/20 text-black'
                  : 'bg-amber-500/20 text-amber-400'
                  }`}>
                  <FlaskConical size={20} />
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm">Enviar para Contato de Teste</h3>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${(audiencePreset === 'test' || recipientSource === 'test') ? 'bg-black/20' : 'bg-amber-500/20'
                      }`}>
                      RECOMENDADO
                    </span>
                  </div>
                  <p className={`text-xs mt-0.5 ${(audiencePreset === 'test' || recipientSource === 'test') ? 'text-black/70' : 'text-amber-400/70'}`}>
                    {testContact.name || 'Contato de Teste'} • +{testContact.phone}
                  </p>
                </div>
                {(audiencePreset === 'test' || recipientSource === 'test') && selectedTemplate && (
                  <div className="text-right">
                    <p className="text-xs font-bold text-black">
                      {getPricingBreakdown(selectedTemplate.category, 1, 0, exchangeRate ?? 5.00).totalBRLFormatted}
                    </p>
                  </div>
                )}
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Todos */}
            <button
              type="button"
              onClick={() => selectAudiencePreset?.('all')}
              className={`relative p-6 rounded-2xl border transition-all duration-200 flex flex-col items-center justify-center gap-4 h-full min-h-47.5 ${eligibleContactsCount > currentLimit
                ? 'bg-zinc-900/50 border-red-500/30 text-gray-400 opacity-60'
                : isAllCardSelected
                  ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.10)] ring-2 ring-white/70'
                  : 'bg-zinc-900/50 border-white/10 hover:bg-zinc-900 hover:border-white/20 text-gray-300'
                }`}
            >
              {isAllCardSelected && eligibleContactsCount <= currentLimit && (
                <div className="absolute top-3 right-3 text-black">
                  <CheckCircleFilled size={20} />
                </div>
              )}
              {eligibleContactsCount > currentLimit && (
                <div className="absolute top-3 right-3 text-red-400">
                  <ShieldAlert size={18} />
                </div>
              )}
              <div className={`p-4 rounded-full ${eligibleContactsCount > currentLimit
                ? 'bg-red-500/20 text-red-400'
                : isAllCardSelected
                  ? 'bg-gray-200 text-black'
                  : 'bg-zinc-800 text-gray-400'
                }`}>
                <Users size={24} />
              </div>
              <div className="text-center">
                <h3 className="font-bold text-sm">Todos</h3>
                <p className={`text-xs mt-1 ${eligibleContactsCount > currentLimit ? 'text-red-400' : isAllCardSelected ? 'text-gray-600' : 'text-gray-500'}`}>
                  {eligibleContactsCount} contatos • exclui opt-out e supressões
                </p>
                {eligibleContactsCount > currentLimit ? (
                  <p className="text-xs mt-2 font-bold text-red-400">
                    Excede limite ({currentLimit})
                  </p>
                ) : isAllCardSelected && selectedTemplate ? (
                  <p className="text-xs mt-2 font-bold text-primary-600">
                    {getPricingBreakdown(selectedTemplate.category, eligibleContactsCount, 0, exchangeRate ?? 5.00).totalBRLFormatted}
                  </p>
                ) : null}
              </div>
            </button>

            {/* Segmentos (Tag principal ou Sem tags) */}
            <button
              type="button"
              onClick={() => {
                setIsSegmentsSheetOpen(true);
                setIsAudienceRefineOpen(false);
              }}
              className={`relative p-6 rounded-2xl border transition-all duration-200 flex flex-col items-center justify-center gap-4 h-full min-h-47.5 ${isSegmentsCardSelected
                ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.10)] ring-2 ring-white/70'
                : 'bg-zinc-900/50 border-white/10 hover:bg-zinc-900 hover:border-white/20 text-gray-300'
                }`}
            >
              {isSegmentsCardSelected && (
                <div className="absolute top-3 right-3 text-black">
                  <CheckCircleFilled size={20} />
                </div>
              )}

              <div className={`p-4 rounded-full ${isSegmentsCardSelected ? 'bg-gray-200 text-black' : 'bg-zinc-800 text-gray-400'}`}>
                <LinkIcon size={24} />
              </div>

              <div className="text-center">
                <h3 className="font-bold text-sm">Segmentos</h3>
                <p className={`text-xs mt-1 ${isSegmentsCardSelected ? 'text-gray-600' : 'text-gray-500'}`}>
                  {segmentsSubtitle}
                </p>
                {isSegmentsCardSelected && selectedTemplate ? (
                  <p className="text-xs mt-2 font-bold text-primary-600">
                    {getPricingBreakdown(selectedTemplate.category, recipientCount, 0, exchangeRate ?? 5.00).totalBRLFormatted}
                  </p>
                ) : null}
              </div>
            </button>
          </div>

          {/* Segmentos (inline) */}
          {isSegmentsSheetOpen && (
            <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-5 mt-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-white">Segmentos</p>
                  <p className="text-xs text-gray-500">Escolhas rápidas — sem virar construtor de filtros.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSegmentsSheetOpen(false)}
                  className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                  aria-label="Fechar"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tags</p>
                    <button
                      type="button"
                      className="text-xs text-gray-400 hover:text-white transition-colors"
                      onClick={() => setSegmentTagDraft('')}
                      disabled={recipientSource === 'test'}
                    >
                      Limpar busca
                    </button>
                  </div>

                  <Input
                    value={segmentTagDraft}
                    onChange={(e) => setSegmentTagDraft(e.target.value)}
                    placeholder="Buscar tag…"
                    className="bg-zinc-900 border-white/10 text-white placeholder:text-gray-500"
                    disabled={recipientSource === 'test'}
                  />

                  <div className="max-h-56 overflow-auto rounded-xl border border-white/10 bg-zinc-950/30">
                    {(audienceStats?.tagCountsEligible ?? [])
                      .filter(({ tag }) => {
                        const q = (segmentTagDraft || '').trim().toLowerCase();
                        if (!q) return true;
                        return String(tag || '').toLowerCase().includes(q);
                      })
                      .slice(0, 50)
                      .map(({ tag, count }) => (
                        <button
                          key={String(tag)}
                          type="button"
                          className="w-full px-3 py-2 flex items-center justify-between text-sm text-gray-200 hover:bg-zinc-800/60 transition-colors"
                          onClick={() => {
                            applyAudienceCriteria?.(
                              {
                                status: audienceCriteria?.status ?? 'ALL',
                                includeTag: String(tag || '').trim(),
                                createdWithinDays: audienceCriteria?.createdWithinDays ?? null,
                                excludeOptOut: true,
                                noTags: false,
                                uf: null,
                                ddi: null,
                                customFieldKey: null,
                                customFieldMode: null,
                                customFieldValue: null,
                              },
                              'manual'
                            );
                            setIsSegmentsSheetOpen(false);
                          }}
                          disabled={recipientSource === 'test'}
                        >
                          <span className="truncate pr-3">{String(tag)}</span>
                          <span className="text-xs text-gray-400 shrink-0">{count}</span>
                        </button>
                      ))}

                    {(audienceStats?.tagCountsEligible?.length ?? 0) === 0 && (
                      <div className="px-3 py-3 text-xs text-gray-600">Nenhuma tag encontrada.</div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">País (DDI)</p>
                  <p className="text-xs text-gray-500">Derivado do telefone (ex.: +55).</p>

                  {(audienceStats?.ddiCountsEligible?.length ?? 0) > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {(audienceStats?.ddiCountsEligible ?? []).slice(0, 10).map(({ ddi, count }) => (
                        <button
                          key={ddi}
                          type="button"
                          onClick={() => {
                            applyAudienceCriteria?.(
                              {
                                status: audienceCriteria?.status ?? 'ALL',
                                includeTag: null,
                                createdWithinDays: audienceCriteria?.createdWithinDays ?? null,
                                excludeOptOut: true,
                                noTags: false,
                                uf: null,
                                ddi: String(ddi),
                                customFieldKey: null,
                                customFieldMode: null,
                                customFieldValue: null,
                              },
                              'manual'
                            );
                            setIsSegmentsSheetOpen(false);
                          }}
                          disabled={recipientSource === 'test'}
                          className="px-3 py-1 rounded-full bg-zinc-900 border border-white/10 text-gray-200 text-xs hover:bg-zinc-800 disabled:opacity-50 disabled:hover:bg-zinc-900"
                        >
                          +{ddi} <span className="text-gray-400">({count})</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-600">Sem dados suficientes para sugerir DDI.</p>
                  )}

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <Input
                        value={segmentDdiDraft}
                        onChange={(e) => setSegmentDdiDraft(e.target.value)}
                        placeholder="ex: 55"
                        className="bg-zinc-900 border-white/10 text-white placeholder:text-gray-500"
                        disabled={recipientSource === 'test'}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-white/10 bg-zinc-900 text-white hover:bg-zinc-800"
                      onClick={() => {
                        const ddi = String(segmentDdiDraft || '').trim().replace(/^\+/, '');
                        if (!ddi) return;
                        applyAudienceCriteria?.(
                          {
                            status: audienceCriteria?.status ?? 'ALL',
                            includeTag: null,
                            createdWithinDays: audienceCriteria?.createdWithinDays ?? null,
                            excludeOptOut: true,
                            noTags: false,
                            uf: null,
                            ddi,
                            customFieldKey: null,
                            customFieldMode: null,
                            customFieldValue: null,
                          },
                          'manual'
                        );
                        setIsSegmentsSheetOpen(false);
                      }}
                      disabled={recipientSource === 'test'}
                    >
                      Aplicar
                    </Button>
                  </div>

                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Estado (UF - BR)</p>
                  <p className="text-xs text-gray-500">Derivado do DDD (não grava nada no banco).</p>

                  {(audienceStats?.brUfCounts?.length ?? 0) > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {(audienceStats?.brUfCounts ?? []).slice(0, 12).map(({ uf, count }) => (
                        <button
                          key={uf}
                          type="button"
                          onClick={() => {
                            applyAudienceCriteria?.(
                              {
                                status: audienceCriteria?.status ?? 'ALL',
                                includeTag: null,
                                createdWithinDays: audienceCriteria?.createdWithinDays ?? null,
                                excludeOptOut: true,
                                noTags: false,
                                uf,
                                ddi: null,
                                customFieldKey: null,
                                customFieldMode: null,
                                customFieldValue: null,
                              },
                              'manual'
                            );
                            setIsSegmentsSheetOpen(false);
                          }}
                          disabled={recipientSource === 'test'}
                          className="px-3 py-1 rounded-full bg-zinc-900 border border-white/10 text-gray-200 text-xs hover:bg-zinc-800 disabled:opacity-50 disabled:hover:bg-zinc-900"
                        >
                          {uf} <span className="text-gray-400">({count})</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-600">Sem dados suficientes para sugerir UFs.</p>
                  )}

                  <div className="pt-3 border-t border-white/5">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Campos personalizados</p>
                    <p className="text-xs text-gray-500 mt-1">Filtre por um campo do contato.</p>

                    <div className="grid grid-cols-1 gap-2 mt-2">
                      <select
                        value={segmentCustomFieldKeyDraft}
                        onChange={(e) => setSegmentCustomFieldKeyDraft(e.target.value)}
                        className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500"
                        disabled={recipientSource === 'test'}
                      >
                        <option value="">Selecione um campo…</option>
                        {customFields
                          .filter((f) => f.entity_type === 'contact')
                          .sort((a, b) => a.label.localeCompare(b.label))
                          .map((f) => (
                            <option key={f.id} value={f.key}>
                              {f.label}
                            </option>
                          ))}
                      </select>

                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant={segmentCustomFieldModeDraft === 'exists' ? 'default' : 'outline'}
                          className={segmentCustomFieldModeDraft === 'exists'
                            ? 'bg-primary-600 text-white hover:bg-primary-500'
                            : 'border-white/10 bg-zinc-900 text-white hover:bg-zinc-800'
                          }
                          onClick={() => setSegmentCustomFieldModeDraft('exists')}
                          disabled={recipientSource === 'test' || !segmentCustomFieldKeyDraft}
                        >
                          Tem valor
                        </Button>
                        <Button
                          type="button"
                          variant={segmentCustomFieldModeDraft === 'equals' ? 'default' : 'outline'}
                          className={segmentCustomFieldModeDraft === 'equals'
                            ? 'bg-primary-600 text-white hover:bg-primary-500'
                            : 'border-white/10 bg-zinc-900 text-white hover:bg-zinc-800'
                          }
                          onClick={() => setSegmentCustomFieldModeDraft('equals')}
                          disabled={recipientSource === 'test' || !segmentCustomFieldKeyDraft}
                        >
                          Igual a
                        </Button>
                      </div>

                      {segmentCustomFieldModeDraft === 'equals' && (
                        <Input
                          value={segmentCustomFieldValueDraft}
                          onChange={(e) => setSegmentCustomFieldValueDraft(e.target.value)}
                          placeholder="ex: prata"
                          className="bg-zinc-900 border-white/10 text-white placeholder:text-gray-500"
                          disabled={recipientSource === 'test' || !segmentCustomFieldKeyDraft}
                        />
                      )}

                      <Button
                        type="button"
                        className="bg-primary-600 text-white hover:bg-primary-500"
                        disabled={
                          recipientSource === 'test' ||
                          !segmentCustomFieldKeyDraft ||
                          (segmentCustomFieldModeDraft === 'equals' && !segmentCustomFieldValueDraft.trim())
                        }
                        onClick={() => {
                          const key = String(segmentCustomFieldKeyDraft || '').trim();
                          if (!key) return;
                          applyAudienceCriteria?.(
                            {
                              status: audienceCriteria?.status ?? 'ALL',
                              includeTag: null,
                              createdWithinDays: audienceCriteria?.createdWithinDays ?? null,
                              excludeOptOut: true,
                              noTags: false,
                              uf: null,
                              ddi: null,
                              customFieldKey: key,
                              customFieldMode: segmentCustomFieldModeDraft,
                              customFieldValue: segmentCustomFieldModeDraft === 'equals' ? segmentCustomFieldValueDraft.trim() : null,
                            },
                            'manual'
                          );
                          setIsSegmentsSheetOpen(false);
                        }}
                      >
                        Aplicar
                      </Button>
                    </div>

                    <div className="pt-4 border-t border-white/5 mt-4">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Buscar 1 contato</p>
                      <p className="text-xs text-gray-500 mt-1">Atalho para seleção manual.</p>

                      <Input
                        value={segmentOneContactDraft}
                        onChange={(e) => setSegmentOneContactDraft(e.target.value)}
                        placeholder="Nome, telefone, email…"
                        className="bg-zinc-900 border-white/10 text-white placeholder:text-gray-500 mt-2"
                        disabled={recipientSource === 'test'}
                      />

                      {(segmentOneContactDraft || '').trim() && (
                        <div className="mt-2 max-h-40 overflow-auto rounded-xl border border-white/10 bg-zinc-950/30">
                          {allContacts
                            .filter((c) => c.status !== ContactStatus.OPT_OUT)
                            .filter((c) => {
                              const q = segmentOneContactDraft.trim().toLowerCase();
                              const name = String(c.name || '').toLowerCase();
                              const phone = String(c.phone || '').toLowerCase();
                              const email = String(c.email || '').toLowerCase();
                              return name.includes(q) || phone.includes(q) || email.includes(q);
                            })
                            .slice(0, 8)
                            .map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                className="w-full px-3 py-2 flex items-center justify-between text-sm text-gray-200 hover:bg-zinc-800/60 transition-colors"
                                onClick={() => {
                                  pickOneContact(c.id, segmentOneContactDraft);
                                  setIsSegmentsSheetOpen(false);
                                }}
                                disabled={recipientSource === 'test'}
                              >
                                <span className="truncate pr-3">{c.name || c.phone}</span>
                                <span className="text-xs text-gray-500 shrink-0 font-mono">{c.phone}</span>
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="border-white/10 bg-zinc-900 text-white hover:bg-zinc-800"
                  onClick={() => setIsSegmentsSheetOpen(false)}
                >
                  Fechar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="border-white/10 bg-zinc-900 text-white hover:bg-zinc-800"
                  onClick={() => {
                    setIsSegmentsSheetOpen(false);
                    setIsAudienceRefineOpen(true);
                  }}
                  disabled={recipientSource === 'test'}
                >
                  Ajustar status/recência…
                </Button>
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-white/10 bg-zinc-900 hover:bg-zinc-800 text-white"
              onClick={() => selectAudiencePreset?.('manual')}
              disabled={recipientSource === 'test'}
            >
              Selecionar manualmente
            </Button>
          </div>

          {/* Mais opções (inline) */}
          {isAudienceRefineOpen && (
            <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-5 mt-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-white">Ajustar status/recência</p>
                  <p className="text-xs text-gray-500">Ajuste fino (status, sem tags, recência). Para Tag/UF, use Segmentos.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAudienceRefineOpen(false)}
                  className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                  aria-label="Fechar"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="mt-5 space-y-6">
                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Status</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={audienceDraft.status === 'OPT_IN' ? 'default' : 'outline'}
                      className={audienceDraft.status === 'OPT_IN'
                        ? 'bg-primary-600 text-white hover:bg-primary-500'
                        : 'border-white/10 bg-zinc-900 text-white hover:bg-zinc-800'
                      }
                      onClick={() => setAudienceDraft((d) => ({ ...d, status: 'OPT_IN' }))}
                    >
                      Opt-in
                    </Button>
                    <Button
                      type="button"
                      variant={audienceDraft.status === 'ALL' ? 'default' : 'outline'}
                      className={audienceDraft.status === 'ALL'
                        ? 'bg-primary-600 text-white hover:bg-primary-500'
                        : 'border-white/10 bg-zinc-900 text-white hover:bg-zinc-800'
                      }
                      onClick={() => setAudienceDraft((d) => ({ ...d, status: 'ALL' }))}
                    >
                      Todos
                    </Button>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked
                      disabled
                      className="w-4 h-4 text-primary-600 bg-zinc-800 border-white/10 rounded"
                    />
                    Opt-out sempre excluído (regra do WhatsApp)
                  </label>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tags</p>
                    <button
                      type="button"
                      className="text-xs text-gray-400 hover:text-white transition-colors"
                      onClick={() => {
                        setIsAudienceRefineOpen(false);
                        setIsSegmentsSheetOpen(true);
                      }}
                      disabled={recipientSource === 'test'}
                    >
                      Abrir Segmentos
                    </button>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked={!!audienceDraft.noTags}
                      onChange={(e) => setAudienceDraft((d) => ({ ...d, noTags: e.target.checked }))}
                      className="w-4 h-4 text-primary-600 bg-zinc-800 border-white/10 rounded"
                    />
                    Somente contatos sem tags
                  </label>
                  <p className="text-xs text-gray-500">Escolha Tag/UF em <span className="text-gray-300">Segmentos</span> (com contagem por opção).</p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Criados nos últimos</p>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      type="button"
                      variant={audienceDraft.createdWithinDays === 7 ? 'default' : 'outline'}
                      className={audienceDraft.createdWithinDays === 7
                        ? 'bg-primary-600 text-white hover:bg-primary-500'
                        : 'border-white/10 bg-zinc-900 text-white hover:bg-zinc-800'
                      }
                      onClick={() => setAudienceDraft((d) => ({ ...d, createdWithinDays: 7 }))}
                    >
                      7 dias
                    </Button>
                    <Button
                      type="button"
                      variant={audienceDraft.createdWithinDays === 30 ? 'default' : 'outline'}
                      className={audienceDraft.createdWithinDays === 30
                        ? 'bg-primary-600 text-white hover:bg-primary-500'
                        : 'border-white/10 bg-zinc-900 text-white hover:bg-zinc-800'
                      }
                      onClick={() => setAudienceDraft((d) => ({ ...d, createdWithinDays: 30 }))}
                    >
                      30 dias
                    </Button>
                    <Button
                      type="button"
                      variant={!audienceDraft.createdWithinDays ? 'default' : 'outline'}
                      className={!audienceDraft.createdWithinDays
                        ? 'bg-primary-600 text-white hover:bg-primary-500'
                        : 'border-white/10 bg-zinc-900 text-white hover:bg-zinc-800'
                      }
                      onClick={() => setAudienceDraft((d) => ({ ...d, createdWithinDays: null }))}
                    >
                      Todos
                    </Button>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between gap-3 w-full">
                <Button
                  type="button"
                  variant="outline"
                  className="border-white/10 bg-zinc-900 text-white hover:bg-zinc-800"
                  onClick={() => {
                    setAudienceDraft({
                      status: 'OPT_IN',
                      includeTag: audienceCriteria?.includeTag ?? null,
                      createdWithinDays: null,
                      excludeOptOut: true,
                      noTags: false,
                      uf: audienceCriteria?.uf ?? null,
                    });
                  }}
                >
                  Limpar
                </Button>
                <Button
                  type="button"
                  className="bg-primary-600 text-white hover:bg-primary-500"
                  onClick={() => {
                    applyAudienceCriteria?.(
                      {
                        ...audienceDraft,
                        includeTag: audienceCriteria?.includeTag ?? null,
                        uf: audienceCriteria?.uf ?? null,
                        ddi: audienceCriteria?.ddi ?? null,
                        customFieldKey: audienceCriteria?.customFieldKey ?? null,
                        customFieldMode: audienceCriteria?.customFieldMode ?? null,
                        customFieldValue: audienceCriteria?.customFieldValue ?? null,
                      },
                      'manual'
                    );
                    setIsAudienceRefineOpen(false);
                  }}
                >
                  Aplicar
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Test Contact Card - Always visible if configured */}
          {testContact && (
            <div className="mb-4">
              <button
                onClick={() => setRecipientSource('test')}
                className={`relative w-full p-4 rounded-2xl border transition-all duration-200 flex items-center gap-4 ${recipientSource === 'test'
                  ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                  : 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20 hover:border-amber-500/50 text-amber-300'
                  }`}
              >
                {recipientSource === 'test' && (
                  <div className="absolute top-3 right-3 text-black">
                    <CheckCircleFilled size={18} />
                  </div>
                )}
                <div className={`p-3 rounded-xl ${recipientSource === 'test'
                  ? 'bg-black/20 text-black'
                  : 'bg-amber-500/20 text-amber-400'
                  }`}>
                  <FlaskConical size={20} />
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm">Enviar para Contato de Teste</h3>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${recipientSource === 'test' ? 'bg-black/20' : 'bg-amber-500/20'
                      }`}>
                      RECOMENDADO
                    </span>
                  </div>
                  <p className={`text-xs mt-0.5 ${recipientSource === 'test' ? 'text-black/70' : 'text-amber-400/70'}`}>
                    {testContact.name || 'Contato de Teste'} • +{testContact.phone}
                  </p>
                </div>
                {recipientSource === 'test' && selectedTemplate && (
                  <div className="text-right">
                    <p className="text-xs font-bold text-black">
                      {getPricingBreakdown(selectedTemplate.category, 1, 0, exchangeRate ?? 5.00).totalBRLFormatted}
                    </p>
                  </div>
                )}
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* All Contacts - Shows error style when exceeds limit */}
            <button
              onClick={() => setRecipientSource('all')}
              className={`relative p-6 rounded-2xl border transition-all duration-200 flex flex-col items-center justify-center gap-4 h-full min-h-47.5 ${totalContacts > currentLimit
                ? 'bg-zinc-900/50 border-red-500/30 text-gray-400 opacity-60'
                : recipientSource === 'all'
                  ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.10)] ring-2 ring-white/70'
                  : 'bg-zinc-900/50 border-white/10 hover:bg-zinc-900 hover:border-white/20 text-gray-300'
                }`}
            >
              {recipientSource === 'all' && totalContacts <= currentLimit && (
                <div className="absolute top-3 right-3 text-black">
                  <CheckCircleFilled size={20} />
                </div>
              )}
              {totalContacts > currentLimit && (
                <div className="absolute top-3 right-3 text-red-400">
                  <ShieldAlert size={18} />
                </div>
              )}
              <div className={`p-4 rounded-full ${totalContacts > currentLimit
                ? 'bg-red-500/20 text-red-400'
                : recipientSource === 'all'
                  ? 'bg-gray-200 text-black'
                  : 'bg-zinc-800 text-gray-400'
                }`}>
                <Users size={24} />
              </div>
              <div className="text-center">
                <h3 className="font-bold text-sm">Todos os Contatos</h3>
                <p className={`text-xs mt-1 ${totalContacts > currentLimit ? 'text-red-400' : recipientSource === 'all' ? 'text-gray-600' : 'text-gray-500'}`}>
                  {totalContacts} contatos
                </p>
                {totalContacts > currentLimit ? (
                  <p className="text-xs mt-2 font-bold text-red-400">
                    Excede limite ({currentLimit})
                  </p>
                ) : recipientSource === 'all' && selectedTemplate ? (
                  <p className="text-xs mt-2 font-bold text-primary-600">
                    {getPricingBreakdown(selectedTemplate.category, totalContacts, 0, exchangeRate ?? 5.00).totalBRLFormatted}
                  </p>
                ) : null}
              </div>
            </button>

            {/* Select Specific - Highlighted as solution when All exceeds */}
            <button
              onClick={() => setRecipientSource('specific')}
              className={`relative p-6 rounded-2xl border transition-all duration-200 flex flex-col items-center justify-center gap-4 h-full min-h-47.5 ${recipientSource === 'specific'
                ? 'bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.10)] ring-2 ring-white/70'
                : totalContacts > currentLimit && recipientSource === 'all'
                  ? 'bg-primary-500/10 border-primary-500/50 text-primary-300 hover:bg-primary-500/20 ring-2 ring-primary-500/30'
                  : 'bg-zinc-900/50 border-white/10 hover:bg-zinc-900 hover:border-white/20 text-gray-300'
                }`}
            >
              {recipientSource === 'specific' && (
                <div className="absolute top-3 right-3 text-black">
                  <CheckCircleFilled size={20} />
                </div>
              )}
              {totalContacts > currentLimit && recipientSource !== 'specific' && (
                <div className="absolute top-3 right-3 text-primary-400">
                  <Sparkles size={18} />
                </div>
              )}
              <div className={`p-4 rounded-full ${recipientSource === 'specific'
                ? 'bg-gray-200 text-black'
                : totalContacts > currentLimit
                  ? 'bg-primary-500/20 text-primary-400'
                  : 'bg-zinc-800 text-gray-400'
                }`}>
                <Smartphone size={24} />
              </div>
              <div className="text-center">
                <h3 className="font-bold text-sm">
                  {totalContacts > currentLimit && recipientSource !== 'specific' ? 'Selecionar Específicos' : 'Selecionar Específicos'}
                </h3>
                <p className={`text-xs mt-1 ${totalContacts > currentLimit && recipientSource !== 'specific'
                  ? 'text-primary-400 font-medium'
                  : recipientSource === 'specific'
                    ? 'text-gray-600'
                    : 'text-gray-500'
                  }`}>
                  {recipientSource === 'specific'
                    ? `${recipientCount} selecionados`
                    : totalContacts > currentLimit
                      ? `Selecione até ${currentLimit}`
                      : 'Escolher contatos'
                  }
                </p>
                {recipientSource === 'specific' && selectedTemplate && recipientCount > 0 && (
                  <p className="text-xs mt-2 font-bold text-primary-600">
                    {getPricingBreakdown(selectedTemplate.category, recipientCount, 0, exchangeRate ?? 5.00).totalBRLFormatted}
                  </p>
                )}
              </div>
            </button>
          </div>
        </>
      )}

      {/* Contact Selection List */}
      {recipientSource === 'specific' && (
        <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-6 mt-6 animate-in zoom-in duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="min-w-0">
              <h4 className="text-white font-bold text-sm">
                {isAutoSpecificSelection ? 'Contatos do segmento' : 'Seus Contatos'}
              </h4>
              {isAutoSpecificSelection && (
                <p className="text-xs text-gray-500 mt-1">
                  Seleção automática. Para ajustar manualmente, troque para "Escolher contatos".
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs text-gray-500">{recipientCount}/{totalContacts} selecionados</span>
              {isAutoSpecificSelection && (
                <Button
                  type="button"
                  variant="outline"
                  className="border-white/10 bg-zinc-900 text-white hover:bg-zinc-800"
                  onClick={() => {
                    selectAudiencePreset?.('manual');
                  }}
                >
                  Editar manualmente
                </Button>
              )}
            </div>
          </div>

          {!isAutoSpecificSelection && (
            <>
              {/* Search Input */}
              <div className="relative mb-4">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Buscar por nome, telefone, email ou tags..."
                  value={contactSearchTerm}
                  onChange={(e) => setContactSearchTerm(e.target.value)}
                  className="w-full bg-zinc-800 border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-primary-500 transition-colors"
                />
                {contactSearchTerm && (
                  <button
                    onClick={() => setContactSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </>
          )}

          <div className="space-y-2 max-h-75 overflow-y-auto custom-scrollbar">
            {(isAutoSpecificSelection ? selectedContacts : filteredContacts).length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">
                {(!isAutoSpecificSelection && contactSearchTerm)
                  ? 'Nenhum contato encontrado para esta busca'
                  : 'Nenhum contato encontrado'}
              </p>
            ) : (
              (isAutoSpecificSelection ? selectedContacts : filteredContacts).map((contact) => {
                const isSelected = selectedContactIds.includes(contact.id);
                return (
                  <label
                    key={contact.id}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-all ${isSelected
                      ? 'bg-primary-500/10 border border-primary-500/30'
                      : 'bg-zinc-800/50 border border-transparent'
                      } ${isAutoSpecificSelection ? 'cursor-default' : 'cursor-pointer hover:bg-zinc-800'}`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        if (isAutoSpecificSelection) return;
                        toggleContact(contact.id);
                      }}
                      disabled={isAutoSpecificSelection}
                      className="w-4 h-4 text-primary-600 bg-zinc-700 border-zinc-600 rounded focus:ring-primary-500 disabled:opacity-50"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{contact.name || contact.phone}</p>
                      <p className="text-xs text-gray-500 font-mono">{contact.phone}</p>
                    </div>
                    {isSelected && (
                      <Check size={16} className="text-primary-400 shrink-0" />
                    )}
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* CONSOLIDATED LIMIT WARNING - Everything user needs to know */}
      {recipientCount > 0 && isOverLimit && liveValidation && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex gap-3">
            <ShieldAlert className="text-red-400 shrink-0 mt-0.5" size={22} />
            <div className="flex-1">
              <p className="font-bold text-red-400 text-base mb-1">Limite Excedido</p>
              <p className="text-sm text-red-200/80">
                Você selecionou <span className="font-bold text-white">{recipientCount}</span> contatos,
                mas seu limite atual é de <span className="font-bold text-white">{currentLimit}</span> mensagens/dia.
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 bg-black/20 rounded-lg p-3">
            <div className="text-center">
              <p className="text-lg font-bold text-white">{recipientCount}</p>
              <p className="text-[10px] text-gray-500 uppercase">Selecionados</p>
            </div>
            <div className="text-center border-x border-white/10">
              <p className="text-lg font-bold text-primary-400">{currentLimit}</p>
              <p className="text-[10px] text-gray-500 uppercase">Seu Limite</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-red-400">+{recipientCount - currentLimit}</p>
              <p className="text-[10px] text-gray-500 uppercase">Excedente</p>
            </div>
          </div>

          {/* Solutions */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">O que você pode fazer:</p>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <span className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-xs">1</span>
              Reduza a seleção para no máximo <span className="font-bold text-primary-400">{currentLimit}</span> contatos
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <span className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-xs">2</span>
              Divida em {Math.ceil(recipientCount / currentLimit)} campanhas menores
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <span className="w-5 h-5 rounded-full bg-primary-500/30 flex items-center justify-center text-xs text-primary-400">*</span>
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="text-primary-400 hover:text-primary-300 underline"
              >
                Saiba como aumentar seu limite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
