import { NextRequest, NextResponse } from 'next/server'
import { getRepos } from '@/lib/repo'
import {
  runCommandJson,
  runCommand,
  isAllowedCommand,
  getCommandSpec,
  type AllowedCommandId,
} from '@clawhub/adapters-openclaw'

// Types
interface MemoryStatus {
  filesIndexed: number
  totalChunks: number
  backend: string
  lastIndexed?: string
  indexSizeBytes?: number
  workspacePath?: string
}

interface SearchResult {
  path: string
  snippet: string
  score: number
  line?: number
}

interface DailyNoteInfo {
  date: string
  exists: boolean
  eventCount?: number
  sizeBytes?: number
}

// Response shapes from CLI
interface MemoryStatusResponse {
  files?: number
  filesIndexed?: number
  chunks?: number
  totalChunks?: number
  backend?: string
  lastIndexed?: string
  sizeBytes?: number
  indexSizeBytes?: number
  workspacePath?: string
  [key: string]: unknown
}

interface MemorySearchResponse {
  results?: SearchResult[]
  matches?: SearchResult[]
  [key: string]: unknown
}

/**
 * GET /api/memory
 * Get memory status, search, or daily notes
 *
 * Query params:
 * - action: 'status' | 'search' | 'daily-notes' | 'daily-note' (default: 'status')
 * - q: search query (for action=search)
 * - date: YYYY-MM-DD (for action=daily-note)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'status'
  const query = searchParams.get('q')
  const date = searchParams.get('date')

  const repos = getRepos()

  // Handle different actions
  if (action === 'status') {
    const commandId: AllowedCommandId = 'memory.status.json'

    if (!isAllowedCommand(commandId)) {
      return NextResponse.json(
        { error: `Command not allowed: ${commandId}` },
        { status: 403 }
      )
    }

    const commandSpec = getCommandSpec(commandId)

    const receipt = await repos.receipts.create({
      workOrderId: 'system',
      kind: 'manual',
      commandName: 'memory.status',
      commandArgs: {
        commandId,
        description: commandSpec.description,
      },
    })

    try {
      const result = await runCommandJson<MemoryStatusResponse>(commandId)

      if (result.error || !result.data) {
        await repos.receipts.finalize(receipt.id, {
          exitCode: result.exitCode,
          durationMs: 0,
          parsedJson: { error: result.error },
        })

        return NextResponse.json(
          { error: result.error || 'Failed to fetch memory status', receiptId: receipt.id },
          { status: 500 }
        )
      }

      // Normalize response
      const status: MemoryStatus = {
        filesIndexed: result.data.filesIndexed ?? result.data.files ?? 0,
        totalChunks: result.data.totalChunks ?? result.data.chunks ?? 0,
        backend: result.data.backend ?? 'unknown',
        lastIndexed: result.data.lastIndexed,
        indexSizeBytes: result.data.indexSizeBytes ?? result.data.sizeBytes,
        workspacePath: result.data.workspacePath,
      }

      await repos.receipts.finalize(receipt.id, {
        exitCode: 0,
        durationMs: 0,
        parsedJson: { filesIndexed: status.filesIndexed, totalChunks: status.totalChunks },
      })

      return NextResponse.json({
        data: status,
        receiptId: receipt.id,
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch memory status'

      await repos.receipts.finalize(receipt.id, {
        exitCode: 1,
        durationMs: 0,
        parsedJson: { error: errorMessage },
      })

      return NextResponse.json(
        { error: errorMessage, receiptId: receipt.id },
        { status: 500 }
      )
    }
  }

  if (action === 'search') {
    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      )
    }

    const receipt = await repos.receipts.create({
      workOrderId: 'system',
      kind: 'manual',
      commandName: 'memory.search',
      commandArgs: { query },
    })

    try {
      // Memory search uses dynamic command with query parameter
      // For now, we'll use a simple implementation
      // In production, this would use runDynamicCommandJson with 'memory.search'
      const results: SearchResult[] = []

      await repos.receipts.finalize(receipt.id, {
        exitCode: 0,
        durationMs: 0,
        parsedJson: { query, resultsCount: results.length },
      })

      return NextResponse.json({
        data: results,
        receiptId: receipt.id,
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed'

      await repos.receipts.finalize(receipt.id, {
        exitCode: 1,
        durationMs: 0,
        parsedJson: { query, error: errorMessage },
      })

      return NextResponse.json(
        { error: errorMessage, receiptId: receipt.id },
        { status: 500 }
      )
    }
  }

  if (action === 'daily-notes') {
    // List all daily notes by scanning memory directory
    const receipt = await repos.receipts.create({
      workOrderId: 'system',
      kind: 'manual',
      commandName: 'memory.daily-notes',
      commandArgs: {},
    })

    try {
      // This would typically scan the memory directory for YYYY-MM-DD.md files
      // For now, return an empty list that can be populated when the feature is fully implemented
      const notes: DailyNoteInfo[] = []

      await repos.receipts.finalize(receipt.id, {
        exitCode: 0,
        durationMs: 0,
        parsedJson: { notesCount: notes.length },
      })

      return NextResponse.json({
        data: notes,
        receiptId: receipt.id,
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch daily notes'

      await repos.receipts.finalize(receipt.id, {
        exitCode: 1,
        durationMs: 0,
        parsedJson: { error: errorMessage },
      })

      return NextResponse.json(
        { error: errorMessage, receiptId: receipt.id },
        { status: 500 }
      )
    }
  }

  if (action === 'daily-note') {
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: 'Valid date (YYYY-MM-DD) is required' },
        { status: 400 }
      )
    }

    const receipt = await repos.receipts.create({
      workOrderId: 'system',
      kind: 'manual',
      commandName: 'memory.daily-note',
      commandArgs: { date },
    })

    try {
      // This would read the daily note file from memory/YYYY-MM-DD.md
      // For now, return null content
      const content: string | null = null

      await repos.receipts.finalize(receipt.id, {
        exitCode: 0,
        durationMs: 0,
        parsedJson: { date, exists: content !== null },
      })

      return NextResponse.json({
        data: { content },
        receiptId: receipt.id,
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch daily note'

      await repos.receipts.finalize(receipt.id, {
        exitCode: 1,
        durationMs: 0,
        parsedJson: { date, error: errorMessage },
      })

      return NextResponse.json(
        { error: errorMessage, receiptId: receipt.id },
        { status: 500 }
      )
    }
  }

  return NextResponse.json(
    { error: `Unknown action: ${action}` },
    { status: 400 }
  )
}

/**
 * POST /api/memory
 * Rebuild memory index
 *
 * Body:
 * - action: 'rebuild'
 * - typedConfirmText: string (required for rebuild)
 */
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action, typedConfirmText } = body

  if (action !== 'rebuild') {
    return NextResponse.json(
      { error: `Unknown action: ${action}` },
      { status: 400 }
    )
  }

  const commandId: AllowedCommandId = 'memory.index'

  if (!isAllowedCommand(commandId)) {
    return NextResponse.json(
      { error: `Command not allowed: ${commandId}` },
      { status: 403 }
    )
  }

  const commandSpec = getCommandSpec(commandId)

  // Verify this is a dangerous command and confirmation is required
  if (commandSpec.danger && !typedConfirmText) {
    return NextResponse.json(
      { error: 'Confirmation required for this action' },
      { status: 400 }
    )
  }

  const repos = getRepos()

  const receipt = await repos.receipts.create({
    workOrderId: 'system',
    kind: 'manual',
    commandName: 'memory.index',
    commandArgs: {
      commandId,
      description: commandSpec.description,
    },
  })

  try {
    const result = await runCommand(commandId)

    await repos.receipts.finalize(receipt.id, {
      exitCode: result.exitCode,
      durationMs: result.durationMs,
      parsedJson: {
        success: result.exitCode === 0,
        timedOut: result.timedOut,
      },
    })

    if (result.exitCode !== 0) {
      return NextResponse.json(
        { error: result.stderr || 'Failed to rebuild index', receiptId: receipt.id },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: { success: true },
      receiptId: receipt.id,
    })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to rebuild index'

    await repos.receipts.finalize(receipt.id, {
      exitCode: 1,
      durationMs: 0,
      parsedJson: { error: errorMessage },
    })

    return NextResponse.json(
      { error: errorMessage, receiptId: receipt.id },
      { status: 500 }
    )
  }
}
