import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  readSettings: vi.fn(),
  writeSettings: vi.fn(),
  getOpenClawConfig: vi.fn(),
  validateWorkspaceStructure: vi.fn(),
  invalidateWorkspaceRootCache: vi.fn(),
}))

vi.mock('@/lib/settings/store', () => ({
  readSettings: mocks.readSettings,
  writeSettings: mocks.writeSettings,
}))

vi.mock('@/lib/openclaw-client', () => ({
  getOpenClawConfig: mocks.getOpenClawConfig,
}))

vi.mock('@/lib/workspace/validate', () => ({
  validateWorkspaceStructure: mocks.validateWorkspaceStructure,
}))

vi.mock('@/lib/fs/path-policy', () => ({
  invalidateWorkspaceRootCache: mocks.invalidateWorkspaceRootCache,
}))

function baseSettings(overrides: Record<string, unknown> = {}) {
  return {
    settings: {
      updatedAt: '2026-02-09T00:00:00.000Z',
      ...overrides,
    },
    path: '/tmp/settings.json',
    migratedFromEnv: false,
    legacyEnvPath: null,
  }
}

beforeEach(() => {
  vi.resetModules()

  mocks.readSettings.mockReset()
  mocks.writeSettings.mockReset()
  mocks.getOpenClawConfig.mockReset()
  mocks.validateWorkspaceStructure.mockReset()
  mocks.invalidateWorkspaceRootCache.mockReset()

  mocks.readSettings.mockResolvedValue(baseSettings())
  mocks.writeSettings.mockResolvedValue(baseSettings())
  mocks.getOpenClawConfig.mockResolvedValue(null)
  mocks.validateWorkspaceStructure.mockResolvedValue({
    ok: true,
    path: '/tmp/workspace',
    exists: true,
    issues: [],
  })
})

describe('config settings route', () => {
  it('defaults remoteAccessMode to local_only in GET response', async () => {
    const route = await import('@/app/api/config/settings/route')
    const response = await route.GET()
    const payload = (await response.json()) as { data: { settings: { remoteAccessMode: string } } }

    expect(response.status).toBe(200)
    expect(payload.data.settings.remoteAccessMode).toBe('local_only')
  })

  it('rejects non-loopback gateway URLs on PUT', async () => {
    const route = await import('@/app/api/config/settings/route')

    const request = new NextRequest('http://localhost/api/config/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gatewayHttpUrl: 'http://192.168.1.22:18789' }),
    })

    const response = await route.PUT(request)
    const payload = (await response.json()) as { code?: string; error?: string }

    expect(response.status).toBe(400)
    expect(payload.code).toBe('NON_LOOPBACK_FORBIDDEN')
    expect(payload.error).toContain('loopback')
    expect(mocks.writeSettings).not.toHaveBeenCalled()
  })

  it('accepts loopback gateway URL and remoteAccessMode updates on PUT', async () => {
    const updated = baseSettings({
      remoteAccessMode: 'tailscale_tunnel',
      gatewayHttpUrl: 'http://127.0.0.1:18789',
    })

    mocks.writeSettings.mockResolvedValue(updated)
    mocks.readSettings.mockResolvedValue(updated)

    const route = await import('@/app/api/config/settings/route')

    const request = new NextRequest('http://localhost/api/config/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gatewayHttpUrl: 'http://127.0.0.1:18789',
        remoteAccessMode: 'tailscale_tunnel',
      }),
    })

    const response = await route.PUT(request)
    const payload = (await response.json()) as {
      data: { settings: { remoteAccessMode: string; gatewayHttpUrl: string | null } }
    }

    expect(response.status).toBe(200)
    expect(mocks.writeSettings).toHaveBeenCalledWith({
      gatewayHttpUrl: 'http://127.0.0.1:18789',
      remoteAccessMode: 'tailscale_tunnel',
    })
    expect(payload.data.settings.remoteAccessMode).toBe('tailscale_tunnel')
    expect(payload.data.settings.gatewayHttpUrl).toBe('http://127.0.0.1:18789')
  })
})
