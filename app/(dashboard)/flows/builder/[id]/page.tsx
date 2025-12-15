'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Save } from 'lucide-react'

import { Page, PageActions, PageDescription, PageHeader, PageTitle } from '@/components/ui/page'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FlowBuilderCanvas } from '@/components/features/flows/builder/FlowBuilderCanvas'
import { useFlowEditorController } from '@/hooks/useFlowEditor'

export default function FlowBuilderEditorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const { id } = React.use(params)

  const controller = useFlowEditorController(id)

  const flow = controller.flow

  const [name, setName] = React.useState('')
  const [metaFlowId, setMetaFlowId] = React.useState<string>('')

  React.useEffect(() => {
    if (!flow) return
    setName(flow.name || '')
    setMetaFlowId(flow.meta_flow_id || '')
  }, [flow?.id])

  const shouldShowLoading = controller.isLoading

  return (
    <Page>
      <PageHeader>
        <div className="space-y-1">
          <PageTitle>Editor de Flow</PageTitle>
          <PageDescription>
            Conecte nós para definir a lógica. Depois, vincule o Meta Flow ID para o envio.
          </PageDescription>
        </div>
        <PageActions>
          <Link href="/flows/builder">
            <Button variant="outline" className="border-white/10 bg-zinc-900 hover:bg-white/5">
              <ArrowLeft className="w-4 h-4" />
              Lista
            </Button>
          </Link>
        </PageActions>
      </PageHeader>

      {shouldShowLoading ? (
        <div className="glass-panel p-8 rounded-xl text-gray-300 flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin" />
          Carregando flow...
        </div>
      ) : controller.isError ? (
        <div className="glass-panel p-8 rounded-xl text-red-300 space-y-2">
          <div className="font-medium">Falha ao carregar flow.</div>
          <div className="text-sm text-red-200/90 whitespace-pre-wrap">
            {controller.error?.message || 'Erro desconhecido'}
          </div>
          <div>
            <Button variant="outline" onClick={() => router.refresh()} className="border-white/10 bg-zinc-900 hover:bg-white/5">
              Tentar novamente
            </Button>
          </div>
        </div>
      ) : !flow ? (
        <div className="glass-panel p-8 rounded-xl text-gray-300">Flow não encontrado.</div>
      ) : (
        <>
          <div className="glass-panel p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Nome</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Meta Flow ID (opcional)</label>
                <Input value={metaFlowId} onChange={(e) => setMetaFlowId(e.target.value)} placeholder="Cole o flow_id da Meta" />
              </div>
            </div>
          </div>

          <FlowBuilderCanvas
            name={name}
            metaFlowId={metaFlowId || null}
            initialSpec={controller.spec}
            isSaving={controller.isSaving}
            onSave={(patch) => {
              controller.save({
                ...(patch.name !== undefined ? { name: patch.name } : {}),
                ...(patch.metaFlowId !== undefined ? { metaFlowId: patch.metaFlowId } : {}),
                ...(patch.spec !== undefined ? { spec: patch.spec } : {}),
              })
            }}
          />

          {/* Barra inferior fixa */}
          <div className="fixed left-0 right-0 bottom-0 z-40 border-t border-white/10 bg-zinc-950/95 backdrop-blur supports-backdrop-filter:bg-zinc-950/70">
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
              <Link href="/flows/builder">
                <Button variant="outline" className="border-white/10 bg-zinc-900 hover:bg-white/5">
                  Voltar
                </Button>
              </Link>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => controller.save({ name, metaFlowId: metaFlowId || undefined })}
                  disabled={controller.isSaving}
                  className="border-white/10 bg-zinc-900 hover:bg-white/5"
                >
                  {controller.isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Salvar meta
                </Button>
              </div>
            </div>
          </div>
          <div className="h-24" />
        </>
      )}
    </Page>
  )
}
