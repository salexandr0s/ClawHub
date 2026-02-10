import 'server-only'

import {
  advanceOnCompletion,
  recoverStaleOperations,
  resumeWorkOrder,
  startWorkOrder,
  tickQueue,
  type QueueTickResult,
  type StageResult,
  type StartWorkOrderResult,
  type StaleRecoveryResult,
} from '@/lib/services/workflow-engine'

export type { StageResult }

export async function initiateWorkflow(
  workOrderId: string,
  workflowId: string,
  initialContext: Record<string, unknown> = {}
): Promise<{ operationId: string; agentId: string; agentName: string; sessionKey: string | null }> {
  const started = await startWorkOrder(workOrderId, {
    workflowIdOverride: workflowId,
    context: initialContext,
  })

  return {
    operationId: started.operationId,
    agentId: started.agentId,
    agentName: started.agentName,
    sessionKey: started.sessionKey,
  }
}

export async function handleAgentCompletion(
  operationId: string,
  result: StageResult,
  options?: { completionToken?: string | null }
): Promise<void> {
  await advanceOnCompletion(operationId, result, options)
}

export async function startManagedWorkOrder(
  workOrderId: string,
  options?: {
    context?: Record<string, unknown>
    force?: boolean
    workflowIdOverride?: string
  }
): Promise<StartWorkOrderResult> {
  return startWorkOrder(workOrderId, options)
}

export async function runManagerQueueTick(options?: {
  limit?: number
  dryRun?: boolean
}): Promise<QueueTickResult> {
  return tickQueue(options)
}

export async function resumeManagedWorkOrder(
  workOrderId: string,
  options?: { reason?: string }
): Promise<StartWorkOrderResult | null> {
  return resumeWorkOrder(workOrderId, options)
}

export async function recoverManagedStaleOperations(options?: {
  limit?: number
  autoDispatch?: boolean
}): Promise<StaleRecoveryResult> {
  return recoverStaleOperations(options)
}
