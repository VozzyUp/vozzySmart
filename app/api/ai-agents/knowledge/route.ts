/**
 * T057: Knowledge Base API
 * Manage knowledge base files for AI agents
 * Integrates with Google File Search Store for RAG
 *
 * Flow:
 * 1. Upload file → File Search Store (auto-indexed for semantic search)
 * 2. Store metadata in database
 * 3. Test endpoint uses google.tools.fileSearch() to query indexed docs
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { z } from 'zod'
import {
  ensureFileSearchStore,
  uploadToFileSearchStore,
  waitForOperation,
  deleteFileFromStore,
} from '@/lib/ai/file-search-store'

// Helper to get admin client with null check
function getClient() {
  const client = getSupabaseAdmin()
  if (!client) {
    throw new Error('Supabase admin client not configured. Check SUPABASE_SECRET_KEY env var.')
  }
  return client
}

const uploadFileSchema = z.object({
  agent_id: z.string().uuid('ID do agente inválido'),
  name: z.string().min(1, 'Nome é obrigatório').max(255),
  content: z.string().min(1, 'Conteúdo é obrigatório'),
  mime_type: z.string().default('text/plain'),
})

/**
 * Sanitize content for PostgreSQL TEXT fields
 * Removes null bytes (\u0000) which PostgreSQL doesn't support
 */
function sanitizeContent(content: string): string {
  // Remove null bytes that PostgreSQL can't store in TEXT fields
  // eslint-disable-next-line no-control-regex
  return content.replace(/\u0000/g, '')
}

// GET - List knowledge base files for an agent
export async function GET(request: NextRequest) {
  try {
    const supabase = getClient()
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agent_id')

    if (!agentId) {
      return NextResponse.json(
        { error: 'agent_id é obrigatório' },
        { status: 400 }
      )
    }

    // Validate agent exists
    const { data: agent, error: agentError } = await supabase
      .from('ai_agents')
      .select('id')
      .eq('id', agentId)
      .single()

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agente não encontrado' },
        { status: 404 }
      )
    }

    // Get knowledge base files
    const { data: files, error } = await supabase
      .from('ai_knowledge_files')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[knowledge] Error fetching files:', error)
      return NextResponse.json(
        { error: 'Erro ao buscar arquivos' },
        { status: 500 }
      )
    }

    return NextResponse.json({ files: files || [] })
  } catch (error) {
    console.error('[knowledge] GET Error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Upload a new knowledge base file
export async function POST(request: NextRequest) {
  try {
    const supabase = getClient()
    const body = await request.json()

    // Validate body
    const parsed = uploadFileSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { agent_id, name, content, mime_type } = parsed.data

    // Validate agent exists and get file_search_store_id
    const { data: agent, error: agentError } = await supabase
      .from('ai_agents')
      .select('id, name, file_search_store_id')
      .eq('id', agent_id)
      .single()

    if (agentError || !agent) {
      return NextResponse.json(
        { error: 'Agente não encontrado' },
        { status: 404 }
      )
    }

    // Get Gemini API key for file upload
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

    // Ensure File Search Store exists for this agent
    let fileSearchStoreName = agent.file_search_store_id

    try {
      fileSearchStoreName = await ensureFileSearchStore(
        apiKey,
        agent_id,
        agent.name,
        agent.file_search_store_id
      )

      // Update agent with store ID if it changed
      if (fileSearchStoreName !== agent.file_search_store_id) {
        await supabase
          .from('ai_agents')
          .update({ file_search_store_id: fileSearchStoreName })
          .eq('id', agent_id)

        console.log(`[knowledge] Updated agent ${agent_id} with store ${fileSearchStoreName}`)
      }
    } catch (storeError) {
      console.error('[knowledge] Failed to ensure File Search Store:', storeError)
      // Continue with local-only storage if store creation fails
      fileSearchStoreName = null
    }

    // Upload file to File Search Store (for RAG semantic search)
    let fileSearchFileName: string | null = null
    let indexingStatus: 'completed' | 'processing' | 'failed' | 'local_only' = 'local_only'

    if (fileSearchStoreName) {
      try {
        console.log(`[knowledge] Uploading ${name} to File Search Store ${fileSearchStoreName}`)

        const operation = await uploadToFileSearchStore(
          apiKey,
          fileSearchStoreName,
          content,
          name,
          mime_type
        )

        console.log(`[knowledge] Upload operation started: ${operation.name}`)

        // Wait for the upload/indexing to complete
        if (!operation.done && operation.name) {
          const completedOp = await waitForOperation(apiKey, operation.name, 30, 2000)
          console.log(`[knowledge] File indexed successfully`)
          indexingStatus = 'completed'

          // Extract the file name from the operation metadata if available
          // Format: fileSearchStores/{storeId}/files/{fileId}
          if (completedOp.metadata && typeof completedOp.metadata === 'object') {
            fileSearchFileName = (completedOp.metadata as { name?: string }).name || null
          }
        } else if (operation.done) {
          indexingStatus = 'completed'
        }
      } catch (uploadError) {
        console.error('[knowledge] File Search Store upload error:', uploadError)
        indexingStatus = 'failed'
        // Continue - we'll save locally and can retry later
      }
    }

    // Sanitize content for PostgreSQL (remove null bytes)
    // Note: We don't need to store full binary content anymore since
    // File Search Store handles indexing, but we keep it for:
    // - Fallback when store is unavailable
    // - Display preview in UI
    // - Text files that need local processing
    const sanitizedContent = sanitizeContent(content)

    // Save file metadata to database
    const { data: file, error } = await supabase
      .from('ai_knowledge_files')
      .insert({
        agent_id,
        name,
        mime_type,
        size_bytes: new TextEncoder().encode(sanitizedContent).length,
        content: sanitizedContent,
        external_file_id: fileSearchFileName, // Now stores the File Search file name
        external_file_uri: fileSearchStoreName, // Store the store name for reference
        indexing_status: indexingStatus,
      })
      .select()
      .single()

    if (error) {
      console.error('[knowledge] Error saving file:', error)
      return NextResponse.json(
        { error: 'Erro ao salvar arquivo' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      file,
      file_search_store: fileSearchStoreName,
      indexing_status: indexingStatus,
    }, { status: 201 })
  } catch (error) {
    console.error('[knowledge] POST Error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Remove a knowledge base file
export async function DELETE(request: NextRequest) {
  try {
    const supabase = getClient()
    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get('id')

    if (!fileId) {
      return NextResponse.json(
        { error: 'id é obrigatório' },
        { status: 400 }
      )
    }

    // Get file to check for external file
    const { data: file, error: fileError } = await supabase
      .from('ai_knowledge_files')
      .select('*')
      .eq('id', fileId)
      .single()

    if (fileError || !file) {
      return NextResponse.json(
        { error: 'Arquivo não encontrado' },
        { status: 404 }
      )
    }

    // Try to delete from File Search Store if external file exists
    if (file.external_file_id) {
      try {
        const { data: geminiSetting } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'gemini_api_key')
          .maybeSingle()

        const apiKey = geminiSetting?.value || process.env.GEMINI_API_KEY

        if (apiKey) {
          // external_file_id now contains the File Search file name
          // Format: fileSearchStores/{storeId}/files/{fileId}
          await deleteFileFromStore(apiKey, file.external_file_id)
          console.log(`[knowledge] Deleted file from File Search Store: ${file.external_file_id}`)
        }
      } catch (deleteError) {
        console.error('[knowledge] Error deleting from File Search Store:', deleteError)
        // Continue with local deletion even if external fails
      }
    }

    // Delete from database
    const { error } = await supabase
      .from('ai_knowledge_files')
      .delete()
      .eq('id', fileId)

    if (error) {
      console.error('[knowledge] Error deleting file:', error)
      return NextResponse.json(
        { error: 'Erro ao excluir arquivo' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, deleted: fileId })
  } catch (error) {
    console.error('[knowledge] DELETE Error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
