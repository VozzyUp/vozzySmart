import { NextResponse } from 'next/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'
export const revalidate = 0

import { supabase } from '@/lib/supabase'

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  if (error && typeof error === 'object') {
    const anyErr = error as any
    if (typeof anyErr.message === 'string') return anyErr.message
    if (typeof anyErr.error === 'string') return anyErr.error
    if (typeof anyErr.details === 'string' && anyErr.details) return anyErr.details
    if (typeof anyErr.hint === 'string' && anyErr.hint) return anyErr.hint
  }
  return 'Erro desconhecido'
}

const CreateFlowSchema = z
  .object({
    name: z.string().min(1).max(140),
  })
  .strict()

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('flows')
      .select('id,name,status,meta_flow_id,spec,created_at,updated_at')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(data || [], {
      headers: {
        'Cache-Control': 'private, no-store, no-cache, must-revalidate, max-age=0',
        Pragma: 'no-cache',
        Expires: '0',
      },
    })
  } catch (error) {
    const message = getErrorMessage(error)
    console.error('Failed to list flows:', error)

    // Em dev, devolvemos a causa para agilizar debug (sem vazar em prod)
    if (process.env.NODE_ENV !== 'production') {
      return NextResponse.json({ error: 'Falha ao listar flows', details: message }, { status: 500 })
    }

    return NextResponse.json({ error: 'Falha ao listar flows' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json()
    const input = CreateFlowSchema.parse(json)

    const now = new Date().toISOString()

    // Spec inicial com Start node
    const initialSpec = {
      version: 1,
      viewport: { x: 0, y: 0, zoom: 1 },
      nodes: [
        {
          id: 'start',
          type: 'start',
          position: { x: 80, y: 120 },
          data: { label: 'Início' },
        },
      ],
      edges: [],
    }

    const { data, error } = await supabase
      .from('flows')
      .insert({
        name: input.name,
        status: 'DRAFT',
        spec: initialSpec,
        created_at: now,
        updated_at: now,
      })
      .select('id,name,status,meta_flow_id,spec,created_at,updated_at')
      .limit(1)

    if (error) {
      const message = getErrorMessage(error)
      console.error('Failed to create flow:', error)

      // Erros de banco/config são 500; validação já foi tratada pelo Zod.
      if (process.env.NODE_ENV !== 'production') {
        return NextResponse.json({ error: 'Erro ao criar flow', details: message }, { status: 500 })
      }

      return NextResponse.json({ error: 'Erro ao criar flow' }, { status: 500 })
    }

    const row = Array.isArray(data) ? data[0] : (data as any)
    if (!row) return NextResponse.json({ error: 'Falha ao criar flow' }, { status: 500 })

    return NextResponse.json(row, { status: 201 })
  } catch (error) {
    const message = getErrorMessage(error)
    // Aqui normalmente é Zod (input inválido) ou JSON inválido.
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
