/**
 * Gateway Repository
 *
 * Availability-aware repository for OpenClaw gateway operations.
 * Returns OpenClawResponse<T> with explicit ok|degraded|unavailable status.
 */

import {
  type GatewayProbeStatus,
  probeGatewayHealth,
  runCommandJson,
} from '@clawcontrol/adapters-openclaw'
import {
  type OpenClawResponse,
  type AvailabilityStatus,
  OPENCLAW_TIMEOUT_MS,
  DEGRADED_THRESHOLD_MS,
  CACHE_TTL_MS,
} from '@/lib/openclaw/availability'
import {
  getOpenClawConfig,
  getOpenClawConfigSync,
} from '@/lib/openclaw-client'
import { DEFAULT_GATEWAY_HTTP_URL } from '@/lib/settings/types'

// ============================================================================
// TYPES
// ============================================================================

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

export interface GatewayHealthDTO {
  healthy: boolean
  checks?: {
    name: string
    status: 'pass' | 'fail' | 'warn'
    message?: string
  }[]
}

export interface GatewayProbeDTO {
  reachable: boolean
  latencyMs: number
  error?: string
}

// ============================================================================
// REPOSITORY INTERFACE
// ============================================================================

export interface GatewayRepo {
  status(): Promise<OpenClawResponse<GatewayStatusDTO>>
  health(): Promise<OpenClawResponse<GatewayHealthDTO>>
  probe(): Promise<OpenClawResponse<GatewayProbeDTO>>
}

// ============================================================================
// IN-MEMORY CACHE
// ============================================================================

interface CacheEntry<T> {
  data: OpenClawResponse<T>
  cachedAt: number
}

const cache = new Map<string, CacheEntry<unknown>>()

function getCached<T>(key: string): OpenClawResponse<T> | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined
  if (!entry) return null

  const age = Date.now() - entry.cachedAt
  if (age > CACHE_TTL_MS) {
    cache.delete(key)
    return null
  }

  return {
    ...entry.data,
    cached: true,
    staleAgeMs: age,
  }
}

function setCache<T>(key: string, response: OpenClawResponse<T>): void {
  cache.set(key, { data: response, cachedAt: Date.now() })
}

interface GatewayTarget {
  gatewayUrl: string
  token?: string
}

async function resolveGatewayTarget(): Promise<GatewayTarget> {
  try {
    const resolved = (await getOpenClawConfig(true)) ?? getOpenClawConfigSync()
    if (resolved) {
      return {
        gatewayUrl: resolved.gatewayUrl,
        token: resolved.token ?? undefined,
      }
    }
  } catch {
    const fallback = getOpenClawConfigSync()
    if (fallback) {
      return {
        gatewayUrl: fallback.gatewayUrl,
        token: fallback.token ?? undefined,
      }
    }
  }

  return { gatewayUrl: DEFAULT_GATEWAY_HTTP_URL }
}

function availabilityFromProbe(probe: GatewayProbeStatus, latencyMs: number): AvailabilityStatus {
  if (!probe.ok && probe.state !== 'auth_required') return 'unavailable'
  if (probe.state === 'auth_required') return 'degraded'
  return latencyMs > DEGRADED_THRESHOLD_MS ? 'degraded' : 'ok'
}

function normalizeStatusData(cliData: unknown): GatewayStatusDTO {
  if (!cliData || typeof cliData !== 'object') {
    return { running: true }
  }

  const record = cliData as Record<string, unknown>
  const partial = record as unknown as Partial<GatewayStatusDTO>
  return {
    ...partial,
    running: typeof record.running === 'boolean' ? record.running : true,
  }
}

function mapProbeDto(probe: GatewayProbeStatus, fallbackLatencyMs: number): GatewayProbeDTO {
  return {
    reachable: probe.ok || probe.state === 'auth_required',
    latencyMs: probe.latencyMs ?? fallbackLatencyMs,
    ...(probe.error ? { error: probe.error } : {}),
  }
}

function authRequiredMessage(probe: GatewayProbeStatus): string | null {
  return probe.state === 'auth_required'
    ? 'Gateway reachable, authentication required'
    : null
}

// ============================================================================
// CLI IMPLEMENTATION
// ============================================================================

export function createCliGatewayRepo(): GatewayRepo {
  return {
    async status(): Promise<OpenClawResponse<GatewayStatusDTO>> {
      const cacheKey = 'gateway.status'
      const cached = getCached<GatewayStatusDTO>(cacheKey)
      if (cached) return cached

      const start = Date.now()

      try {
        const target = await resolveGatewayTarget()
        const probe = await probeGatewayHealth(target.gatewayUrl, target.token)
        const latencyMs = Date.now() - start

        if (!probe.ok && probe.state !== 'auth_required') {
          return {
            status: 'unavailable',
            latencyMs,
            data: null,
            error: probe.error ?? `Gateway unreachable at ${probe.url}`,
            timestamp: new Date().toISOString(),
            cached: false,
          }
        }

        let data: GatewayStatusDTO = { running: true }
        try {
          const cli = await runCommandJson<GatewayStatusDTO>('status.json', {
            timeout: OPENCLAW_TIMEOUT_MS,
          })
          if (!cli.error && cli.data) {
            data = normalizeStatusData(cli.data)
          }
        } catch {
          // Keep probe-derived status when CLI enrichment fails.
        }

        const status = availabilityFromProbe(probe, latencyMs)
        const response: OpenClawResponse<GatewayStatusDTO> = {
          status,
          latencyMs,
          data,
          error: authRequiredMessage(probe),
          timestamp: new Date().toISOString(),
          cached: false,
        }

        setCache(cacheKey, response)
        return response
      } catch (err) {
        return {
          status: 'unavailable',
          latencyMs: Date.now() - start,
          data: null,
          error: err instanceof Error ? err.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          cached: false,
        }
      }
    },

    async health(): Promise<OpenClawResponse<GatewayHealthDTO>> {
      const cacheKey = 'gateway.health'
      const cached = getCached<GatewayHealthDTO>(cacheKey)
      if (cached) return cached

      const start = Date.now()

      try {
        const target = await resolveGatewayTarget()
        const probe = await probeGatewayHealth(target.gatewayUrl, target.token)
        const latencyMs = Date.now() - start

        if (!probe.ok && probe.state !== 'auth_required') {
          return {
            status: 'unavailable',
            latencyMs,
            data: null,
            error: probe.error ?? `Gateway unreachable at ${probe.url}`,
            timestamp: new Date().toISOString(),
            cached: false,
          }
        }

        let data: GatewayHealthDTO = {
          healthy: probe.ok,
          checks: [
            {
              name: 'gateway_http_probe',
              status: probe.ok ? 'pass' : 'warn',
              message: probe.ok ? 'Gateway reachable' : 'Gateway reachable, authentication required',
            },
          ],
        }

        try {
          const cli = await runCommandJson<GatewayHealthDTO>('health.json', {
            timeout: OPENCLAW_TIMEOUT_MS,
          })
          if (!cli.error && cli.data) {
            data = {
              ...cli.data,
              healthy: typeof cli.data.healthy === 'boolean' ? cli.data.healthy : probe.ok,
            }
          }
        } catch {
          // Keep probe-derived health when CLI enrichment fails.
        }

        const status = availabilityFromProbe(probe, latencyMs)
        const response: OpenClawResponse<GatewayHealthDTO> = {
          status,
          latencyMs,
          data,
          error: authRequiredMessage(probe),
          timestamp: new Date().toISOString(),
          cached: false,
        }

        setCache(cacheKey, response)
        return response
      } catch (err) {
        return {
          status: 'unavailable',
          latencyMs: Date.now() - start,
          data: null,
          error: err instanceof Error ? err.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          cached: false,
        }
      }
    },

    async probe(): Promise<OpenClawResponse<GatewayProbeDTO>> {
      // Probe is not cached - it's meant to be a fresh check
      const start = Date.now()

      try {
        const target = await resolveGatewayTarget()
        const probe = await probeGatewayHealth(target.gatewayUrl, target.token)
        const latencyMs = Date.now() - start

        if (!probe.ok && probe.state !== 'auth_required') {
          return {
            status: 'unavailable',
            latencyMs,
            data: mapProbeDto(probe, latencyMs),
            error: probe.error ?? `Gateway unreachable at ${probe.url}`,
            timestamp: new Date().toISOString(),
            cached: false,
          }
        }

        const status = availabilityFromProbe(probe, latencyMs)
        const probeData: GatewayProbeDTO = mapProbeDto(probe, latencyMs)

        return {
          status,
          latencyMs,
          data: probeData,
          error: authRequiredMessage(probe),
          timestamp: new Date().toISOString(),
          cached: false,
        }
      } catch (err) {
        const latencyMs = Date.now() - start
        return {
          status: 'unavailable',
          latencyMs,
          data: { reachable: false, latencyMs, error: err instanceof Error ? err.message : 'Unknown error' },
          error: err instanceof Error ? err.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          cached: false,
        }
      }
    },
  }
}

// (No mock implementation: ClawControl must never return demo gateway data.)
