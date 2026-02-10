import { NextResponse } from 'next/server'
import { probeGatewayHealth, runCommandJson } from '@clawcontrol/adapters-openclaw'
import {
  type OpenClawResponse,
  OPENCLAW_TIMEOUT_MS,
  DEGRADED_THRESHOLD_MS,
  getCached,
  setCache,
} from '@/lib/openclaw/availability'
import {
  getOpenClawConfig,
  getOpenClawConfigSync,
} from '@/lib/openclaw-client'
import { DEFAULT_GATEWAY_HTTP_URL } from '@/lib/settings/types'

/**
 * Gateway status response from OpenClaw CLI.
 * Based on `openclaw gateway status --json` output.
 */
export interface GatewayStatusDTO {
  running: boolean
  pid?: number
  uptime?: number
  version?: string
  connections?: {
    active: number
    idle: number
  }
  memory?: {
    heapUsed: number
    heapTotal: number
    rss: number
  }
}

const CACHE_KEY = 'gateway.status'

/**
 * GET /api/openclaw/gateway/status
 *
 * Returns gateway status with explicit availability semantics.
 * Always returns 200 with structured OpenClawResponse (not 500).
 */
export async function GET(): Promise<NextResponse<OpenClawResponse<GatewayStatusDTO>>> {
  // Check cache first (15s TTL to prevent refresh cascade)
  const cached = getCached<GatewayStatusDTO>(CACHE_KEY)
  if (cached) {
    return NextResponse.json(cached)
  }

  const start = Date.now()

  try {
    let gatewayUrl = DEFAULT_GATEWAY_HTTP_URL
    let gatewayToken: string | undefined

    // Primary truth for reachability should be direct gateway probing.
    // CLI status may be unavailable in some runtime environments (desktop PATH),
    // while the gateway itself is still healthy.
    try {
      const resolved = (await getOpenClawConfig(true)) ?? getOpenClawConfigSync()
      if (resolved) {
        gatewayUrl = resolved.gatewayUrl
        gatewayToken = resolved.token ?? undefined
      }
    } catch {
      const syncConfig = getOpenClawConfigSync()
      if (syncConfig) {
        gatewayUrl = syncConfig.gatewayUrl
        gatewayToken = syncConfig.token ?? undefined
      }
    }

    const probe = await probeGatewayHealth(gatewayUrl, gatewayToken)
    const latencyMs = Date.now() - start

    if (probe.ok || probe.state === 'auth_required') {
      let data: GatewayStatusDTO = { running: true }

      // Optional CLI enrichment for process details (pid/version/connections).
      // Reachability should not depend on CLI availability.
      try {
        const cli = await runCommandJson<GatewayStatusDTO>('status.json', {
          timeout: OPENCLAW_TIMEOUT_MS,
        })
        if (!cli.error && cli.data) {
          data = {
            ...cli.data,
            running: cli.data.running ?? true,
          }
        }
      } catch {
        // Keep probe-derived status when CLI command fails.
      }

      const response: OpenClawResponse<GatewayStatusDTO> = {
        status:
          probe.state === 'auth_required'
            ? 'degraded'
            : latencyMs > DEGRADED_THRESHOLD_MS
              ? 'degraded'
              : 'ok',
        latencyMs,
        data,
        error: probe.state === 'auth_required' ? 'Gateway reachable, authentication required' : null,
        timestamp: new Date().toISOString(),
        cached: false,
      }
      setCache(CACHE_KEY, response)
      return NextResponse.json(response)
    }

    const response: OpenClawResponse<GatewayStatusDTO> = {
      status: 'unavailable',
      latencyMs,
      data: null,
      error: probe.error ?? `Gateway unreachable at ${probe.url}`,
      timestamp: new Date().toISOString(),
      cached: false,
    }
    return NextResponse.json(response)
  } catch (err) {
    const latencyMs = Date.now() - start
    const response: OpenClawResponse<GatewayStatusDTO> = {
      status: 'unavailable',
      latencyMs,
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      cached: false,
    }
    return NextResponse.json(response)
  }
}
