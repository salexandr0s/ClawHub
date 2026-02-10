import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  runCommandJson: vi.fn(),
  probeGatewayHealth: vi.fn(),
  getOpenClawConfig: vi.fn(),
  getOpenClawConfigSync: vi.fn(),
  getCached: vi.fn(),
  setCache: vi.fn(),
}))

vi.mock('@clawcontrol/adapters-openclaw', () => ({
  runCommandJson: mocks.runCommandJson,
  probeGatewayHealth: mocks.probeGatewayHealth,
}))

vi.mock('@/lib/openclaw-client', () => ({
  getOpenClawConfig: mocks.getOpenClawConfig,
  getOpenClawConfigSync: mocks.getOpenClawConfigSync,
}))

vi.mock('@/lib/openclaw/availability', () => ({
  OPENCLAW_TIMEOUT_MS: 120_000,
  DEGRADED_THRESHOLD_MS: 30_000,
  getCached: mocks.getCached,
  setCache: mocks.setCache,
}))

beforeEach(() => {
  vi.resetModules()

  mocks.runCommandJson.mockReset()
  mocks.probeGatewayHealth.mockReset()
  mocks.getOpenClawConfig.mockReset()
  mocks.getOpenClawConfigSync.mockReset()
  mocks.getCached.mockReset()
  mocks.setCache.mockReset()

  mocks.getCached.mockReturnValue(null)
})

describe('gateway status route', () => {
  it('returns ok when probe is reachable even if CLI status command is unavailable', async () => {
    mocks.getOpenClawConfig.mockResolvedValue({
      gatewayUrl: 'http://127.0.0.1:18789',
      token: 'token',
    })
    mocks.probeGatewayHealth.mockResolvedValue({
      ok: true,
      state: 'reachable',
      url: 'http://127.0.0.1:18789/health',
      latencyMs: 12,
      statusCode: 200,
    })
    mocks.runCommandJson.mockResolvedValue({
      data: null,
      error: 'OpenClaw CLI not available',
    })

    const route = await import('@/app/api/openclaw/gateway/status/route')
    const response = await route.GET()
    const payload = (await response.json()) as {
      status: string
      data: { running?: boolean } | null
      error: string | null
    }

    expect(response.status).toBe(200)
    expect(payload.status).toBe('ok')
    expect(payload.data?.running).toBe(true)
    expect(payload.error).toBeNull()
    expect(mocks.setCache).toHaveBeenCalledTimes(1)
  })

  it('returns degraded when probe reports auth_required', async () => {
    mocks.getOpenClawConfig.mockResolvedValue({
      gatewayUrl: 'http://127.0.0.1:18789',
      token: 'bad-token',
    })
    mocks.probeGatewayHealth.mockResolvedValue({
      ok: false,
      state: 'auth_required',
      url: 'http://127.0.0.1:18789/health',
      latencyMs: 15,
      statusCode: 401,
      error: 'HTTP 401',
    })
    mocks.runCommandJson.mockResolvedValue({
      data: null,
      error: 'OpenClaw CLI not available',
    })

    const route = await import('@/app/api/openclaw/gateway/status/route')
    const response = await route.GET()
    const payload = (await response.json()) as {
      status: string
      data: { running?: boolean } | null
      error: string | null
    }

    expect(response.status).toBe(200)
    expect(payload.status).toBe('degraded')
    expect(payload.data?.running).toBe(true)
    expect(payload.error).toContain('authentication required')
    expect(mocks.setCache).toHaveBeenCalledTimes(1)
  })

  it('falls back to sync config when async config resolves null', async () => {
    mocks.getOpenClawConfig.mockResolvedValue(null)
    mocks.getOpenClawConfigSync.mockReturnValue({
      gatewayUrl: 'http://127.0.0.1:18789',
      token: null,
    })
    mocks.probeGatewayHealth.mockResolvedValue({
      ok: true,
      state: 'reachable',
      url: 'http://127.0.0.1:18789/health',
      latencyMs: 11,
      statusCode: 200,
    })
    mocks.runCommandJson.mockResolvedValue({
      data: null,
      error: 'OpenClaw CLI not available',
    })

    const route = await import('@/app/api/openclaw/gateway/status/route')
    const response = await route.GET()
    const payload = (await response.json()) as {
      status: string
      data: { running?: boolean } | null
      error: string | null
    }

    expect(response.status).toBe(200)
    expect(payload.status).toBe('ok')
    expect(payload.data?.running).toBe(true)
    expect(payload.error).toBeNull()
    expect(mocks.setCache).toHaveBeenCalledTimes(1)
  })

  it('keeps probing default gateway when config resolution throws', async () => {
    mocks.getOpenClawConfig.mockRejectedValue(new Error('config failure'))
    mocks.getOpenClawConfigSync.mockReturnValue(null)
    mocks.probeGatewayHealth.mockResolvedValue({
      ok: true,
      state: 'reachable',
      url: 'http://127.0.0.1:18789/health',
      latencyMs: 9,
      statusCode: 200,
    })
    mocks.runCommandJson.mockResolvedValue({
      data: null,
      error: 'OpenClaw CLI not available',
    })

    const route = await import('@/app/api/openclaw/gateway/status/route')
    const response = await route.GET()
    const payload = (await response.json()) as {
      status: string
      data: { running?: boolean } | null
      error: string | null
    }

    expect(response.status).toBe(200)
    expect(payload.status).toBe('ok')
    expect(payload.data?.running).toBe(true)
    expect(payload.error).toBeNull()
    expect(mocks.probeGatewayHealth).toHaveBeenCalledWith('http://127.0.0.1:18789', undefined)
  })
})
