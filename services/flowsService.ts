import { z } from 'zod'

export type FlowRow = {
  id: string
  name: string
  status: string
  meta_flow_id: string | null
  spec: any
  created_at: string
  updated_at: string | null
}

const FlowRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string(),
  meta_flow_id: z.string().nullable().optional(),
  spec: z.any(),
  created_at: z.string(),
  updated_at: z.string().nullable().optional(),
})

function parseList(raw: unknown): FlowRow[] {
  if (!Array.isArray(raw)) return []
  const out: FlowRow[] = []
  for (const item of raw) {
    const res = FlowRowSchema.safeParse(item)
    if (res.success) out.push(res.data as any)
  }
  return out
}

async function readErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json().catch(() => null)
    const base = (data?.error && String(data.error)) || fallback
    const details = data?.details ? String(data.details) : ''
    return details ? `${base}: ${details}` : base
  } catch {
    return fallback
  }
}

export const flowsService = {
  async list(): Promise<FlowRow[]> {
    const res = await fetch('/api/flows', { method: 'GET', credentials: 'include' })
    if (!res.ok) {
      throw new Error(await readErrorMessage(res, 'Falha ao listar flows'))
    }
    const data = await res.json()
    return parseList(data)
  },

  async create(input: { name: string }): Promise<FlowRow> {
    const res = await fetch('/api/flows', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!res.ok) {
      throw new Error(await readErrorMessage(res, 'Falha ao criar flow'))
    }
    const data = await res.json()
    const parsed = FlowRowSchema.safeParse(data)
    if (!parsed.success) throw new Error('Resposta inválida ao criar flow')
    return parsed.data as any
  },

  async get(id: string): Promise<FlowRow> {
    const res = await fetch(`/api/flows/${encodeURIComponent(id)}`, { method: 'GET', credentials: 'include' })
    if (!res.ok) {
      throw new Error(await readErrorMessage(res, 'Falha ao buscar flow'))
    }
    const data = await res.json()
    const parsed = FlowRowSchema.safeParse(data)
    if (!parsed.success) throw new Error('Resposta inválida ao buscar flow')
    return parsed.data as any
  },

  async update(id: string, patch: { name?: string; status?: string; metaFlowId?: string; spec?: unknown }): Promise<FlowRow> {
    const res = await fetch(`/api/flows/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (!res.ok) {
      throw new Error(await readErrorMessage(res, 'Falha ao atualizar flow'))
    }
    const data = await res.json()
    const parsed = FlowRowSchema.safeParse(data)
    if (!parsed.success) throw new Error('Resposta inválida ao atualizar flow')
    return parsed.data as any
  },

  async remove(id: string): Promise<void> {
    const res = await fetch(`/api/flows/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'include' })
    if (!res.ok) {
      throw new Error(await readErrorMessage(res, 'Falha ao excluir flow'))
    }
  },
}
