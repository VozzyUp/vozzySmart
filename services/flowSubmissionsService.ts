export interface FlowSubmissionsQuery {
  flowId?: string
  phone?: string
  limit?: number
}

export interface FlowSubmissionRow {
  id: string
  message_id: string
  from_phone: string
  contact_id: string | null
  flow_id: string | null
  flow_name: string | null
  flow_token: string | null
  response_json_raw: string
  response_json: any | null
  waba_id: string | null
  phone_number_id: string | null
  message_timestamp: string | null
  created_at: string
}

export const flowSubmissionsService = {
  async list(query: FlowSubmissionsQuery = {}): Promise<FlowSubmissionRow[]> {
    const sp = new URLSearchParams()
    if (query.flowId) sp.set('flowId', query.flowId)
    if (query.phone) sp.set('phone', query.phone)
    if (query.limit) sp.set('limit', String(query.limit))

    const url = `/api/flows/submissions${sp.toString() ? `?${sp.toString()}` : ''}`
    const res = await fetch(url, {
      credentials: 'include',
      headers: {
        'Cache-Control': 'no-cache',
      },
    })

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      const base = (data?.error && String(data.error)) || 'Falha ao buscar submissions de Flow'
      const details = data?.details ? String(data.details) : ''
      throw new Error(details ? `${base}: ${details}` : base)
    }

    return res.json()
  },
}
