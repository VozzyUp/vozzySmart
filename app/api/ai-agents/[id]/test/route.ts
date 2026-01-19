/**
 * T055: Test AI Agent endpoint
 * Allows testing an agent with a sample message before activation
 *
 * Uses Google File Search Tool for RAG:
 * - Queries indexed documents in the agent's File Search Store
 * - Gemini does semantic retrieval and returns only relevant chunks
 * - Much more efficient than injecting full documents into context
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { z } from 'zod'

// Helper to get admin client with null check
function getClient() {
  const client = getSupabaseAdmin()
  if (!client) {
    throw new Error('Supabase admin client not configured. Check SUPABASE_SECRET_KEY env var.')
  }
  return client
}

const testMessageSchema = z.object({
  message: z.string().min(1, 'Mensagem é obrigatória').max(2000),
})

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const supabase = getClient()
    const body = await request.json()

    // Validate body
    const parsed = testMessageSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { message } = parsed.data

    // Get agent with file_search_store_id
    const { data: agent, error: agentError } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('id', id)
      .single()

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agente não encontrado' },
        { status: 404 }
      )
    }

    console.log(`[ai-agents/test] Agent: ${agent.name}, file_search_store_id: ${agent.file_search_store_id}`)

    // Get count of indexed files for this agent
    const { count: indexedFilesCount } = await supabase
      .from('ai_knowledge_files')
      .select('id', { count: 'exact', head: true })
      .eq('agent_id', id)
      .eq('indexing_status', 'completed')

    console.log(`[ai-agents/test] Indexed files count: ${indexedFilesCount}`)

    // Import AI dependencies dynamically
    const { createGoogleGenerativeAI } = await import('@ai-sdk/google')
    const { generateText, stepCountIs } = await import('ai')
    const { withDevTools } = await import('@/lib/ai/devtools')

    // Get Gemini API key
    const { data: geminiSetting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'gemini_api_key')
      .maybeSingle()

    const apiKey = geminiSetting?.value || process.env.GEMINI_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key do Gemini não configurada' },
        { status: 500 }
      )
    }

    // Create Google provider with DevTools support
    const google = createGoogleGenerativeAI({ apiKey })
    const baseModel = google(agent.model || 'gemini-2.0-flash')
    const model = await withDevTools(baseModel, { name: `agent-test:${agent.name}` })

    // Build system prompt
    let systemPrompt = agent.system_prompt

    // Add instruction about knowledge base if files are indexed
    if (agent.file_search_store_id && indexedFilesCount && indexedFilesCount > 0) {
      systemPrompt = `${agent.system_prompt}

## INSTRUÇÕES SOBRE BASE DE CONHECIMENTO
Você tem acesso a uma base de conhecimento com ${indexedFilesCount} documento(s) indexado(s).
Use a ferramenta de busca (file_search) para encontrar informações relevantes antes de responder.
Se a resposta não estiver na base de conhecimento, diga que não tem essa informação disponível.
Sempre cite a fonte quando usar informações da base de conhecimento.`
    }

    // Generate response
    const startTime = Date.now()

    // Configure tools - only add fileSearch if agent has a store with files
    const hasFileSearch = agent.file_search_store_id && indexedFilesCount && indexedFilesCount > 0

    let result

    if (hasFileSearch) {
      console.log(`[ai-agents/test] Using File Search Store: ${agent.file_search_store_id} with ${indexedFilesCount} files`)

      // Use the File Search tool for RAG
      // stopWhen: stepCountIs(5) allows multiple roundtrips for tool execution
      result = await generateText({
        model,
        system: systemPrompt,
        prompt: message,
        temperature: agent.temperature ?? 0.7,
        maxOutputTokens: agent.max_tokens ?? 1024,
        stopWhen: stepCountIs(5), // Allow up to 5 steps for tool calls
        tools: {
          file_search: google.tools.fileSearch({
            fileSearchStoreNames: [agent.file_search_store_id],
            topK: 5, // Return top 5 most relevant chunks
          }),
        }
      })

      // Log tool usage for debugging
      console.log(`[ai-agents/test] Tool calls:`, result.toolCalls?.length || 0)
      console.log(`[ai-agents/test] Steps:`, result.steps?.length || 0)
    } else {
      // No file search - just generate without tools
      result = await generateText({
        model,
        system: systemPrompt,
        prompt: message,
        temperature: agent.temperature ?? 0.7,
        maxOutputTokens: agent.max_tokens ?? 1024,
      })
    }

    const latencyMs = Date.now() - startTime

    // Extract sources from the result if available
    const sources = result.sources || []

    console.log(`[ai-agents/test] Response generated in ${latencyMs}ms. Used File Search: ${hasFileSearch}`)

    // Extract grounding metadata from provider metadata (Google-specific)
    const groundingMetadata = (result.providerMetadata?.google as Record<string, unknown>)?.groundingMetadata

    return NextResponse.json({
      response: result.text,
      latency_ms: latencyMs,
      model: agent.model,
      knowledge_files_used: indexedFilesCount ?? 0,
      file_search_enabled: hasFileSearch,
      sources: sources.length > 0 ? sources : undefined,
      // Debug info for tool calls
      tool_calls_count: result.toolCalls?.length || 0,
      steps_count: result.steps?.length || 0,
      grounding_metadata: groundingMetadata || undefined,
      usage: result.usage ? {
        promptTokens: result.usage.inputTokens,
        completionTokens: result.usage.outputTokens,
        totalTokens: result.usage.totalTokens,
      } : undefined,
    })
  } catch (error) {
    console.error('[ai-agents/test] Error:', error)

    // Handle AI SDK specific errors
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'Erro de autenticação com o modelo de IA' },
          { status: 401 }
        )
      }
      if (error.message.includes('rate limit') || error.message.includes('429')) {
        return NextResponse.json(
          { error: 'Limite de requisições excedido. Tente novamente em alguns segundos.' },
          { status: 429 }
        )
      }
      if (error.message.includes('quota') || error.message.includes('RESOURCE_EXHAUSTED')) {
        return NextResponse.json(
          { error: 'Quota excedida. Verifique seu plano do Gemini e configure billing.' },
          { status: 429 }
        )
      }
      // Return the actual error message for debugging
      return NextResponse.json(
        { error: `Erro ao testar agente: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Erro ao testar agente' },
      { status: 500 }
    )
  }
}
