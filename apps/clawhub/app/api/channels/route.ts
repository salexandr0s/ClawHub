import { NextRequest, NextResponse } from 'next/server'
import { getRepos } from '@/lib/repo'
import {
  runCommandJson,
  isAllowedCommand,
  getCommandSpec,
  type AllowedCommandId,
} from '@clawhub/adapters-openclaw'

// Types for channels
interface Channel {
  id: string
  name: string
  type: string
  status: 'connected' | 'disconnected' | 'error' | 'unknown'
  lastActivity?: string
  config?: Record<string, unknown>
  error?: string
}

interface ChannelHealthCheck {
  id: string
  name: string
  type: string
  healthy: boolean
  latencyMs?: number
  message?: string
  lastChecked: string
}

interface ChannelsListResponse {
  channels?: Channel[]
  // Handle alternative response shapes from CLI
  [key: string]: unknown
}

interface ChannelsStatusResponse {
  channels?: Array<{
    id: string
    name?: string
    type?: string
    status: 'connected' | 'disconnected' | 'error' | 'unknown'
    lastActivity?: string
  }>
  [key: string]: unknown
}

interface ChannelsCheckResponse {
  checks?: ChannelHealthCheck[]
  results?: ChannelHealthCheck[]
  [key: string]: unknown
}

/**
 * GET /api/channels
 * Get channels list or status
 *
 * Query params:
 * - action: 'list' | 'status' | 'check' (default: 'list')
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'list'

  // Determine which command to run
  let commandId: AllowedCommandId
  switch (action) {
    case 'status':
      commandId = 'channels.status.json'
      break
    case 'check':
      commandId = 'channels.check.json'
      break
    case 'list':
    default:
      commandId = 'channels.list.json'
      break
  }

  // Validate command is in allowlist
  if (!isAllowedCommand(commandId)) {
    return NextResponse.json(
      { error: `Command not allowed: ${commandId}` },
      { status: 403 }
    )
  }

  const repos = getRepos()
  const commandSpec = getCommandSpec(commandId)

  // Create a receipt for this request
  const receipt = await repos.receipts.create({
    workOrderId: 'system',
    kind: 'manual',
    commandName: `channels.${action}`,
    commandArgs: {
      commandId,
      action,
      description: commandSpec.description,
    },
  })

  try {
    if (action === 'list') {
      const result = await runCommandJson<ChannelsListResponse>(commandId)

      if (result.error || !result.data) {
        await repos.receipts.finalize(receipt.id, {
          exitCode: result.exitCode,
          durationMs: 0,
          parsedJson: { action, error: result.error },
        })

        return NextResponse.json(
          { error: result.error || 'Failed to fetch channels', receiptId: receipt.id },
          { status: 500 }
        )
      }

      // Normalize response - handle different CLI output shapes
      const channels: Channel[] = result.data.channels || []

      await repos.receipts.finalize(receipt.id, {
        exitCode: 0,
        durationMs: 0,
        parsedJson: { action, channelsCount: channels.length },
      })

      return NextResponse.json({
        data: channels,
        receiptId: receipt.id,
      })
    }

    if (action === 'status') {
      const result = await runCommandJson<ChannelsStatusResponse>(commandId)

      if (result.error || !result.data) {
        await repos.receipts.finalize(receipt.id, {
          exitCode: result.exitCode,
          durationMs: 0,
          parsedJson: { action, error: result.error },
        })

        return NextResponse.json(
          { error: result.error || 'Failed to fetch status', receiptId: receipt.id },
          { status: 500 }
        )
      }

      // Normalize response
      const channels = result.data.channels || []

      await repos.receipts.finalize(receipt.id, {
        exitCode: 0,
        durationMs: 0,
        parsedJson: { action, channelsCount: channels.length },
      })

      return NextResponse.json({
        data: channels,
        receiptId: receipt.id,
      })
    }

    if (action === 'check') {
      const result = await runCommandJson<ChannelsCheckResponse>(commandId)

      if (result.error || !result.data) {
        await repos.receipts.finalize(receipt.id, {
          exitCode: result.exitCode,
          durationMs: 0,
          parsedJson: { action, error: result.error },
        })

        return NextResponse.json(
          { error: result.error || 'Failed to check channels', receiptId: receipt.id },
          { status: 500 }
        )
      }

      // Normalize response - handle checks or results
      const checks: ChannelHealthCheck[] = result.data.checks || result.data.results || []

      await repos.receipts.finalize(receipt.id, {
        exitCode: 0,
        durationMs: 0,
        parsedJson: { action, checksCount: checks.length },
      })

      return NextResponse.json({
        data: checks,
        receiptId: receipt.id,
      })
    }

    // Unknown action
    await repos.receipts.finalize(receipt.id, {
      exitCode: 1,
      durationMs: 0,
      parsedJson: { action, error: 'Unknown action' },
    })

    return NextResponse.json(
      { error: `Unknown action: ${action}`, receiptId: receipt.id },
      { status: 400 }
    )
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to execute channels command'

    await repos.receipts.finalize(receipt.id, {
      exitCode: 1,
      durationMs: 0,
      parsedJson: { action, error: errorMessage },
    })

    return NextResponse.json(
      { error: errorMessage, receiptId: receipt.id },
      { status: 500 }
    )
  }
}
