import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'
export const revalidate = 0

import { supabase } from '@/lib/supabase'

const PatchFlowSchema = z
  .object({
    name: z.string().min(1).max(140).optional(),
    status: z.string().min(1).max(40).optional(),
    metaFlowId: z.string().min(1).max(128).optional(),
    spec: z.unknown().optional(),
  })
  .strict()

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  try {
    const { data, error } = await supabase
      .from('flows')
      .select('id,name,status,meta_flow_id,spec,created_at,updated_at')
      .eq('id', id)
      .limit(1)

    if (error) return NextResponse.json({ error: error.message || 'Falha ao buscar flow' }, { status: 500 })

    const row = Array.isArray(data) ? data[0] : (data as any)
    if (!row) return NextResponse.json({ error: 'Flow não encontrado' }, { status: 404 })

    return NextResponse.json(row)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  try {
    const json = await req.json()
    const patch = PatchFlowSchema.parse(json)
    const now = new Date().toISOString()

    const update: Record<string, unknown> = { updated_at: now }
    if (patch.name !== undefined) update.name = patch.name
    if (patch.status !== undefined) update.status = patch.status
    if (patch.metaFlowId !== undefined) update.meta_flow_id = patch.metaFlowId
    if (patch.spec !== undefined) update.spec = patch.spec

    const { data, error } = await supabase
      .from('flows')
      .update(update)
      .eq('id', id)
      .select('id,name,status,meta_flow_id,spec,created_at,updated_at')
      .limit(1)

    if (error) return NextResponse.json({ error: error.message || 'Falha ao atualizar flow' }, { status: 500 })

    const row = Array.isArray(data) ? data[0] : (data as any)
    if (!row) return NextResponse.json({ error: 'Flow não encontrado' }, { status: 404 })

    return NextResponse.json(row)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao atualizar flow'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  try {
    const { error } = await supabase.from('flows').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 })
  }
}
