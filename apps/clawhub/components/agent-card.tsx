'use client'

import { cn } from '@/lib/utils'
import { AgentAvatar } from '@/components/ui/agent-avatar'
import { ModelBadge } from '@/components/ui/model-badge'
import { StatusPill } from '@/components/ui/status-pill'
import { FileCode, Zap, MessageSquare, Settings, Clock } from 'lucide-react'
import type { AgentDTO, SkillDTO } from '@/lib/repo'
import type { StatusTone } from '@clawhub/ui/theme'

interface AgentCardProps {
  agent: AgentDTO
  skills?: SkillDTO[]
  selected?: boolean
  onClick?: () => void
  onProvision?: () => void
  onTest?: () => void
  onEditFile?: (fileName: string) => void
}

const STATUS_TONES: Record<string, StatusTone> = {
  active: 'success',
  idle: 'muted',
  blocked: 'warning',
  error: 'danger',
}

function formatRelativeTime(date: Date | string | null): string {
  if (!date) return 'Never'
  const now = new Date()
  const d = typeof date === 'string' ? new Date(date) : date
  const diffMs = now.getTime() - d.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHour < 24) return `${diffHour}h ago`
  return `${diffDay}d ago`
}

export function AgentCard({
  agent,
  skills = [],
  selected,
  onClick,
  onProvision,
  onTest,
  onEditFile,
}: AgentCardProps) {
  // Get enabled capabilities
  const enabledCapabilities = Object.entries(agent.capabilities)
    .filter(([, enabled]) => enabled)
    .map(([name]) => name)

  return (
    <div
      onClick={onClick}
      className={cn(
        'group bg-bg-2 border rounded-[var(--radius-lg)] p-4 cursor-pointer transition-all',
        selected
          ? 'border-status-progress/50 ring-1 ring-status-progress/20'
          : 'border-bd-0 hover:border-bd-1'
      )}
    >
      {/* Header: Avatar, Name, Status, Model */}
      <div className="flex items-start gap-3 mb-3">
        <AgentAvatar
          agentId={agent.id}
          name={agent.name}
          size="xl"
          showStatus
          status={agent.status}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-fg-0 truncate">{agent.name}</h3>
            <StatusPill tone={STATUS_TONES[agent.status]} label={agent.status} />
          </div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 text-xs bg-bg-3 rounded text-fg-1">{agent.station}</span>
            <ModelBadge modelId={agent.model} size="sm" />
          </div>
          <p className="text-xs text-fg-2 line-clamp-2">{agent.role}</p>
        </div>
      </div>

      {/* Last Seen */}
      <div className="flex items-center gap-1.5 text-xs text-fg-3 mb-3">
        <Clock className="w-icon-xs h-icon-xs" />
        <span>Last seen {formatRelativeTime(agent.lastSeenAt)}</span>
      </div>

      {/* Capabilities - collapsed summary */}
      {enabledCapabilities.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-fg-2 mb-3">
          <span>{enabledCapabilities.length} capabilities</span>
          {skills.length > 0 && (
            <>
              <span className="text-fg-3">·</span>
              <span>{skills.length} skills</span>
            </>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t border-bd-0">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onProvision?.()
          }}
          className="btn-warning flex-1 flex items-center justify-center gap-1.5"
        >
          <Zap className="w-icon-sm h-icon-sm" />
          Provision
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onTest?.()
          }}
          className="btn-primary flex-1 flex items-center justify-center gap-1.5"
        >
          <MessageSquare className="w-icon-sm h-icon-sm" />
          Test
        </button>
      </div>
    </div>
  )
}
