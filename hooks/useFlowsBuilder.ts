import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { flowsService } from '@/services/flowsService'

export const useFlowsBuilderController = () => {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')

  const flowsQuery = useQuery({
    queryKey: ['flows'],
    queryFn: flowsService.list,
    staleTime: 10_000,
  })

  const createMutation = useMutation({
    mutationFn: flowsService.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['flows'] })
      toast.success('Flow criado')
    },
    onError: (e: Error) => toast.error(e.message || 'Erro ao criar flow'),
  })

  const deleteMutation = useMutation({
    mutationFn: flowsService.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['flows'] })
      toast.success('Flow excluído')
    },
    onError: (e: Error) => toast.error(e.message || 'Erro ao excluir flow'),
  })

  const flows = useMemo(() => {
    const rows = flowsQuery.data || []
    const s = search.trim().toLowerCase()
    if (!s) return rows
    return rows.filter((f) => f.name.toLowerCase().includes(s) || String(f.meta_flow_id || '').toLowerCase().includes(s))
  }, [flowsQuery.data, search])

  return {
    flows,
    isLoading: flowsQuery.isLoading,
    isFetching: flowsQuery.isFetching,
    error: flowsQuery.error as Error | null,
    refetch: flowsQuery.refetch,

    search,
    setSearch,

    createFlow: (name: string) => createMutation.mutate({ name }),
    isCreating: createMutation.isPending,

    deleteFlow: (id: string) => deleteMutation.mutate(id),
    isDeleting: deleteMutation.isPending,
  }
}
