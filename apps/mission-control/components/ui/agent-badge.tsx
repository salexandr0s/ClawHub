'use client'

import { cn } from '@/lib/utils'
import { generateIdenticonSvg } from '@/lib/avatar'

export function AgentBadge({
  agentId,
  name,
  className,
  size = 'sm',
}: {
  agentId?: string
  name: string
  className?: string
  size?: 'xs' | 'sm' | 'md'
}) {
  const dim = size === 'xs' ? 16 : size === 'sm' ? 20 : 28
  const avatarSrc = agentId
    ? `/api/agents/${agentId}/avatar`
    : `data:image/svg+xml;utf8,${encodeURIComponent(generateIdenticonSvg(name, { size: dim }))}`

  return (
    <span className={cn('inline-flex items-center gap-2 min-w-0', className)}>
      <img
        src={avatarSrc}
        alt=""
        width={dim}
        height={dim}
        className={cn(
          'shrink-0 rounded-[6px] bg-bg-3 border border-white/[0.06]',
          size === 'xs' && 'w-4 h-4',
          size === 'sm' && 'w-5 h-5',
          size === 'md' && 'w-7 h-7'
        )}
      />
      <span className="truncate text-status-progress font-mono text-xs">{name}</span>
    </span>
  )
}
