import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearWorkflowRegistryCache,
  getWorkflowConfig,
  getWorkflowRegistrySnapshot,
  listWorkflowConfigs,
} from '@/lib/workflows/registry'

beforeEach(() => {
  clearWorkflowRegistryCache()
})

describe('workflow registry', () => {
  it('loads and validates all configured workflow YAML files', async () => {
    const workflows = await listWorkflowConfigs()
    const ids = workflows.map((workflow) => workflow.id)

    expect(ids).toEqual([
      'bug_fix',
      'content_creation',
      'greenfield_project',
      'ops_change',
      'security_audit',
    ])
  })

  it('returns workflow details by id', async () => {
    const workflow = await getWorkflowConfig('greenfield_project')

    expect(workflow).not.toBeNull()
    expect(workflow?.stages.length).toBeGreaterThan(0)
    expect(workflow?.stages.some((stage) => stage.type === 'loop')).toBe(true)
  })

  it('returns selection configuration in snapshot', async () => {
    const snapshot = await getWorkflowRegistrySnapshot()

    expect(snapshot.selection.defaultWorkflowId).toBe('greenfield_project')
    expect(snapshot.selection.rules.length).toBeGreaterThan(0)
    expect(snapshot.loadedAt).toContain('T')
  })
})
