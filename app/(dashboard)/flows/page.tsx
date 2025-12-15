
'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'

import { FlowSubmissionsView } from '@/components/features/flows/FlowSubmissionsView'
import { SendFlowDialog } from '@/components/features/flows/SendFlowDialog'
import { useFlowSubmissionsController } from '@/hooks/useFlowSubmissions'
import { flowsService } from '@/services/flowsService'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Page, PageActions, PageDescription, PageHeader, PageTitle } from '@/components/ui/page'
import { Badge } from '@/components/ui/badge'

export default function FlowsPage() {
  const controller = useFlowSubmissionsController()

  const flowsQuery = useQuery({
    queryKey: ['flows'],
    queryFn: flowsService.list,
    staleTime: 10_000,
  })

  const flows = flowsQuery.data || []

  return (
    <Page>
      <PageHeader>
        <div className="space-y-1">
          <PageTitle>Flows</PageTitle>
          <PageDescription>
            Central para monitorar submissões e testar envios. O Builder aqui é só para desenhar a lógica; as telas do Flow continuam na Meta.
          </PageDescription>
        </div>
        <PageActions>
          <SendFlowDialog
            flows={flows}
            isLoadingFlows={flowsQuery.isFetching}
            onRefreshFlows={() => flowsQuery.refetch()}
          />
          <Link href="/flows/builder">
            <Button variant="outline" className="border-white/10 bg-zinc-900 hover:bg-white/5">
              Abrir Flow Builder
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </PageActions>
      </PageHeader>

      <Tabs defaultValue="submissions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="submissions">Submissões</TabsTrigger>
          <TabsTrigger value="drafts">Rascunhos</TabsTrigger>
        </TabsList>

        <TabsContent value="submissions" className="space-y-4">
          <FlowSubmissionsView
            submissions={controller.submissions}
            isLoading={controller.isLoading}
            isFetching={controller.isFetching}
            phoneFilter={controller.phoneFilter}
            onPhoneFilterChange={controller.setPhoneFilter}
            flowIdFilter={controller.flowIdFilter}
            onFlowIdFilterChange={controller.setFlowIdFilter}
            onRefresh={() => controller.refetch()}
            builderFlows={flows}
          />
        </TabsContent>

        <TabsContent value="drafts" className="space-y-4">
          <div className="glass-panel p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-white font-semibold">Seus rascunhos do Builder</div>
                <div className="text-sm text-gray-400">Dica: preencha o Meta Flow ID para cruzar com as submissões.</div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => flowsQuery.refetch()}
                  disabled={flowsQuery.isLoading || flowsQuery.isFetching}
                >
                  {flowsQuery.isFetching ? 'Atualizando…' : 'Atualizar lista'}
                </Button>
                <Link href="/flows/builder">
                  <Button variant="secondary">Ir para o Builder</Button>
                </Link>
              </div>
            </div>

            <div className="mt-3 text-xs text-gray-500">
              {flowsQuery.isLoading ? 'Carregando…' : `Mostrando ${flows.length} flow(s)`}
              {flowsQuery.isFetching && !flowsQuery.isLoading ? ' (atualizando…)': ''}
            </div>
          </div>

          <div className="glass-panel p-0 overflow-hidden">
            {flows.length === 0 ? (
              <div className="px-4 py-10 text-center text-gray-500">Nenhum flow ainda. Crie um no Builder para começar.</div>
            ) : (
              <div className="divide-y divide-white/5">
                {flows.slice(0, 12).map((f) => (
                  <div key={f.id} className="flex flex-col gap-2 px-4 py-3 hover:bg-white/5 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-gray-200 font-medium truncate">{f.name}</div>
                        <Badge variant="secondary" className="bg-white/5 text-gray-200 border-white/10">
                          {f.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-500 font-mono truncate">Meta Flow ID: {f.meta_flow_id || '—'}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={`/flows/builder/${encodeURIComponent(f.id)}`}>
                        <Button type="button" variant="secondary">
                          Abrir
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
                {flows.length > 12 && (
                  <div className="px-4 py-3 text-xs text-gray-500">
                    Mostrando 12 de {flows.length}. Abra o Builder para ver todos.
                  </div>
                )}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </Page>
  )
}
