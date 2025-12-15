'use client'

import Link from 'next/link'
import { Fragment, useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Search, ChevronDown, ChevronUp } from 'lucide-react'
import type { FlowSubmissionRow } from '@/services/flowSubmissionsService'
import type { FlowRow } from '@/services/flowsService'

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString('pt-BR')
}

function safePrettyJson(raw: unknown): string {
  try {
    if (typeof raw === 'string') {
      const parsed = JSON.parse(raw)
      return JSON.stringify(parsed, null, 2)
    }
    return JSON.stringify(raw, null, 2)
  } catch {
    return typeof raw === 'string' ? raw : JSON.stringify(raw)
  }
}

export function FlowSubmissionsView(props: {
  submissions: FlowSubmissionRow[]
  isLoading: boolean
  isFetching: boolean
  phoneFilter: string
  onPhoneFilterChange: (v: string) => void
  flowIdFilter: string
  onFlowIdFilterChange: (v: string) => void
  onRefresh: () => void
  builderFlows?: FlowRow[]
}) {
  const [openId, setOpenId] = useState<string | null>(null)

  const rows = useMemo(() => props.submissions || [], [props.submissions])

  const builderByMetaFlowId = useMemo(() => {
    const out = new Map<string, FlowRow>()
    for (const f of props.builderFlows || []) {
      if (f.meta_flow_id) out.set(String(f.meta_flow_id), f)
    }
    return out
  }, [props.builderFlows])

  const builderFlowOptions = useMemo(() => {
    const rows = (props.builderFlows || []).filter((f) => !!f.meta_flow_id)
    rows.sort((a, b) => a.name.localeCompare(b.name))
    return rows
  }, [props.builderFlows])

  return (
    <div className="space-y-4">
      <div className="glass-panel p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Filtrar por telefone (from_phone)</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-gray-500" size={16} />
                <Input
                  value={props.phoneFilter}
                  onChange={(e) => props.onPhoneFilterChange(e.target.value)}
                  placeholder="Ex: +5511999999999"
                  className="pl-9"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Flow (Builder)</label>
              <Select
                value={props.flowIdFilter?.trim() ? props.flowIdFilter : '__all__'}
                onValueChange={(v) => props.onFlowIdFilterChange(v === '__all__' ? '' : v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  {builderFlowOptions.map((f) => (
                    <SelectItem key={f.id} value={String(f.meta_flow_id)}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Filtrar por Flow ID</label>
              <Input
                value={props.flowIdFilter}
                onChange={(e) => props.onFlowIdFilterChange(e.target.value)}
                placeholder="Ex: 1234567890"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={props.onRefresh}
              disabled={props.isLoading || props.isFetching}
            >
              <RefreshCw size={16} className={props.isFetching ? 'animate-spin' : ''} />
              Atualizar
            </Button>
          </div>
        </div>

        <div className="mt-3 text-xs text-gray-500">
          {props.isLoading ? 'Carregando…' : `Mostrando ${rows.length} registro(s)`}
          {props.isFetching && !props.isLoading ? ' (atualizando…)': ''}
        </div>
      </div>

      <div className="glass-panel p-0 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5">
            <tr className="text-gray-300">
              <th className="px-4 py-3 font-semibold">Data</th>
              <th className="px-4 py-3 font-semibold">Telefone</th>
              <th className="px-4 py-3 font-semibold">Flow</th>
              <th className="px-4 py-3 font-semibold">Token</th>
              <th className="px-4 py-3 font-semibold text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                  Nenhuma submissão encontrada.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const isOpen = openId === r.id
                const builder = r.flow_id ? builderByMetaFlowId.get(String(r.flow_id)) : undefined
                return (
                  <Fragment key={r.id}>
                    <tr className="border-t border-white/5 hover:bg-white/5">
                      <td className="px-4 py-3 text-gray-200">{formatDateTime(r.created_at)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-300">{r.from_phone}</td>
                      <td className="px-4 py-3">
                        <div className="text-gray-200 font-medium">{r.flow_name || r.flow_id || '—'}</div>
                        {r.flow_id && r.flow_name && (
                          <div className="text-[11px] text-gray-500 font-mono">{r.flow_id}</div>
                        )}
                        {builder && (
                          <div className="mt-1 flex items-center gap-2">
                            <Badge variant="secondary" className="bg-white/5 text-gray-200 border-white/10">
                              Builder
                            </Badge>
                            <Link
                              href={`/flows/builder/${encodeURIComponent(builder.id)}`}
                              className="text-[11px] text-gray-300 hover:text-white underline underline-offset-2"
                            >
                              {builder.name}
                            </Link>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-300">{r.flow_token || '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setOpenId(isOpen ? null : r.id)}
                          className="text-gray-200"
                        >
                          {isOpen ? (
                            <>
                              <ChevronUp size={16} />
                              Fechar
                            </>
                          ) : (
                            <>
                              <ChevronDown size={16} />
                              Ver JSON
                            </>
                          )}
                        </Button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr key={`${r.id}_details`} className="border-t border-white/5 bg-black/20">
                        <td colSpan={5} className="px-4 py-4">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div className="rounded-xl bg-zinc-950/60 border border-white/5 p-3">
                              <div className="text-xs text-gray-400 mb-2">response_json (parseado)</div>
                              <pre className="text-[11px] leading-relaxed text-gray-200 overflow-auto max-h-80">
{safePrettyJson(r.response_json)}
                              </pre>
                            </div>
                            <div className="rounded-xl bg-zinc-950/60 border border-white/5 p-3">
                              <div className="text-xs text-gray-400 mb-2">response_json_raw</div>
                              <pre className="text-[11px] leading-relaxed text-gray-200 overflow-auto max-h-80">
{safePrettyJson(r.response_json_raw)}
                              </pre>
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                            <div className="rounded-lg bg-white/5 border border-white/5 p-2">
                              <div className="text-gray-400">message_id</div>
                              <div className="font-mono text-[11px] text-gray-200 break-all">{r.message_id}</div>
                            </div>
                            <div className="rounded-lg bg-white/5 border border-white/5 p-2">
                              <div className="text-gray-400">phone_number_id</div>
                              <div className="font-mono text-[11px] text-gray-200 break-all">{r.phone_number_id || '—'}</div>
                            </div>
                            <div className="rounded-lg bg-white/5 border border-white/5 p-2">
                              <div className="text-gray-400">message_timestamp</div>
                              <div className="text-gray-200">{formatDateTime(r.message_timestamp)}</div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

