/**
 * Google File Search Store API Helpers
 *
 * Provides functions to manage File Search Stores for RAG (Retrieval Augmented Generation)
 * with Gemini models.
 *
 * Flow:
 * 1. Create a File Search Store (one per agent)
 * 2. Upload files to the store (they get indexed automatically)
 * 3. Use google.tools.fileSearch() in generateText to query the indexed documents
 */

// ============================================================================
// Types
// ============================================================================

export interface FileSearchStore {
  name: string // e.g., "fileSearchStores/abc123"
  displayName?: string
  createTime?: string
}

export interface FileSearchFile {
  name: string // e.g., "fileSearchStores/abc123/files/xyz789"
  displayName?: string
  state?: 'PROCESSING' | 'ACTIVE' | 'FAILED'
}

export interface FileSearchOperation {
  name: string
  done: boolean
  metadata?: Record<string, unknown>
  error?: { code: number; message: string }
}

// ============================================================================
// File Search Store CRUD
// ============================================================================

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'

/**
 * Create a new File Search Store
 */
export async function createFileSearchStore(
  apiKey: string,
  displayName: string
): Promise<FileSearchStore> {
  const response = await fetch(`${BASE_URL}/fileSearchStores?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('[file-search-store] Create store error:', error)
    throw new Error(`Failed to create File Search Store: ${error}`)
  }

  return response.json()
}

/**
 * Get a File Search Store by name
 */
export async function getFileSearchStore(
  apiKey: string,
  storeName: string
): Promise<FileSearchStore | null> {
  const response = await fetch(`${BASE_URL}/${storeName}?key=${apiKey}`)

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    const error = await response.text()
    console.error('[file-search-store] Get store error:', error)
    throw new Error(`Failed to get File Search Store: ${error}`)
  }

  return response.json()
}

/**
 * Delete a File Search Store
 */
export async function deleteFileSearchStore(
  apiKey: string,
  storeName: string,
  force = true
): Promise<void> {
  const url = `${BASE_URL}/${storeName}?key=${apiKey}${force ? '&force=true' : ''}`
  const response = await fetch(url, { method: 'DELETE' })

  if (!response.ok && response.status !== 404) {
    const error = await response.text()
    console.error('[file-search-store] Delete store error:', error)
    throw new Error(`Failed to delete File Search Store: ${error}`)
  }
}

// ============================================================================
// File Operations
// ============================================================================

/**
 * Upload a file directly to a File Search Store
 * The file will be chunked, embedded, and indexed automatically
 *
 * Uses the multipart upload approach as documented in Google's API
 */
export async function uploadToFileSearchStore(
  apiKey: string,
  storeName: string,
  fileContent: ArrayBuffer | Blob | string,
  fileName: string,
  mimeType: string
): Promise<FileSearchOperation> {
  // Convert content to Blob
  let blob: Blob
  if (typeof fileContent === 'string') {
    blob = new Blob([fileContent], { type: mimeType })
  } else if (fileContent instanceof Blob) {
    blob = fileContent
  } else {
    // ArrayBuffer
    blob = new Blob([fileContent], { type: mimeType })
  }

  // Use the simple multipart upload
  const uploadUrl = `https://generativelanguage.googleapis.com/upload/v1beta/${storeName}:uploadToFileSearchStore?key=${apiKey}`

  // Create multipart form data
  const formData = new FormData()
  formData.append('config', JSON.stringify({ displayName: fileName }))
  formData.append('file', blob, fileName)

  const response = await fetch(uploadUrl, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('[file-search-store] Upload error:', error)
    throw new Error(`Failed to upload file: ${error}`)
  }

  const result = await response.json()
  console.log('[file-search-store] Upload response:', JSON.stringify(result, null, 2))

  return result
}

/**
 * Import an already uploaded file (via Files API) to a File Search Store
 */
export async function importFileToStore(
  apiKey: string,
  storeName: string,
  fileName: string // e.g., "files/abc123"
): Promise<FileSearchOperation> {
  const response = await fetch(
    `${BASE_URL}/${storeName}:importFile?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    console.error('[file-search-store] Import error:', error)
    throw new Error(`Failed to import file: ${error}`)
  }

  return response.json()
}

/**
 * Delete a file from a File Search Store
 * Silently ignores 404 (not found) and 403 (permission denied for old files)
 */
export async function deleteFileFromStore(
  apiKey: string,
  fileSearchFileName: string // e.g., "fileSearchStores/xxx/files/yyy"
): Promise<void> {
  // Only attempt delete if the file name looks like a File Search Store file
  if (!fileSearchFileName.startsWith('fileSearchStores/')) {
    console.log(`[file-search-store] Skipping delete for non-store file: ${fileSearchFileName}`)
    return
  }

  const response = await fetch(
    `${BASE_URL}/${fileSearchFileName}?key=${apiKey}`,
    { method: 'DELETE' }
  )

  // Ignore 404 (not found) and 403 (old files from different API)
  if (!response.ok && response.status !== 404 && response.status !== 403) {
    const error = await response.text()
    console.error('[file-search-store] Delete file error:', error)
    throw new Error(`Failed to delete file: ${error}`)
  }

  if (response.status === 403) {
    console.log(`[file-search-store] File not in store (403), skipping: ${fileSearchFileName}`)
  }
}

// ============================================================================
// Operation Polling
// ============================================================================

/**
 * Poll an operation until it completes
 */
export async function waitForOperation(
  apiKey: string,
  operationName: string,
  maxAttempts = 30,
  delayMs = 2000
): Promise<FileSearchOperation> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await fetch(
      `${BASE_URL}/${operationName}?key=${apiKey}`
    )

    if (!response.ok) {
      console.error(`[file-search-store] Operation check failed (attempt ${attempt})`)
      if (attempt === maxAttempts) {
        throw new Error('Max attempts reached checking operation status')
      }
      await new Promise(resolve => setTimeout(resolve, delayMs))
      continue
    }

    const operation: FileSearchOperation = await response.json()

    if (operation.done) {
      if (operation.error) {
        throw new Error(`Operation failed: ${operation.error.message}`)
      }
      console.log(`[file-search-store] Operation completed after ${attempt} attempt(s)`)
      return operation
    }

    if (attempt < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }

  throw new Error('Operation timed out')
}

// ============================================================================
// Helper to ensure store exists
// ============================================================================

/**
 * Ensure a File Search Store exists for an agent
 * Returns existing store name or creates a new one
 */
export async function ensureFileSearchStore(
  apiKey: string,
  agentId: string,
  agentName: string,
  existingStoreName?: string | null
): Promise<string> {
  // If we have an existing store, verify it still exists
  if (existingStoreName) {
    const store = await getFileSearchStore(apiKey, existingStoreName)
    if (store) {
      return existingStoreName
    }
    console.log(`[file-search-store] Store ${existingStoreName} not found, creating new one`)
  }

  // Create new store
  const displayName = `smartzap-agent-${agentName}-${agentId.slice(0, 8)}`
  const store = await createFileSearchStore(apiKey, displayName)

  console.log(`[file-search-store] Created new store: ${store.name}`)
  return store.name
}
