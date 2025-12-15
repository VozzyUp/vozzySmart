'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Send, RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { FlowRow } from '@/services/flowsService'

type SendFlowPayload = {
  to: string
  flowId: string
  flowToken: string
  body?: string
  ctaText?: string
  footer?: string
  action?: 'navigate' | 'data_exchange'
  actionPayload?: Record<string, unknown>
  flowMessageVersion?: string
}

async function sendFlow(payload: SendFlowPayload) {
  const res = await fetch('/api/flows/send', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const msg = data?.error || 'Falha ao enviar Flow'
    throw new Error(msg)
  }
  return data
}

export function SendFlowDialog(props: {
  flows?: FlowRow[]
  isLoadingFlows?: boolean
  onRefreshFlows?: () => void
  triggerLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const [selectedDraftId, setSelectedDraftId] = useState<string>('')
  const [to, setTo] = useState('')
  const [flowId, setFlowId] = useState('')
  const [flowToken, setFlowToken] = useState('')
  const [body, setBody] = useState('Vamos começar?')
  const [ctaText, setCtaText] = useState('Abrir')
  const [footer, setFooter] = useState('')
  const [isSending, setIsSending] = useState(false)

  const flowsWithMetaId = useMemo(() => {
    const rows = props.flows || []
    return rows.filter((f) => !!f.meta_flow_id)
  }, [props.flows])

  const selectedDraft = useMemo(() => {
    if (!selectedDraftId) return null
    return (props.flows || []).find((f) => f.id === selectedDraftId) || null
  }, [props.flows, selectedDraftId])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <Send className="h-4 w-4" />
          {props.triggerLabel || 'Enviar Flow'}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Enviar Flow (teste)</DialogTitle>
          <DialogDescription>
            Envia uma mensagem do tipo <span className="font-mono">interactive.flow</span> para um contato.
            Você precisa do <span className="font-mono">flow_id</span> e do <span className="font-mono">flow_token</span> gerados/configurados na Meta.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4">
          <div className="grid grid-cols-1 gap-2">
            <div className="flex items-center justify-between gap-3">
              <Label>Rascunho (opcional)</Label>
              {props.onRefreshFlows && (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 px-2 text-gray-300"
                  onClick={props.onRefreshFlows}
                  disabled={!!props.isLoadingFlows}
                >
                  <RefreshCw className={props.isLoadingFlows ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
                </Button>
              )}
            </div>

            <Select
              value={selectedDraftId}
              onValueChange={(v) => {
                setSelectedDraftId(v)
                const found = (props.flows || []).find((f) => f.id === v)
                if (found?.meta_flow_id) setFlowId(found.meta_flow_id)
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={props.isLoadingFlows ? 'Carregando…' : 'Escolha um rascunho do Builder'} />
              </SelectTrigger>
              <SelectContent>
                {flowsWithMetaId.length === 0 ? (
                  <SelectItem value="__none__" disabled>
                    Nenhum rascunho com Meta Flow ID
                  </SelectItem>
                ) : (
                  flowsWithMetaId.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name} · {String(f.meta_flow_id)}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {selectedDraft && (
              <div className="text-[11px] text-gray-500">
                Selecionado: <span className="text-gray-300">{selectedDraft.name}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="send_to">Telefone (to)</Label>
              <Input
                id="send_to"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="Ex: +5511999999999"
              />
              <div className="text-[11px] text-gray-500">Aceita números com ou sem +. O servidor normaliza para E.164.</div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="send_flow_id">Meta Flow ID (flowId)</Label>
              <Input
                id="send_flow_id"
                value={flowId}
                onChange={(e) => setFlowId(e.target.value)}
                placeholder="Ex: 1234567890"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="send_flow_token">Flow Token (flowToken)</Label>
              <Input
                id="send_flow_token"
                value={flowToken}
                onChange={(e) => setFlowToken(e.target.value)}
                placeholder="Cole o token do Flow"
              />
              <div className="text-[11px] text-gray-500">Esse token vem da configuração do Flow na Meta.</div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="send_cta">Texto do botão (ctaText)</Label>
              <Input id="send_cta" value={ctaText} onChange={(e) => setCtaText(e.target.value)} placeholder="Abrir" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="send_body">Texto da mensagem (body)</Label>
              <Textarea id="send_body" value={body} onChange={(e) => setBody(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="send_footer">Rodapé (footer)</Label>
              <Textarea
                id="send_footer"
                value={footer}
                onChange={(e) => setFooter(e.target.value)}
                placeholder="Opcional"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            onClick={async () => {
              try {
                setIsSending(true)
                await sendFlow({
                  to,
                  flowId,
                  flowToken,
                  body,
                  ctaText,
                  footer: footer.trim() || undefined,
                  flowMessageVersion: '3',
                })
                toast.success('Flow enviado')
                setOpen(false)
              } catch (e) {
                toast.error(e instanceof Error ? e.message : 'Falha ao enviar Flow')
              } finally {
                setIsSending(false)
              }
            }}
            disabled={isSending || !to.trim() || !flowId.trim() || !flowToken.trim()}
          >
            {isSending ? 'Enviando…' : 'Enviar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
