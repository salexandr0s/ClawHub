'use client'

import type { AgentDTO } from '@/lib/repo'
import { AgentBadge } from '@/components/ui/agent-badge'
import { cn } from '@/lib/utils'

function parseAgentNameFromActor(actor: string): string | null {
  // Expected forms:
  // - system
  // - agent:<name>
  // - agent:<name>:main (sessionKey-ish)
  if (!actor.startsWith('agent:')) return null
  const rest = actor.slice('agent:'.length)
  const name = rest.split(':')[0]
  return name || null
}

export function AgentActorBadge({
  actor,
  agents,
  className,
  size = 'xs',
}: {
  actor: string
  agents: AgentDTO[]
  className?: string
  size?: 'xs' | 'sm' | 'md'
}) {
  if (!actor || actor === 'system') {
    return <span className={cn('text-xs text-fg-3 font-mono', className)}>system</span>
  }

  const agentName = parseAgentNameFromActor(actor)
  if (!agentName) {
    return <span className={cn('text-xs text-fg-2 font-mono', className)}>{actor}</span>
  }

  const agent = agents.find((a) => a.name === agentName)
  if (!agent) {
    return <AgentBadge name={agentName} size={size} className={className} />
  }

  return <AgentBadge agentId={agent.id} name={agent.name} size={size} className={className} />
}
