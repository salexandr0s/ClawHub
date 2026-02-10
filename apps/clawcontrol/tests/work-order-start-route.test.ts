import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  startManagedWorkOrder: vi.fn(),
}))

vi.mock('@/lib/services/manager', () => ({
  startManagedWorkOrder: mocks.startManagedWorkOrder,
}))

beforeEach(() => {
  vi.resetModules()
  mocks.startManagedWorkOrder.mockReset()
})

describe('work order start route', () => {
  it('starts manager workflow via canonical endpoint', async () => {
    mocks.startManagedWorkOrder.mockResolvedValue({
      success: true,
      workOrderId: 'wo_1',
      workflowId: 'greenfield_project',
      operationId: 'op_1',
      stageIndex: 0,
      agentId: 'agent_1',
      agentName: 'Build Agent',
      sessionKey: 'agent:build:wo:wo_1:op:op_1',
    })

    const route = await import('@/app/api/work-orders/[id]/start/route')
    const request = new Request('http://localhost/api/work-orders/wo_1/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force: true, context: { source: 'test' } }),
    })

    const response = await route.POST(request, {
      params: Promise.resolve({ id: 'wo_1' }),
    })
    const payload = (await response.json()) as { success: boolean; workflowId: string }

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(payload.workflowId).toBe('greenfield_project')
    expect(mocks.startManagedWorkOrder).toHaveBeenCalledWith('wo_1', {
      context: { source: 'test' },
      force: true,
      workflowIdOverride: undefined,
    })
  })
})
