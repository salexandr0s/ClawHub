'use client'

import { AlertTriangle, RefreshCw, Terminal, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

interface OpenClawUnavailableProps {
  /**
   * Error message describing why OpenClaw is unavailable
   */
  error: string
  /**
   * Callback to retry the connection
   */
  onRetry?: () => void
  /**
   * Whether a retry is currently in progress
   */
  isRetrying?: boolean
  /**
   * Optional className for the container
   */
  className?: string
}

/**
 * Hard error state component shown when OpenClaw is not available or gateway is unreachable.
 * ClawHub requires OpenClaw to function - this replaces all mock/demo mode fallbacks.
 */
export function OpenClawUnavailable({
  error,
  onRetry,
  isRetrying = false,
  className,
}: OpenClawUnavailableProps) {
  const isNotInstalled = error.toLowerCase().includes('not found') ||
    error.toLowerCase().includes('not installed') ||
    error.toLowerCase().includes('not available')

  const isGatewayDown = error.toLowerCase().includes('gateway') ||
    error.toLowerCase().includes('connection') ||
    error.toLowerCase().includes('unreachable')

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 bg-bg-2 rounded-[var(--radius-lg)] border border-bd-0',
        className
      )}
    >
      <div className="w-16 h-16 rounded-full bg-status-error/10 flex items-center justify-center mb-4">
        <AlertTriangle className="w-8 h-8 text-status-error" />
      </div>

      <h2 className="text-lg font-semibold text-fg-0 mb-2">
        {isNotInstalled ? 'OpenClaw Not Found' : isGatewayDown ? 'Gateway Unreachable' : 'OpenClaw Unavailable'}
      </h2>

      <p className="text-sm text-fg-2 text-center max-w-md mb-6">
        {error}
      </p>

      {/* Helpful guidance */}
      <div className="bg-bg-3 rounded-[var(--radius-md)] p-4 mb-6 max-w-md w-full">
        <h3 className="text-sm font-medium text-fg-1 mb-2 flex items-center gap-2">
          <Terminal className="w-4 h-4" />
          {isNotInstalled ? 'Install OpenClaw' : 'Troubleshooting'}
        </h3>

        {isNotInstalled ? (
          <div className="space-y-2 text-sm text-fg-2">
            <p>ClawHub requires OpenClaw to be installed and available on your PATH.</p>
            <code className="block bg-bg-1 px-3 py-2 rounded font-mono text-xs text-fg-1">
              curl -fsSL https://openclaw.ai/install.sh | bash
            </code>
            <p>After installation, restart ClawHub.</p>
          </div>
        ) : (
          <ul className="space-y-1 text-sm text-fg-2">
            <li>1. Check if the gateway is running: <code className="text-fg-1">openclaw gateway status</code></li>
            <li>2. Start the gateway: <code className="text-fg-1">openclaw gateway start</code></li>
            <li>3. Check logs for errors: <code className="text-fg-1">openclaw logs --tail 50</code></li>
          </ul>
        )}
      </div>

      <div className="flex items-center gap-3">
        {onRetry && (
          <button
            onClick={onRetry}
            disabled={isRetrying}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] font-medium transition-colors',
              'bg-accent-primary text-white hover:bg-accent-primary/90',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <RefreshCw className={cn('w-4 h-4', isRetrying && 'animate-spin')} />
            {isRetrying ? 'Retrying...' : 'Retry Connection'}
          </button>
        )}

        <a
          href="https://docs.openclaw.ai/start/getting-started"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] font-medium transition-colors',
            'bg-bg-3 text-fg-1 hover:bg-bg-2 border border-bd-0'
          )}
        >
          <ExternalLink className="w-4 h-4" />
          Documentation
        </a>
      </div>
    </div>
  )
}

/**
 * Inline version for use in smaller spaces (e.g., within cards or sections)
 */
export function OpenClawUnavailableInline({
  error,
  onRetry,
  isRetrying = false,
}: Omit<OpenClawUnavailableProps, 'className'>) {
  return (
    <div className="flex items-center gap-3 p-3 bg-status-error/10 border border-status-error/30 rounded-[var(--radius-md)]">
      <AlertTriangle className="w-5 h-5 text-status-error shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-status-error font-medium">OpenClaw Unavailable</p>
        <p className="text-xs text-fg-2 truncate">{error}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          disabled={isRetrying}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-sm font-medium transition-colors',
            'bg-bg-3 text-fg-1 hover:bg-bg-2',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <RefreshCw className={cn('w-3.5 h-3.5', isRetrying && 'animate-spin')} />
          Retry
        </button>
      )}
    </div>
  )
}
