'use client'

import { useState, useCallback } from 'react'
import { PageHeader, PageSection, TypedConfirmModal } from '@clawhub/ui'
import { browserApi, HttpError } from '@/lib/http'
import { useProtectedAction } from '@/lib/hooks/useProtectedAction'
import { OpenClawUnavailable } from '@/components/openclaw-unavailable'
import type { ActionKind } from '@clawhub/core'
import { cn } from '@/lib/utils'
import {
  Globe,
  RefreshCw,
  Loader2,
  Play,
  Square,
  Camera,
  Code,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ExternalLink,
  X,
  Monitor,
} from 'lucide-react'

// Types for browser state
interface BrowserStatus {
  running: boolean
  pid?: number
  url?: string
  profilePath?: string
  version?: string
}

interface BrowserTab {
  id: string
  title: string
  url: string
  active: boolean
}

interface BrowserState {
  isLoading: boolean
  status: BrowserStatus | null
  tabs: BrowserTab[]
  screenshot: string | null
  snapshot: string | null
  error: string | null
  receiptId: string | null
}

export function BrowserClient() {
  const [state, setState] = useState<BrowserState>({
    isLoading: false,
    status: null,
    tabs: [],
    screenshot: null,
    snapshot: null,
    error: null,
    receiptId: null,
  })
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)
  const [showScreenshot, setShowScreenshot] = useState(false)
  const [showSnapshot, setShowSnapshot] = useState(false)

  const protectedAction = useProtectedAction()

  // Fetch browser status
  const fetchStatus = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      const result = await browserApi.getStatus()
      setState((prev) => ({
        ...prev,
        isLoading: false,
        status: result.data,
        receiptId: result.receiptId || null,
      }))
    } catch (err) {
      const message = err instanceof HttpError ? err.message : 'Failed to fetch browser status'
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: message,
      }))
    }
  }, [])

  // Fetch tabs
  const fetchTabs = useCallback(async () => {
    setActionInProgress('tabs')
    setState((prev) => ({ ...prev, error: null }))

    try {
      const result = await browserApi.getTabs()
      setState((prev) => ({
        ...prev,
        tabs: result.data,
        receiptId: result.receiptId || null,
      }))
    } catch (err) {
      const message = err instanceof HttpError ? err.message : 'Failed to fetch tabs'
      setState((prev) => ({ ...prev, error: message }))
    } finally {
      setActionInProgress(null)
    }
  }, [])

  // Start browser with confirmation
  const handleStartBrowser = useCallback(() => {
    protectedAction.trigger({
      actionKind: 'action.caution' as ActionKind,
      actionTitle: 'Start Browser',
      actionDescription: 'Start the browser automation instance. This will launch a Chrome browser window.',
      onConfirm: async (typedConfirmText) => {
        setActionInProgress('start')
        setState((prev) => ({ ...prev, error: null }))

        try {
          await browserApi.start(typedConfirmText)
          await fetchStatus()
        } catch (err) {
          const message = err instanceof HttpError ? err.message : 'Failed to start browser'
          setState((prev) => ({ ...prev, error: message }))
        } finally {
          setActionInProgress(null)
        }
      },
      onError: (err) => {
        setState((prev) => ({ ...prev, error: err.message }))
      },
    })
  }, [fetchStatus, protectedAction])

  // Stop browser with confirmation
  const handleStopBrowser = useCallback(() => {
    protectedAction.trigger({
      actionKind: 'action.caution' as ActionKind,
      actionTitle: 'Stop Browser',
      actionDescription: 'Stop the browser automation instance. All tabs and sessions will be closed.',
      onConfirm: async (typedConfirmText) => {
        setActionInProgress('stop')
        setState((prev) => ({ ...prev, error: null }))

        try {
          await browserApi.stop(typedConfirmText)
          setState((prev) => ({
            ...prev,
            status: { running: false },
            tabs: [],
          }))
          await fetchStatus()
        } catch (err) {
          const message = err instanceof HttpError ? err.message : 'Failed to stop browser'
          setState((prev) => ({ ...prev, error: message }))
        } finally {
          setActionInProgress(null)
        }
      },
      onError: (err) => {
        setState((prev) => ({ ...prev, error: err.message }))
      },
    })
  }, [fetchStatus, protectedAction])

  // Take screenshot
  const handleScreenshot = useCallback(async () => {
    setActionInProgress('screenshot')
    setState((prev) => ({ ...prev, error: null, screenshot: null }))

    try {
      const result = await browserApi.screenshot()
      setState((prev) => ({
        ...prev,
        screenshot: result.data.dataUrl,
        receiptId: result.receiptId || null,
      }))
      setShowScreenshot(true)
    } catch (err) {
      const message = err instanceof HttpError ? err.message : 'Failed to take screenshot'
      setState((prev) => ({ ...prev, error: message }))
    } finally {
      setActionInProgress(null)
    }
  }, [])

  // Get DOM snapshot
  const handleSnapshot = useCallback(async () => {
    setActionInProgress('snapshot')
    setState((prev) => ({ ...prev, error: null, snapshot: null }))

    try {
      const result = await browserApi.snapshot()
      setState((prev) => ({
        ...prev,
        snapshot: result.data.html,
        receiptId: result.receiptId || null,
      }))
      setShowSnapshot(true)
    } catch (err) {
      const message = err instanceof HttpError ? err.message : 'Failed to get snapshot'
      setState((prev) => ({ ...prev, error: message }))
    } finally {
      setActionInProgress(null)
    }
  }, [])

  // Reset browser profile with danger confirmation
  const handleResetProfile = useCallback(() => {
    protectedAction.trigger({
      actionKind: 'action.danger' as ActionKind,
      actionTitle: 'Reset Browser Profile',
      actionDescription: 'This will permanently delete all browser data including cookies, history, and saved passwords. The browser must be stopped first.',
      onConfirm: async (typedConfirmText) => {
        setActionInProgress('reset')
        setState((prev) => ({ ...prev, error: null }))

        try {
          await browserApi.resetProfile(typedConfirmText)
          await fetchStatus()
        } catch (err) {
          const message = err instanceof HttpError ? err.message : 'Failed to reset profile'
          setState((prev) => ({ ...prev, error: message }))
        } finally {
          setActionInProgress(null)
        }
      },
      onError: (err) => {
        setState((prev) => ({ ...prev, error: err.message }))
      },
    })
  }, [fetchStatus, protectedAction])

  const retryConnection = useCallback(() => {
    fetchStatus()
  }, [fetchStatus])

  const { isLoading, status, tabs, error, receiptId, screenshot, snapshot } = state

  // Show OpenClaw unavailable error
  if (error && (error.includes('not found') || error.includes('not available') || error.includes('unavailable'))) {
    return (
      <div className="w-full space-y-6">
        <PageHeader
          title="Browser Control"
          subtitle="Manage the browser automation instance"
        />
        <OpenClawUnavailable error={error} onRetry={retryConnection} isRetrying={isLoading} />
      </div>
    )
  }

  const browserIsRunning = status?.running

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="Browser Control"
        subtitle="Manage the browser automation instance"
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
          onClick={fetchStatus}
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
          Check Status
        </button>

        {status && !browserIsRunning && (
          <button
            onClick={handleStartBrowser}
            disabled={actionInProgress !== null}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] font-medium transition-colors',
              'bg-status-success/10 text-status-success hover:bg-status-success/20',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {actionInProgress === 'start' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Start Browser
          </button>
        )}

        {status && browserIsRunning && (
          <>
            <button
              onClick={handleStopBrowser}
              disabled={actionInProgress !== null}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] font-medium transition-colors',
                'bg-status-warning/10 text-status-warning hover:bg-status-warning/20',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {actionInProgress === 'stop' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              Stop Browser
            </button>

            <button
              onClick={fetchTabs}
              disabled={actionInProgress !== null}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] font-medium transition-colors',
                'bg-bg-3 text-fg-0 hover:bg-bg-2',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {actionInProgress === 'tabs' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Globe className="w-4 h-4" />
              )}
              List Tabs
            </button>

            <button
              onClick={handleScreenshot}
              disabled={actionInProgress !== null}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] font-medium transition-colors',
                'bg-bg-3 text-fg-0 hover:bg-bg-2',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {actionInProgress === 'screenshot' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
              Screenshot
            </button>

            <button
              onClick={handleSnapshot}
              disabled={actionInProgress !== null}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] font-medium transition-colors',
                'bg-bg-3 text-fg-0 hover:bg-bg-2',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {actionInProgress === 'snapshot' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Code className="w-4 h-4" />
              )}
              DOM Snapshot
            </button>
          </>
        )}

        {status && !browserIsRunning && (
          <button
            onClick={handleResetProfile}
            disabled={actionInProgress !== null}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] font-medium transition-colors',
              'bg-status-danger/10 text-status-danger hover:bg-status-danger/20',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {actionInProgress === 'reset' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            Reset Profile
          </button>
        )}
      </div>

      {/* Receipt ID */}
      {receiptId && (
        <div className="text-xs text-fg-3 font-mono">
          Receipt: {receiptId}
        </div>
      )}

      {/* Status Card */}
      {status && (
        <PageSection title="Browser Status" description="Current state of the browser instance">
          <div className={cn(
            'p-4 rounded-[var(--radius-lg)] border flex items-center gap-4',
            browserIsRunning
              ? 'bg-status-success/10 border-status-success/30'
              : 'bg-bg-3 border-bd-0'
          )}>
            <div className={cn(
              'w-12 h-12 rounded-full flex items-center justify-center',
              browserIsRunning ? 'bg-status-success/20' : 'bg-bg-2'
            )}>
              <Monitor className={cn(
                'w-6 h-6',
                browserIsRunning ? 'text-status-success' : 'text-fg-3'
              )} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className={cn(
                  'font-semibold',
                  browserIsRunning ? 'text-status-success' : 'text-fg-0'
                )}>
                  {browserIsRunning ? 'Browser Running' : 'Browser Stopped'}
                </h3>
                {browserIsRunning && (
                  <span className="px-2 py-0.5 text-xs rounded bg-status-success/20 text-status-success">
                    PID: {status.pid}
                  </span>
                )}
              </div>
              {status.url && (
                <p className="text-sm text-fg-2 font-mono mt-1">{status.url}</p>
              )}
              {status.version && (
                <p className="text-xs text-fg-3 mt-1">Version: {status.version}</p>
              )}
            </div>
          </div>
        </PageSection>
      )}

      {/* Tabs List */}
      {tabs.length > 0 && (
        <PageSection title="Open Tabs" description={`${tabs.length} tab${tabs.length !== 1 ? 's' : ''} open`}>
          <div className="space-y-2">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-[var(--radius-md)] border',
                  tab.active
                    ? 'bg-accent-primary/5 border-accent-primary/30'
                    : 'bg-bg-3 border-bd-0'
                )}
              >
                <Globe className={cn(
                  'w-4 h-4 shrink-0',
                  tab.active ? 'text-accent-primary' : 'text-fg-3'
                )} />
                <div className="flex-1 min-w-0">
                  <div className={cn(
                    'text-sm font-medium truncate',
                    tab.active ? 'text-accent-primary' : 'text-fg-0'
                  )}>
                    {tab.title || 'Untitled'}
                  </div>
                  <div className="text-xs text-fg-3 font-mono truncate">{tab.url}</div>
                </div>
                {tab.active && (
                  <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-accent-primary/20 text-accent-primary">
                    ACTIVE
                  </span>
                )}
                <a
                  href={tab.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-fg-2 hover:text-fg-0 hover:bg-bg-2 rounded"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            ))}
          </div>
        </PageSection>
      )}

      {/* Initial State */}
      {!status && !isLoading && (
        <div className="p-8 text-center bg-bg-2 rounded-[var(--radius-lg)]">
          <Globe className="w-16 h-16 mx-auto mb-4 text-fg-3" />
          <h3 className="text-lg font-medium text-fg-0 mb-2">Browser Control</h3>
          <p className="text-sm text-fg-2 max-w-md mx-auto mb-4">
            Manage the browser automation instance used by OpenClaw agents for web interactions.
            Start, stop, view tabs, take screenshots, and manage the browser profile.
          </p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && !status && (
        <div className="p-8 text-center bg-bg-2 rounded-[var(--radius-lg)]">
          <Loader2 className="w-12 h-12 mx-auto mb-4 text-accent-primary animate-spin" />
          <h3 className="text-lg font-medium text-fg-0 mb-2">Checking Browser Status...</h3>
        </div>
      )}

      {/* Screenshot Modal */}
      {showScreenshot && screenshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowScreenshot(false)}
          />
          <div className="relative bg-bg-1 border border-bd-1 rounded-[var(--radius-lg)] shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-bd-0">
              <h3 className="font-medium text-fg-0">Screenshot</h3>
              <button
                onClick={() => setShowScreenshot(false)}
                className="p-1.5 text-fg-2 hover:text-fg-0 hover:bg-bg-3 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 overflow-auto max-h-[calc(90vh-60px)]">
              <img
                src={screenshot}
                alt="Browser screenshot"
                className="w-full h-auto rounded border border-bd-0"
              />
            </div>
          </div>
        </div>
      )}

      {/* DOM Snapshot Modal */}
      {showSnapshot && snapshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowSnapshot(false)}
          />
          <div className="relative bg-bg-1 border border-bd-1 rounded-[var(--radius-lg)] shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-bd-0">
              <h3 className="font-medium text-fg-0">DOM Snapshot</h3>
              <button
                onClick={() => setShowSnapshot(false)}
                className="p-1.5 text-fg-2 hover:text-fg-0 hover:bg-bg-3 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 overflow-auto max-h-[calc(90vh-60px)]">
              <pre className="text-xs text-fg-2 font-mono whitespace-pre-wrap bg-bg-3 p-4 rounded border border-bd-0">
                {snapshot}
              </pre>
            </div>
          </div>
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
