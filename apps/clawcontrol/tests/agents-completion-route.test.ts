import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  advanceOnCompletion: vi.fn(),
}))

vi.mock('@/lib/services/workflow-engine', () => ({
  advanceOnCompletion: mocks.advanceOnCompletion,
}))

beforeEach(() => {
  vi.resetModules()
  mocks.advanceOnCompletion.mockReset()
})

describe('agents completion route', () => {
  it('returns duplicate/noop for repeated completion token', async () => {
    mocks.advanceOnCompletion.mockResolvedValue({
      success: true,
      operationId: 'op_1',
      duplicate: true,
      noop: true,
    })

    const route = await import('@/app/api/agents/completion/route')
    const request = new Request('http://localhost/api/agents/completion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operationId: 'op_1',
        status: 'completed',
        completionToken: 'tok_123',
      }),
    })

    const response = await route.POST(request)
    const payload = (await response.json()) as { success: boolean; duplicate: boolean; noop: boolean }

    expect(response.status).toBe(200)
    expect(payload).toEqual({
      success: true,
      duplicate: true,
      noop: true,
    })
    expect(mocks.advanceOnCompletion).toHaveBeenCalledWith(
      'op_1',
      {
        status: 'completed',
        output: undefined,
        feedback: undefined,
        artifacts: undefined,
      },
      { completionToken: 'tok_123' }
    )
  })
})
