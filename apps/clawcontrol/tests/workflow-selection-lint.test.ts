import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearWorkflowRegistryCache,
  getWorkflowRegistrySnapshot,
} from '@/lib/workflows/registry'
import type { WorkflowSelectionRule } from '@clawcontrol/core'

beforeEach(() => {
  clearWorkflowRegistryCache()
})

function normalizeList(values: string[] | undefined): Set<string> {
  return new Set((values ?? []).map((value) => value.trim().toLowerCase()).filter(Boolean))
}

function setsIntersect(left: Set<string>, right: Set<string>): boolean {
  for (const value of left) {
    if (right.has(value)) return true
  }
  return false
}

function prioritiesOverlap(left: WorkflowSelectionRule, right: WorkflowSelectionRule): boolean {
  const leftSet = normalizeList(left.priority)
  const rightSet = normalizeList(right.priority)
  if (leftSet.size === 0 || rightSet.size === 0) return true
  return setsIntersect(leftSet, rightSet)
}

function likelyOverlap(left: WorkflowSelectionRule, right: WorkflowSelectionRule): boolean {
  if (!prioritiesOverlap(left, right)) return false

  const tagsOverlap = setsIntersect(normalizeList(left.tagsAny), normalizeList(right.tagsAny))
  const titleOverlap = setsIntersect(
    normalizeList(left.titleKeywordsAny),
    normalizeList(right.titleKeywordsAny)
  )
  const goalOverlap = setsIntersect(
    normalizeList(left.goalKeywordsAny),
    normalizeList(right.goalKeywordsAny)
  )

  const leftSignals =
    (left.tagsAny?.length ?? 0) +
    (left.titleKeywordsAny?.length ?? 0) +
    (left.goalKeywordsAny?.length ?? 0)
  const rightSignals =
    (right.tagsAny?.length ?? 0) +
    (right.titleKeywordsAny?.length ?? 0) +
    (right.goalKeywordsAny?.length ?? 0)

  if (leftSignals === 0 && rightSignals === 0) return true
  return tagsOverlap || titleOverlap || goalOverlap
}

function hasExplicitPrecedence(left: WorkflowSelectionRule, right: WorkflowSelectionRule): boolean {
  return (left.precedes ?? []).includes(right.id) || (right.precedes ?? []).includes(left.id)
}

describe('workflow-selection lint', () => {
  it('requires explicit precedence annotation for likely-overlapping rules', async () => {
    const snapshot = await getWorkflowRegistrySnapshot()
    const rules = snapshot.selection.rules
    const missing: string[] = []

    for (let i = 0; i < rules.length; i++) {
      for (let j = i + 1; j < rules.length; j++) {
        const left = rules[i]
        const right = rules[j]
        if (!likelyOverlap(left, right)) continue
        if (hasExplicitPrecedence(left, right)) continue
        missing.push(`${left.id} <-> ${right.id}`)
      }
    }

    expect(
      missing,
      `Missing explicit precedence annotation for likely-overlapping rules: ${missing.join(', ')}`
    ).toEqual([])
  })
})
