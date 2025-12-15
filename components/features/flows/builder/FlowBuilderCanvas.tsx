'use client'

import React, { useMemo } from 'react'
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
} from '@xyflow/react'
import { nanoid } from 'nanoid'
import { Plus, Save } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { flowNodeTypes } from './nodes'

type FlowSpec = {
  version: number
  viewport?: { x: number; y: number; zoom: number }
  nodes: Node[]
  edges: Edge[]
}

function normalizeSpec(spec: any): FlowSpec {
  const nodes = Array.isArray(spec?.nodes) ? spec.nodes : []
  const edges = Array.isArray(spec?.edges) ? spec.edges : []
  const viewport = spec?.viewport && typeof spec.viewport === 'object' ? spec.viewport : { x: 0, y: 0, zoom: 1 }
  return {
    version: typeof spec?.version === 'number' ? spec.version : 1,
    viewport,
    nodes,
    edges,
  }
}

export function FlowBuilderCanvas(props: {
  name: string
  metaFlowId: string | null
  initialSpec: any
  isSaving: boolean
  onSave: (patch: { name?: string; metaFlowId?: string; spec?: unknown }) => void
}) {
  const initial = useMemo(() => normalizeSpec(props.initialSpec), [props.initialSpec])

  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges)

  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null)

  const selectedNode = useMemo(() => nodes.find((n) => n.id === selectedNodeId) || null, [nodes, selectedNodeId])

  const onConnect = React.useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge({ ...connection, id: `e_${nanoid(8)}` }, eds))
    },
    [setEdges]
  )

  const addNode = (type: 'message' | 'end') => {
    const id = `${type}_${nanoid(6)}`
    const baseY = 120 + nodes.length * 40
    const n: Node = {
      id,
      type,
      position: { x: type === 'end' ? 560 : 320, y: baseY },
      data: type === 'message' ? { label: 'Mensagem', text: '' } : { label: 'Fim' },
    }
    setNodes((prev) => [...prev, n])
    setSelectedNodeId(id)
  }

  const updateSelectedNodeData = (patch: Record<string, unknown>) => {
    if (!selectedNode) return
    setNodes((prev) =>
      prev.map((n) => (n.id === selectedNode.id ? { ...n, data: { ...(n.data as any), ...patch } } : n))
    )
  }

  const handleSave = () => {
    props.onSave({
      name: props.name,
      metaFlowId: props.metaFlowId || undefined,
      spec: {
        version: 1,
        nodes,
        edges,
      },
    })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr_360px] gap-4">
      {/* Palette */}
      <div className="glass-panel p-4 space-y-3">
        <div className="text-sm font-semibold text-white">Blocos</div>
        <div className="text-xs text-gray-400">Arranque rápido: adicione nós e conecte.</div>

        <div className="grid grid-cols-1 gap-2">
          <Button type="button" variant="secondary" onClick={() => addNode('message')}
          >
            <Plus size={16} />
            Mensagem
          </Button>
          <Button type="button" variant="secondary" onClick={() => addNode('end')}
          >
            <Plus size={16} />
            Fim
          </Button>
        </div>

        <div className="pt-3 border-t border-white/10 space-y-2">
          <div className="text-sm font-semibold text-white">Salvar</div>
          <Button type="button" onClick={handleSave} disabled={props.isSaving}>
            <Save size={16} />
            Salvar rascunho
          </Button>
          <div className="text-[11px] text-gray-500">
            Este editor guarda o mapa do fluxo no SmartZap. O Flow (telas) continua na Meta.
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="glass-panel p-0 overflow-hidden h-[70vh] min-h-130">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={flowNodeTypes as any}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={(_, node) => setSelectedNodeId(node.id)}
          fitView
        >
          <Background gap={16} size={1} />
          <Controls />
          <MiniMap pannable zoomable />
        </ReactFlow>
      </div>

      {/* Inspector */}
      <div className="glass-panel p-4 space-y-3">
        <div className="text-sm font-semibold text-white">Propriedades</div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Nome (interno)</label>
          <Input value={props.name} readOnly />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Meta Flow ID (opcional)</label>
          <Input value={props.metaFlowId || ''} readOnly placeholder="(não definido)" />
          <div className="text-[11px] text-gray-500 mt-1">Edite esse campo no topo da página e salve.</div>
        </div>

        <div className="pt-3 border-t border-white/10">
          {!selectedNode ? (
            <div className="text-sm text-gray-400">Selecione um nó no canvas para editar.</div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs text-gray-400">Nó selecionado: <span className="font-mono text-gray-200">{selectedNode.type}:{selectedNode.id}</span></div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Título</label>
                <Input
                  value={String((selectedNode.data as any)?.label || '')}
                  onChange={(e) => updateSelectedNodeData({ label: e.target.value })}
                />
              </div>

              {selectedNode.type === 'message' ? (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Texto da mensagem</label>
                  <Textarea
                    value={String((selectedNode.data as any)?.text || '')}
                    onChange={(e) => updateSelectedNodeData({ text: e.target.value })}
                    placeholder="Digite a mensagem…"
                    className="min-h-40"
                  />
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
