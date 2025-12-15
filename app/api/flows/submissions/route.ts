import { NextRequest, NextResponse } from 'next/server'

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

function clampInt(value: string | null, min: number, max: number, fallback: number): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.trunc(n)))
}

/**
 * GET /api/flows/submissions
 * Query params:
 * - flowId
 * - phone
 * - limit (default 50, max 200)
 */
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams
    const flowId = sp.get('flowId')
    const phone = sp.get('phone')
    const limit = clampInt(sp.get('limit'), 1, 200, 50)

    let q = supabase
      .from('flow_submissions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (flowId) q = q.eq('flow_id', flowId)
    if (phone) q = q.eq('from_phone', phone)

    const { data, error } = await q
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
    console.error('Failed to fetch flow submissions:', error)

    if (process.env.NODE_ENV !== 'production') {
      return NextResponse.json({ error: 'Falha ao buscar submissions de Flow', details: message }, { status: 500 })
    }

    return NextResponse.json({ error: 'Falha ao buscar submissions de Flow' }, { status: 500 })
  }
}
