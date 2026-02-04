import { NextRequest, NextResponse } from 'next/server'
import { getRepos } from '@/lib/repo'
import {
  runCommandJson,
  isAllowedCommand,
  getCommandSpec,
  type AllowedCommandId,
} from '@clawhub/adapters-openclaw'

// Types for status response
interface GatewayStatus {
  running: boolean
  url?: string
  pid?: number
  clients?: number
}

interface ModelConfig {
  default: string
  fallbacks: string[]
  configured: number
}

interface AuthProvider {
  provider: string
  status: 'ok' | 'expiring' | 'expired' | 'missing'
  profiles: number
}

interface CronStatus {
  enabled: boolean
  jobCount: number
  nextRun?: string
}

interface PluginStatus {
  installed: number
  active: number
}

interface FullStatusReport {
  version: string
  build?: string
  uptime?: number
  uptimeHuman?: string
  workspace: string
  configPath: string
  dataDir: string
  gateway: GatewayStatus
  models: ModelConfig
  auth: {
    providers: AuthProvider[]
  }
  cron: CronStatus
  plugins: PluginStatus
  memory?: {
    indexed: number
    lastIndexed?: string
  }
  raw?: string
}

/**
 * GET /api/status
 * Get comprehensive system status from OpenClaw
 */
export async function GET(request: NextRequest) {
  const commandId: AllowedCommandId = 'status.all.json'

  // Validate command is in allowlist
  if (!isAllowedCommand(commandId)) {
    return NextResponse.json(
      { error: `Command not allowed: ${commandId}` },
      { status: 403 }
    )
  }

  const repos = getRepos()
  const commandSpec = getCommandSpec(commandId)

  // Create a receipt for this status check
  const receipt = await repos.receipts.create({
    workOrderId: 'system',
    kind: 'manual',
    commandName: 'status.all',
    commandArgs: {
      commandId,
      description: commandSpec.description,
    },
  })

  try {
    // Execute the command with JSON output
    const cmdResult = await runCommandJson<Record<string, unknown>>(commandId)

    if (cmdResult.error || !cmdResult.data) {
      // Finalize receipt with error
      await repos.receipts.finalize(receipt.id, {
        exitCode: cmdResult.exitCode,
        durationMs: 0,
        parsedJson: {
          error: cmdResult.error || 'No data returned',
        },
      })

      return NextResponse.json(
        {
          error: cmdResult.error || 'Status check failed with no output',
          receiptId: receipt.id,
        },
        { status: 500 }
      )
    }

    // Parse and normalize the response
    const data = cmdResult.data
    const report: FullStatusReport = normalizeStatusReport(data)

    // Finalize receipt with success
    await repos.receipts.finalize(receipt.id, {
      exitCode: 0,
      durationMs: 0,
      parsedJson: {
        version: report.version,
        gatewayRunning: report.gateway.running,
        modelDefault: report.models.default,
      },
    })

    // Log activity
    await repos.activities.create({
      type: 'system.status_checked',
      actor: 'user',
      entityType: 'system',
      entityId: 'status',
      summary: `Checked system status - v${report.version}, gateway ${report.gateway.running ? 'running' : 'stopped'}`,
      payloadJson: {
        commandId,
        version: report.version,
        gatewayRunning: report.gateway.running,
        receiptId: receipt.id,
      },
    })

    return NextResponse.json({
      data: report,
      receiptId: receipt.id,
    })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Status check failed'

    // Finalize receipt with error
    await repos.receipts.finalize(receipt.id, {
      exitCode: 1,
      durationMs: 0,
      parsedJson: {
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
 * Normalize the raw status output into a consistent structure
 */
function normalizeStatusReport(data: Record<string, unknown>): FullStatusReport {
  // Extract gateway info
  const gateway = data.gateway as Record<string, unknown> | undefined
  const gatewayStatus: GatewayStatus = {
    running: gateway?.running === true || gateway?.status === 'running',
    url: gateway?.url as string | undefined,
    pid: gateway?.pid as number | undefined,
    clients: gateway?.clients as number | undefined,
  }

  // Extract models info
  const models = data.models as Record<string, unknown> | undefined
  const modelConfig: ModelConfig = {
    default: (models?.default as string) || (data.defaultModel as string) || 'unknown',
    fallbacks: (models?.fallbacks as string[]) || [],
    configured: (models?.configured as number) || (models?.count as number) || 0,
  }

  // Extract auth info
  const auth = data.auth as Record<string, unknown> | undefined
  const providers = auth?.providers as Array<Record<string, unknown>> | undefined
  const authProviders: AuthProvider[] = (providers || []).map((p) => ({
    provider: p.provider as string,
    status: p.status as 'ok' | 'expiring' | 'expired' | 'missing',
    profiles: (p.profiles as number) || (p.count as number) || 0,
  }))

  // Extract cron info
  const cron = data.cron as Record<string, unknown> | undefined
  const cronStatus: CronStatus = {
    enabled: cron?.enabled !== false,
    jobCount: (cron?.jobs as number) || (cron?.count as number) || 0,
    nextRun: cron?.nextRun as string | undefined,
  }

  // Extract plugins info
  const plugins = data.plugins as Record<string, unknown> | undefined
  const pluginStatus: PluginStatus = {
    installed: (plugins?.installed as number) || (plugins?.count as number) || 0,
    active: (plugins?.active as number) || (plugins?.enabled as number) || 0,
  }

  // Build the report
  return {
    version: (data.version as string) || 'unknown',
    build: data.build as string | undefined,
    uptime: data.uptime as number | undefined,
    uptimeHuman: data.uptimeHuman as string | undefined,
    workspace: (data.workspace as string) || (data.workspacePath as string) || 'unknown',
    configPath: (data.configPath as string) || (data.config as string) || 'unknown',
    dataDir: (data.dataDir as string) || (data.stateDir as string) || 'unknown',
    gateway: gatewayStatus,
    models: modelConfig,
    auth: {
      providers: authProviders,
    },
    cron: cronStatus,
    plugins: pluginStatus,
    raw: JSON.stringify(data, null, 2),
  }
}
