'use client'

import { cn } from '@/lib/utils'
import { AgentAvatar } from '@/components/ui/agent-avatar'
import { ModelBadge } from '@/components/ui/model-badge'
import { StatusPill } from '@/components/ui/status-pill'
import { StationIcon } from '@/components/station-icon'
import { useStations } from '@/lib/stations-context'
import { FileCode, Zap, MessageSquare, Settings, Clock } from 'lucide-react'
import type { AgentDTO, SkillDTO } from '@/lib/repo'
import type { StatusTone } from '@clawcontrol/ui/theme'

interface AgentCardProps {
  agent: AgentDTO
  skills?: SkillDTO[]
  selected?: boolean
  onClick?: () => void
  onProvision?: () => void
  onTest?: () => void
  onEditFile?: (filePath: string, fileName?: string) => void
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
  const { stationsById } = useStations()
  const stationLabel = stationsById[agent.station]?.name ?? agent.station

  // Get enabled capabilities
  const enabledCapabilities = Object.entries(agent.capabilities)
    .filter(([, enabled]) => enabled)
    .map(([name]) => name)

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-bg-2 border rounded-[var(--radius-lg)] p-3.5 cursor-pointer transition-all',
        selected
          ? 'border-status-progress/50 ring-1 ring-status-progress/20'
          : 'border-bd-0 hover:border-bd-1 hover:bg-bg-2/90'
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <AgentAvatar
          agentId={agent.id}
          name={agent.displayName}
          size="lg"
          showStatus
          status={agent.status}
        />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <StationIcon stationId={agent.station} />
                <h3 className="text-sm font-semibold text-fg-0 truncate">{agent.displayName}</h3>
              </div>
              <p className="mt-1 text-xs text-fg-2 line-clamp-1">{agent.role}</p>
            </div>
            <StatusPill tone={STATUS_TONES[agent.status]} label={agent.status} />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="px-2 py-0.5 text-[10px] bg-bg-3 rounded text-fg-1 inline-flex items-center gap-1.5 border border-bd-0">
              <StationIcon stationId={agent.station} />
              {stationLabel}
            </span>
            <ModelBadge modelId={agent.model} size="sm" />
            <span className="px-1.5 py-0.5 text-[10px] bg-bg-3 rounded text-fg-2 border border-bd-0">
              WIP {agent.wipLimit}
            </span>
          </div>
        </div>
      </div>

      {/* Meta */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-[var(--radius-md)] border border-bd-0 bg-bg-3/60 px-2.5 py-2">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-fg-3">
            <Clock className="w-3 h-3" />
            Last seen
          </div>
          <div className="mt-0.5 text-xs text-fg-1">{formatRelativeTime(agent.lastSeenAt)}</div>
        </div>
        <div className="rounded-[var(--radius-md)] border border-bd-0 bg-bg-3/60 px-2.5 py-2">
          <div className="text-[10px] uppercase tracking-wide text-fg-3">Session</div>
          <div className="mt-0.5 text-[10px] font-mono text-fg-2 truncate">{agent.sessionKey}</div>
        </div>
      </div>

      {/* Capabilities */}
      {enabledCapabilities.length > 0 && (
        <div className="mt-3">
          <div className="text-[10px] uppercase tracking-wide text-fg-3 mb-1.5">Capabilities</div>
          <div className="flex flex-wrap gap-1">
            {enabledCapabilities.slice(0, 5).map((cap) => (
              <span
                key={cap}
                className="px-1.5 py-0.5 text-[10px] bg-bg-3 rounded text-fg-2 border border-bd-0"
              >
                {cap.replace(/_/g, ' ')}
              </span>
            ))}
            {enabledCapabilities.length > 5 && (
              <span className="px-1.5 py-0.5 text-[10px] bg-bg-3 rounded text-fg-3 border border-bd-0">
                +{enabledCapabilities.length - 5}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Skills */}
      {skills.length > 0 && (
        <div className="mt-3">
          <div className="text-[10px] uppercase tracking-wide text-fg-3 mb-1.5">Skills</div>
          <div className="flex flex-wrap gap-1">
            {skills.slice(0, 4).map((skill) => (
              <span
                key={skill.id}
                className={cn(
                  'px-1.5 py-0.5 text-[10px] rounded border',
                  skill.enabled
                    ? 'bg-status-success/10 text-status-success border-transparent'
                    : 'bg-bg-3 text-fg-3 border-bd-0'
                )}
              >
                {skill.name}
              </span>
            ))}
            {skills.length > 4 && (
              <span className="px-1.5 py-0.5 text-[10px] bg-bg-3 rounded text-fg-3 border border-bd-0">
                +{skills.length - 4}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Files */}
      <div className="mt-3">
        <div className="text-[10px] uppercase tracking-wide text-fg-3 mb-1.5">Files</div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEditFile?.(`/agents/${agent.slug || agent.id}/SOUL.md`, 'SOUL.md')
            }}
            className="flex items-center gap-1 px-2 py-1.5 text-[10px] bg-bg-3/80 hover:bg-bg-3 rounded-[var(--radius-sm)] text-fg-2 border border-bd-0 transition-colors"
          >
            <FileCode className="w-3 h-3" />
            soul.md
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEditFile?.(`/agents/${agent.slug || agent.id}.md`, `${agent.slug || agent.id}.md`)
            }}
            className="flex items-center gap-1 px-2 py-1.5 text-[10px] bg-bg-3/80 hover:bg-bg-3 rounded-[var(--radius-sm)] text-fg-2 border border-bd-0 transition-colors"
          >
            <Settings className="w-3 h-3" />
            overlay.md
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-3 pt-2 border-t border-bd-0">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onProvision?.()
            }}
            title="Register this agent in OpenClaw so it can receive work."
            className="flex items-center justify-center gap-1.5 px-2 py-2 text-xs font-medium bg-bg-3/80 hover:bg-bg-3 text-fg-1 rounded-[var(--radius-md)] border border-bd-0 transition-colors"
          >
            <Zap className="w-3.5 h-3.5" />
            Provision
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onTest?.()
            }}
            title="Run a quick OpenClaw connectivity test (message exchange is currently not implemented)."
            className="flex items-center justify-center gap-1.5 px-2 py-2 text-xs font-medium bg-bg-3/80 hover:bg-bg-3 text-fg-1 rounded-[var(--radius-md)] border border-bd-0 transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Test
          </button>
        </div>
        <p className="mt-1.5 text-[10px] text-fg-3">
          Provision registers the agent; Test checks connectivity.
        </p>
      </div>
    </div>
  )
}
