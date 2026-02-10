import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearWorkflowRegistryCache,
  selectWorkflowForWorkOrder,
} from '@/lib/workflows/registry'

beforeEach(() => {
  clearWorkflowRegistryCache()
})

describe('workflow selector', () => {
  it('routes P0 security incidents to security_audit before bug_fix', async () => {
    const selected = await selectWorkflowForWorkOrder({
      title: 'P0 auth token vulnerability in production',
      goalMd: 'Mitigate auth vulnerability immediately and verify blast radius.',
      tags: ['security', 'incident'],
      priority: 'P0',
    })

    expect(selected.workflowId).toBe('security_audit')
    expect(selected.reason).toBe('rule')
  })

  it('uses explicit requested workflow when provided', async () => {
    const selected = await selectWorkflowForWorkOrder({
      requestedWorkflowId: 'ops_change',
      title: 'Fix dashboard',
      tags: ['bug'],
      priority: 'P0',
    })

    expect(selected.workflowId).toBe('ops_change')
    expect(selected.reason).toBe('explicit')
  })

  it('selects bug_fix for strong bug signals', async () => {
    const selected = await selectWorkflowForWorkOrder({
      title: 'Fix login regression in API',
      goalMd: 'Resolve production bug and add test coverage.',
      tags: ['bug', 'urgent'],
      priority: 'P1',
    })

    expect(selected.workflowId).toBe('bug_fix')
    expect(selected.reason).toBe('rule')
  })

  it('selects security_audit for security-focused work orders', async () => {
    const selected = await selectWorkflowForWorkOrder({
      title: 'Authentication security audit',
      goalMd: 'Audit auth boundaries and report vulnerabilities.',
      tags: ['security'],
      priority: 'P2',
    })

    expect(selected.workflowId).toBe('security_audit')
    expect(selected.reason).toBe('rule')
  })

  it('falls back to default workflow when no rule matches', async () => {
    const selected = await selectWorkflowForWorkOrder({
      title: 'Build new onboarding dashboard',
      goalMd: 'Greenfield project for onboarding analytics.',
      tags: ['feature'],
      priority: 'P2',
    })

    expect(selected.workflowId).toBe('greenfield_project')
    expect(selected.reason).toBe('default')
  })
})
