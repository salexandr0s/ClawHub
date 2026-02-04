import { NextRequest, NextResponse } from 'next/server'
import { getRepos } from '@/lib/repo'
import {
  runCommandJson,
  isAllowedCommand,
  getCommandSpec,
  type AllowedCommandId,
} from '@clawhub/adapters-openclaw'

// Types for health response
interface HealthCheck {
  name: string
  status: 'pass' | 'warn' | 'fail'
  message: string
  latencyMs?: number
  details?: Record<string, unknown>
}

interface HealthReport {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  checks: HealthCheck[]
}

/**
 * GET /api/status/health
 * Get health check results from OpenClaw
 */
export async function GET(request: NextRequest) {
  const commandId: AllowedCommandId = 'health.json'

  // Validate command is in allowlist
  if (!isAllowedCommand(commandId)) {
    return NextResponse.json(
      { error: `Command not allowed: ${commandId}` },
      { status: 403 }
    )
  }

  const repos = getRepos()
  const commandSpec = getCommandSpec(commandId)

  // Create a receipt for this health check
  const receipt = await repos.receipts.create({
    workOrderId: 'system',
    kind: 'manual',
    commandName: 'health',
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
          error: cmdResult.error || 'Health check failed with no output',
          receiptId: receipt.id,
        },
        { status: 500 }
      )
    }

    // Parse and normalize the response
    const data = cmdResult.data
    const report: HealthReport = normalizeHealthReport(data)

    // Finalize receipt with success
    await repos.receipts.finalize(receipt.id, {
      exitCode: 0,
      durationMs: 0,
      parsedJson: {
        status: report.status,
        checkCount: report.checks.length,
        passCount: report.checks.filter((c) => c.status === 'pass').length,
        failCount: report.checks.filter((c) => c.status === 'fail').length,
      },
    })

    // Log activity
    await repos.activities.create({
      type: 'system.health_checked',
      actor: 'user',
      entityType: 'system',
      entityId: 'health',
      summary: `Health check: ${report.status} - ${report.checks.filter((c) => c.status === 'pass').length}/${report.checks.length} passed`,
      payloadJson: {
        commandId,
        status: report.status,
        checkCount: report.checks.length,
        receiptId: receipt.id,
      },
    })

    return NextResponse.json({
      data: report,
      receiptId: receipt.id,
    })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Health check failed'

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
 * Normalize the raw health output into a consistent structure
 */
function normalizeHealthReport(data: Record<string, unknown>): HealthReport {
  // Extract checks array
  const rawChecks = data.checks as Array<Record<string, unknown>> | undefined
  const checks: HealthCheck[] = (rawChecks || []).map((check) => ({
    name: (check.name as string) || (check.check as string) || 'unknown',
    status: normalizeCheckStatus(check.status as string),
    message: (check.message as string) || (check.msg as string) || '',
    latencyMs: check.latencyMs as number | undefined,
    details: check.details as Record<string, unknown> | undefined,
  }))

  // Determine overall status
  let status: 'healthy' | 'degraded' | 'unhealthy'
  if (data.status) {
    status = normalizeOverallStatus(data.status as string)
  } else {
    // Infer from checks
    const hasFailure = checks.some((c) => c.status === 'fail')
    const hasWarning = checks.some((c) => c.status === 'warn')
    status = hasFailure ? 'unhealthy' : hasWarning ? 'degraded' : 'healthy'
  }

  return {
    status,
    timestamp: (data.timestamp as string) || new Date().toISOString(),
    checks,
  }
}

function normalizeCheckStatus(status: string): 'pass' | 'warn' | 'fail' {
  const normalized = status?.toLowerCase()
  if (normalized === 'pass' || normalized === 'ok' || normalized === 'healthy' || normalized === 'success') {
    return 'pass'
  }
  if (normalized === 'warn' || normalized === 'warning' || normalized === 'degraded') {
    return 'warn'
  }
  return 'fail'
}

function normalizeOverallStatus(status: string): 'healthy' | 'degraded' | 'unhealthy' {
  const normalized = status?.toLowerCase()
  if (normalized === 'healthy' || normalized === 'ok' || normalized === 'pass') {
    return 'healthy'
  }
  if (normalized === 'degraded' || normalized === 'warn' || normalized === 'warning') {
    return 'degraded'
  }
  return 'unhealthy'
}
