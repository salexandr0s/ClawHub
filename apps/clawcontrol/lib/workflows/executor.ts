import 'server-only'

import { prisma } from '@/lib/db'
import { spawnAgentSession } from '@/lib/openclaw/sessions'
import { extractAgentIdFromSessionKey } from '@/lib/agent-identity'

/**
 * Spawns an agent session with the required session key convention:
 * `agent:<runtimeAgentId>:wo:<workOrderId>:op:<operationId>`
 */
export async function dispatchToAgent(input: {
  agentId: string
  workOrderId: string
  operationId: string
  task: string
  context?: Record<string, unknown>
}): Promise<{ sessionKey: string; sessionId: string | null }> {
  const agent = await prisma.agent.findUnique({
    where: { id: input.agentId },
    select: {
      id: true,
      slug: true,
      runtimeAgentId: true,
      sessionKey: true,
      model: true,
      status: true,
    },
  })
  if (!agent) {
    throw new Error(`Agent not found: ${input.agentId}`)
  }

  const runtimeAgentId =
    agent.runtimeAgentId?.trim() ||
    extractAgentIdFromSessionKey(agent.sessionKey) ||
    agent.slug?.trim() ||
    agent.id

  const sessionKey = `agent:${runtimeAgentId}:wo:${input.workOrderId}:op:${input.operationId}`

  const result = await spawnAgentSession({
    agentId: runtimeAgentId,
    label: sessionKey,
    task: input.task,
    context: input.context ?? {},
    model: agent.model ?? undefined,
  })

  // Best-effort status update (telemetry only).
  await prisma.agent
    .update({
      where: { id: agent.id },
      data: { status: 'active', lastSeenAt: new Date() },
    })
    .catch(() => {})

  return result
}

export function mapAgentToStation(agent: { station?: string | null } | string): string {
  if (typeof agent === 'string') {
    const normalized = agent.trim().toLowerCase()
    return normalized || 'build'
  }

  const station = (agent.station ?? '').trim().toLowerCase()
  return station || 'build'
}
