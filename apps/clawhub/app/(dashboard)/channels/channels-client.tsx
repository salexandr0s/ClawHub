'use client'

import { useState, useCallback } from 'react'
import { PageHeader, PageSection, TypedConfirmModal } from '@clawhub/ui'
import { channelsApi, HttpError } from '@/lib/http'
import { useProtectedAction } from '@/lib/hooks/useProtectedAction'
import { OpenClawUnavailable } from '@/components/openclaw-unavailable'
import type { ActionKind } from '@clawhub/core'
import { cn } from '@/lib/utils'
import {
  RefreshCw,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  MessageSquare,
  Phone,
  Send,
  Hash,
  Users,
  AtSign,
  Radio,
  MessageCircle,
  Wifi,
  WifiOff,
} from 'lucide-react'

// Channel types with their icons
const CHANNEL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  whatsapp: Phone,
  telegram: Send,
  slack: Hash,
  discord: Users,
  teams: AtSign,
  signal: Radio,
  imessage: MessageCircle,
  sms: MessageSquare,
  email: Send,
  default: MessageSquare,
}

// Types for channels
interface Channel {
  id: string
  name: string
  type: string
  status: 'connected' | 'disconnected' | 'error' | 'unknown'
  lastActivity?: string
  config?: Record<string, unknown>
  error?: string
}

interface ChannelHealthCheck {
  id: string
  name: string
  type: string
  healthy: boolean
  latencyMs?: number
  message?: string
  lastChecked: string
}

interface ChannelsState {
  isLoading: boolean
  channels: Channel[]
  healthChecks: ChannelHealthCheck[]
  error: string | null
  receiptId: string | null
}

export function ChannelsClient() {
  const [state, setState] = useState<ChannelsState>({
    isLoading: false,
    channels: [],
    healthChecks: [],
    error: null,
    receiptId: null,
  })
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)

  const protectedAction = useProtectedAction()

  // Fetch channels list
  const fetchChannels = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      const result = await channelsApi.getList()
      setState((prev) => ({
        ...prev,
        isLoading: false,
        channels: result.data,
        receiptId: result.receiptId || null,
      }))
    } catch (err) {
      const message = err instanceof HttpError ? err.message : 'Failed to fetch channels'
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: message,
      }))
    }
  }, [])

  // Check all channels health
  const checkAllChannels = useCallback(async () => {
    setActionInProgress('check')
    setState((prev) => ({ ...prev, error: null }))

    try {
      const result = await channelsApi.checkHealth()
      setState((prev) => ({
        ...prev,
        healthChecks: result.data,
        receiptId: result.receiptId || null,
      }))
    } catch (err) {
      const message = err instanceof HttpError ? err.message : 'Failed to check channels'
      setState((prev) => ({ ...prev, error: message }))
    } finally {
      setActionInProgress(null)
    }
  }, [])

  // Fetch status for all channels
  const fetchStatus = useCallback(async () => {
    setActionInProgress('status')
    setState((prev) => ({ ...prev, error: null }))

    try {
      const result = await channelsApi.getStatus()
      // Merge status into channels
      setState((prev) => {
        const updatedChannels = prev.channels.map((ch) => {
          const statusInfo = result.data.find((s) => s.id === ch.id)
          if (statusInfo) {
            return { ...ch, status: statusInfo.status, lastActivity: statusInfo.lastActivity }
          }
          return ch
        })
        return {
          ...prev,
          channels: updatedChannels.length > 0 ? updatedChannels : result.data.map((s) => ({
            id: s.id,
            name: s.name || s.id,
            type: s.type || 'unknown',
            status: s.status,
            lastActivity: s.lastActivity,
          })),
          receiptId: result.receiptId || null,
        }
      })
    } catch (err) {
      const message = err instanceof HttpError ? err.message : 'Failed to fetch status'
      setState((prev) => ({ ...prev, error: message }))
    } finally {
      setActionInProgress(null)
    }
  }, [])

  const retryConnection = useCallback(() => {
    fetchChannels()
  }, [fetchChannels])

  const { isLoading, channels, healthChecks, error, receiptId } = state

  // Get icon for channel type
  const getChannelIcon = (type: string) => {
    const normalizedType = type.toLowerCase()
    return CHANNEL_ICONS[normalizedType] || CHANNEL_ICONS.default
  }

  // Get status color
  const getStatusColor = (status: Channel['status']) => {
    switch (status) {
      case 'connected':
        return 'text-status-success'
      case 'disconnected':
        return 'text-fg-3'
      case 'error':
        return 'text-status-error'
      default:
        return 'text-fg-2'
    }
  }

  // Get status icon
  const getStatusIcon = (status: Channel['status']) => {
    switch (status) {
      case 'connected':
        return Wifi
      case 'disconnected':
        return WifiOff
      case 'error':
        return AlertTriangle
      default:
        return WifiOff
    }
  }

  // Show OpenClaw unavailable error
  if (error && (error.includes('not found') || error.includes('not available') || error.includes('unavailable'))) {
    return (
      <div className="w-full space-y-6">
        <PageHeader
          title="Channels"
          subtitle="Manage messaging channels and integrations"
        />
        <OpenClawUnavailable error={error} onRetry={retryConnection} isRetrying={isLoading} />
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="Channels"
        subtitle="Manage messaging channels and integrations"
      />

      {/* Error Banner */}
      {error && (
        <div className="p-3 rounded-md border flex items-center gap-2 bg-status-error/10 border-status-error/30">
          <XCircle className="w-4 h-4 text-status-error shrink-0" />
          <span className="text-sm text-status-error">{error}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={fetchChannels}
          disabled={isLoading}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] font-medium transition-colors',
            'bg-accent-primary text-white hover:bg-accent-primary/90',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          List Channels
        </button>

        <button
          onClick={fetchStatus}
          disabled={actionInProgress !== null}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] font-medium transition-colors',
            'bg-bg-3 text-fg-0 hover:bg-bg-2',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {actionInProgress === 'status' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Radio className="w-4 h-4" />
          )}
          Get Status
        </button>

        <button
          onClick={checkAllChannels}
          disabled={actionInProgress !== null}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] font-medium transition-colors',
            'bg-status-info/10 text-status-info hover:bg-status-info/20',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {actionInProgress === 'check' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle className="w-4 h-4" />
          )}
          Check All
        </button>
      </div>

      {/* Receipt ID */}
      {receiptId && (
        <div className="text-xs text-fg-3 font-mono">
          Receipt: {receiptId}
        </div>
      )}

      {/* Channels List */}
      {channels.length > 0 && (
        <PageSection title="Configured Channels" description={`${channels.length} channel${channels.length !== 1 ? 's' : ''} configured`}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {channels.map((channel) => {
              const Icon = getChannelIcon(channel.type)
              const StatusIcon = getStatusIcon(channel.status)
              const statusColor = getStatusColor(channel.status)

              return (
                <div
                  key={channel.id}
                  className={cn(
                    'p-4 rounded-[var(--radius-lg)] border bg-bg-2 border-bd-0',
                    channel.status === 'connected' && 'border-status-success/30',
                    channel.status === 'error' && 'border-status-error/30'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center',
                        channel.status === 'connected' ? 'bg-status-success/10' : 'bg-bg-3'
                      )}>
                        <Icon className={cn(
                          'w-5 h-5',
                          channel.status === 'connected' ? 'text-status-success' : 'text-fg-2'
                        )} />
                      </div>
                      <div>
                        <h3 className="font-medium text-fg-0">{channel.name}</h3>
                        <p className="text-xs text-fg-3 capitalize">{channel.type}</p>
                      </div>
                    </div>
                    <div className={cn('flex items-center gap-1', statusColor)}>
                      <StatusIcon className="w-4 h-4" />
                      <span className="text-xs capitalize">{channel.status}</span>
                    </div>
                  </div>

                  {channel.lastActivity && (
                    <p className="text-xs text-fg-3 mt-3">
                      Last activity: {new Date(channel.lastActivity).toLocaleString()}
                    </p>
                  )}

                  {channel.error && (
                    <p className="text-xs text-status-error mt-2 flex items-start gap-1">
                      <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                      {channel.error}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </PageSection>
      )}

      {/* Health Check Results */}
      {healthChecks.length > 0 && (
        <PageSection title="Health Check Results" description="Latest connectivity test results">
          <div className="space-y-2">
            {healthChecks.map((check) => {
              const Icon = getChannelIcon(check.type)

              return (
                <div
                  key={check.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-[var(--radius-md)] border',
                    check.healthy
                      ? 'bg-status-success/5 border-status-success/30'
                      : 'bg-status-error/5 border-status-error/30'
                  )}
                >
                  <Icon className={cn(
                    'w-5 h-5 shrink-0',
                    check.healthy ? 'text-status-success' : 'text-status-error'
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-fg-0">{check.name}</span>
                      {check.latencyMs !== undefined && (
                        <span className="text-xs text-fg-3">{check.latencyMs}ms</span>
                      )}
                    </div>
                    {check.message && (
                      <p className="text-xs text-fg-2 truncate">{check.message}</p>
                    )}
                  </div>
                  {check.healthy ? (
                    <CheckCircle className="w-5 h-5 text-status-success shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-status-error shrink-0" />
                  )}
                </div>
              )
            })}
          </div>
        </PageSection>
      )}

      {/* Initial State */}
      {channels.length === 0 && !isLoading && (
        <div className="p-8 text-center bg-bg-2 rounded-[var(--radius-lg)]">
          <MessageSquare className="w-16 h-16 mx-auto mb-4 text-fg-3" />
          <h3 className="text-lg font-medium text-fg-0 mb-2">Messaging Channels</h3>
          <p className="text-sm text-fg-2 max-w-md mx-auto mb-4">
            Manage messaging integrations including WhatsApp, Telegram, Slack, Discord,
            and more. Connect channels to enable agent communication across platforms.
          </p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && channels.length === 0 && (
        <div className="p-8 text-center bg-bg-2 rounded-[var(--radius-lg)]">
          <Loader2 className="w-12 h-12 mx-auto mb-4 text-accent-primary animate-spin" />
          <h3 className="text-lg font-medium text-fg-0 mb-2">Loading Channels...</h3>
        </div>
      )}

      {/* TypedConfirmModal */}
      <TypedConfirmModal
        isOpen={protectedAction.state.isOpen}
        onClose={protectedAction.cancel}
        onConfirm={protectedAction.confirm}
        actionTitle={protectedAction.state.actionTitle}
        actionDescription={protectedAction.state.actionDescription}
        riskLevel={protectedAction.riskLevel}
        confirmMode={protectedAction.confirmMode}
        isLoading={protectedAction.state.isLoading}
      />
    </div>
  )
}
