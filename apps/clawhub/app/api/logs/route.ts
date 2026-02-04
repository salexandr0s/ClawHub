import { NextRequest, NextResponse } from 'next/server'
import { getRepos } from '@/lib/repo'
import {
  runCommand,
  runCommandJson,
  isAllowedCommand,
  getCommandSpec,
  type AllowedCommandId,
} from '@clawhub/adapters-openclaw'

// Types for log entries
interface LogEntry {
  timestamp: string
  level: 'error' | 'warn' | 'info' | 'debug' | 'trace'
  message: string
  source?: string
  context?: Record<string, unknown>
}

interface LogsResponse {
  entries: LogEntry[]
  raw: string
}

/**
 * GET /api/logs
 * Get recent log entries from OpenClaw
 *
 * Query params:
 * - source: 'all' | 'gateway' (default: 'all')
 * - limit: number (default: 300)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const source = searchParams.get('source') || 'all'

  // Determine which command to run
  let commandId: AllowedCommandId
  if (source === 'gateway') {
    commandId = 'gateway.logs.json'
  } else {
    commandId = 'logs.recent.json'
  }

  // Validate command is in allowlist
  if (!isAllowedCommand(commandId)) {
    // Fall back to non-JSON version
    commandId = source === 'gateway' ? 'gateway.logs' : 'logs.recent'
    if (!isAllowedCommand(commandId)) {
      return NextResponse.json(
        { error: `Command not allowed: ${commandId}` },
        { status: 403 }
      )
    }
  }

  const repos = getRepos()
  const commandSpec = getCommandSpec(commandId)

  // Create a receipt for this logs fetch
  const receipt = await repos.receipts.create({
    workOrderId: 'system',
    kind: 'manual',
    commandName: `logs.${source}`,
    commandArgs: {
      commandId,
      source,
      description: commandSpec.description,
    },
  })

  try {
    // Try JSON output first
    if (commandId.endsWith('.json')) {
      const cmdResult = await runCommandJson<LogEntry[] | { entries: LogEntry[] }>(commandId)

      if (cmdResult.error || !cmdResult.data) {
        // Fall back to text parsing
        const textResult = await runCommand(source === 'gateway' ? 'gateway.logs' : 'logs.recent')
        const entries = parseLogText(textResult.stdout)

        await repos.receipts.finalize(receipt.id, {
          exitCode: textResult.exitCode,
          durationMs: textResult.durationMs,
          parsedJson: {
            source,
            entriesCount: entries.length,
            mode: 'text_fallback',
          },
        })

        return NextResponse.json({
          data: {
            entries,
            raw: textResult.stdout,
          },
          receiptId: receipt.id,
        })
      }

      // Parse the JSON response
      const entries = Array.isArray(cmdResult.data)
        ? cmdResult.data
        : cmdResult.data.entries || []

      await repos.receipts.finalize(receipt.id, {
        exitCode: 0,
        durationMs: 0,
        parsedJson: {
          source,
          entriesCount: entries.length,
          mode: 'json',
        },
      })

      return NextResponse.json({
        data: {
          entries,
          raw: JSON.stringify(entries, null, 2),
        },
        receiptId: receipt.id,
      })
    } else {
      // Non-JSON command - parse text output
      const textResult = await runCommand(commandId)
      const entries = parseLogText(textResult.stdout)

      await repos.receipts.finalize(receipt.id, {
        exitCode: textResult.exitCode,
        durationMs: textResult.durationMs,
        parsedJson: {
          source,
          entriesCount: entries.length,
          mode: 'text',
        },
      })

      return NextResponse.json({
        data: {
          entries,
          raw: textResult.stdout,
        },
        receiptId: receipt.id,
      })
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to fetch logs'

    await repos.receipts.finalize(receipt.id, {
      exitCode: 1,
      durationMs: 0,
      parsedJson: {
        source,
        error: errorMessage,
      },
    })

    return NextResponse.json(
      {
        error: errorMessage,
        receiptId: receipt.id,
      },
      { status: 500 }
    )
  }
}

/**
 * Parse log text output into structured entries
 */
function parseLogText(text: string): LogEntry[] {
  const entries: LogEntry[] = []
  const lines = text.split('\n').filter((line) => line.trim())

  for (const line of lines) {
    const entry = parseLogLine(line)
    if (entry) {
      entries.push(entry)
    }
  }

  return entries
}

/**
 * Parse a single log line into a LogEntry
 *
 * Common formats:
 * - [2024-01-15T10:30:00.000Z] [INFO] [source] Message
 * - 2024-01-15 10:30:00 INFO Message
 * - [INFO] Message
 */
function parseLogLine(line: string): LogEntry | null {
  // Skip empty lines
  if (!line.trim()) return null

  // Try structured format: [timestamp] [LEVEL] [source] message
  const structuredMatch = line.match(
    /^\[([^\]]+)\]\s*\[(\w+)\]\s*(?:\[([^\]]+)\]\s*)?(.*)$/
  )

  if (structuredMatch) {
    const [, timestamp, level, source, message] = structuredMatch
    return {
      timestamp: normalizeTimestamp(timestamp),
      level: normalizeLevel(level),
      source: source || undefined,
      message: message.trim(),
    }
  }

  // Try simpler format: timestamp LEVEL message
  const simpleMatch = line.match(
    /^(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)\s+(\w+)\s+(.*)$/
  )

  if (simpleMatch) {
    const [, timestamp, level, message] = simpleMatch
    return {
      timestamp: normalizeTimestamp(timestamp),
      level: normalizeLevel(level),
      message: message.trim(),
    }
  }

  // Try level-only format: [LEVEL] message
  const levelOnlyMatch = line.match(/^\[(\w+)\]\s*(.*)$/)

  if (levelOnlyMatch) {
    const [, level, message] = levelOnlyMatch
    return {
      timestamp: new Date().toISOString(),
      level: normalizeLevel(level),
      message: message.trim(),
    }
  }

  // Fallback: treat as info message
  return {
    timestamp: new Date().toISOString(),
    level: 'info',
    message: line.trim(),
  }
}

function normalizeTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp)
    if (!isNaN(date.getTime())) {
      return date.toISOString()
    }
  } catch {
    // Fallback
  }
  return timestamp
}

function normalizeLevel(level: string): LogEntry['level'] {
  const normalized = level.toLowerCase()
  if (normalized === 'error' || normalized === 'err' || normalized === 'fatal') {
    return 'error'
  }
  if (normalized === 'warn' || normalized === 'warning') {
    return 'warn'
  }
  if (normalized === 'info') {
    return 'info'
  }
  if (normalized === 'debug' || normalized === 'dbg') {
    return 'debug'
  }
  if (normalized === 'trace' || normalized === 'verbose') {
    return 'trace'
  }
  return 'info'
}
