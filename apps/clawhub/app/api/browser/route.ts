import { NextRequest, NextResponse } from 'next/server'
import { getRepos } from '@/lib/repo'
import {
  runCommand,
  runCommandJson,
  isAllowedCommand,
  getCommandSpec,
  type AllowedCommandId,
} from '@clawhub/adapters-openclaw'

// Types for browser status
interface BrowserStatus {
  running: boolean
  pid?: number
  url?: string
  profilePath?: string
  version?: string
}

interface BrowserTab {
  id: string
  title: string
  url: string
  active: boolean
}

/**
 * GET /api/browser
 * Get browser status
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'status'

  let commandId: AllowedCommandId

  switch (action) {
    case 'status':
      commandId = 'browser.status.json'
      break
    case 'tabs':
      commandId = 'browser.tabs.json'
      break
    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  }

  if (!isAllowedCommand(commandId)) {
    return NextResponse.json(
      { error: `Command not allowed: ${commandId}` },
      { status: 403 }
    )
  }

  const repos = getRepos()
  const commandSpec = getCommandSpec(commandId)

  const receipt = await repos.receipts.create({
    workOrderId: 'system',
    kind: 'manual',
    commandName: `browser.${action}`,
    commandArgs: {
      commandId,
      action,
      description: commandSpec.description,
    },
  })

  try {
    const cmdResult = await runCommandJson<BrowserStatus | BrowserTab[]>(commandId)

    if (cmdResult.error || !cmdResult.data) {
      // Try non-JSON fallback for status
      if (action === 'status') {
        const textResult = await runCommand('browser.status')
        const status = parseStatusText(textResult.stdout)

        await repos.receipts.finalize(receipt.id, {
          exitCode: textResult.exitCode,
          durationMs: textResult.durationMs,
          parsedJson: { status, mode: 'text_fallback' },
        })

        return NextResponse.json({
          data: status,
          receiptId: receipt.id,
        })
      }

      await repos.receipts.finalize(receipt.id, {
        exitCode: cmdResult.exitCode,
        durationMs: 0,
        parsedJson: { error: cmdResult.error || 'No data returned' },
      })

      return NextResponse.json(
        { error: cmdResult.error || `${action} failed with no output`, receiptId: receipt.id },
        { status: 500 }
      )
    }

    await repos.receipts.finalize(receipt.id, {
      exitCode: 0,
      durationMs: 0,
      parsedJson: { action, success: true },
    })

    return NextResponse.json({
      data: cmdResult.data,
      receiptId: receipt.id,
    })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : `${action} failed`

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

/**
 * POST /api/browser
 * Perform browser actions (start, stop, screenshot, snapshot, reset-profile)
 */
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action, typedConfirmText } = body as {
    action: 'start' | 'stop' | 'screenshot' | 'snapshot' | 'reset-profile'
    typedConfirmText?: string
  }

  let commandId: AllowedCommandId

  switch (action) {
    case 'start':
      commandId = 'browser.start'
      break
    case 'stop':
      commandId = 'browser.stop'
      break
    case 'screenshot':
      commandId = 'browser.screenshot'
      break
    case 'snapshot':
      commandId = 'browser.snapshot'
      break
    case 'reset-profile':
      commandId = 'browser.reset-profile'
      break
    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  }

  if (!isAllowedCommand(commandId)) {
    return NextResponse.json(
      { error: `Command not allowed: ${commandId}` },
      { status: 403 }
    )
  }

  const repos = getRepos()
  const commandSpec = getCommandSpec(commandId)

  const receipt = await repos.receipts.create({
    workOrderId: 'system',
    kind: 'manual',
    commandName: `browser.${action}`,
    commandArgs: {
      commandId,
      action,
      description: commandSpec.description,
    },
  })

  try {
    const cmdResult = await runCommand(commandId)

    if (cmdResult.exitCode !== 0) {
      await repos.receipts.finalize(receipt.id, {
        exitCode: cmdResult.exitCode,
        durationMs: cmdResult.durationMs,
        parsedJson: { error: cmdResult.stderr || 'Command failed' },
      })

      return NextResponse.json(
        { error: cmdResult.stderr || `${action} failed`, receiptId: receipt.id },
        { status: 500 }
      )
    }

    // Special handling for screenshot and snapshot
    let responseData: Record<string, unknown> = { success: true }

    if (action === 'screenshot') {
      // Assume stdout contains base64 data or file path
      responseData = { dataUrl: `data:image/png;base64,${cmdResult.stdout.trim()}` }
    } else if (action === 'snapshot') {
      responseData = { html: cmdResult.stdout }
    }

    await repos.receipts.finalize(receipt.id, {
      exitCode: 0,
      durationMs: cmdResult.durationMs,
      parsedJson: { action, success: true },
    })

    // Log activity
    await repos.activities.create({
      type: `browser.${action}`,
      actor: 'user',
      entityType: 'browser',
      entityId: 'main',
      summary: `Browser ${action} executed successfully`,
      payloadJson: { action, receiptId: receipt.id },
    })

    return NextResponse.json({
      data: responseData,
      receiptId: receipt.id,
    })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : `${action} failed`

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

/**
 * Parse text output to browser status
 */
function parseStatusText(text: string): BrowserStatus {
  const running = text.toLowerCase().includes('running')
  const pidMatch = text.match(/pid[:\s]+(\d+)/i)
  const urlMatch = text.match(/url[:\s]+(\S+)/i)

  return {
    running,
    pid: pidMatch ? parseInt(pidMatch[1], 10) : undefined,
    url: urlMatch ? urlMatch[1] : undefined,
  }
}
