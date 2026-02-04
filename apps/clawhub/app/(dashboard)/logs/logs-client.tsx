'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { PageHeader, PageSection } from '@clawhub/ui'
import { logsApi, HttpError } from '@/lib/http'
import { OpenClawUnavailable } from '@/components/openclaw-unavailable'
import { cn } from '@/lib/utils'
import {
  ScrollText,
  RefreshCw,
  Download,
  Search,
  Filter,
  Loader2,
  XCircle,
  AlertTriangle,
  Info,
  Bug,
  ChevronDown,
  ArrowDown,
  Server,
  Clock,
  Pause,
  Play,
} from 'lucide-react'

type LogLevel = 'all' | 'error' | 'warn' | 'info' | 'debug'
type LogSource = 'all' | 'gateway'

interface LogEntry {
  timestamp: string
  level: 'error' | 'warn' | 'info' | 'debug' | 'trace'
  message: string
  source?: string
  context?: Record<string, unknown>
}

interface LogsState {
  isLoading: boolean
  source: LogSource
  entries: LogEntry[]
  rawOutput: string
  error: string | null
  receiptId: string | null
}

export function LogsClient() {
  const [state, setState] = useState<LogsState>({
    isLoading: false,
    source: 'all',
    entries: [],
    rawOutput: '',
    error: null,
    receiptId: null,
  })
  const [levelFilter, setLevelFilter] = useState<LogLevel>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [autoScroll, setAutoScroll] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const logsEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [state.entries, autoScroll])

  const fetchLogs = useCallback(async (source: LogSource) => {
    setState((prev) => ({
      ...prev,
      isLoading: true,
      source,
      error: null,
    }))

    try {
      const result = source === 'gateway'
        ? await logsApi.getGatewayLogs()
        : await logsApi.getRecentLogs()

      setState((prev) => ({
        ...prev,
        isLoading: false,
        entries: result.data.entries,
        rawOutput: result.data.raw || '',
        receiptId: result.receiptId || null,
      }))
    } catch (err) {
      const message = err instanceof HttpError ? err.message : 'Failed to fetch logs'
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: message,
      }))
    }
  }, [])

  const refreshLogs = useCallback(() => {
    fetchLogs(state.source)
  }, [fetchLogs, state.source])

  const exportLogs = useCallback(() => {
    if (!state.rawOutput && state.entries.length === 0) return

    const content = state.rawOutput || state.entries
      .map((e) => `[${e.timestamp}] [${e.level.toUpperCase()}] ${e.message}`)
      .join('\n')

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `openclaw-logs-${new Date().toISOString().split('T')[0]}.log`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [state.rawOutput, state.entries])

  const retryConnection = useCallback(() => {
    fetchLogs('all')
  }, [fetchLogs])

  // Filter and search logs
  const filteredLogs = state.entries.filter((entry) => {
    // Level filter
    if (levelFilter !== 'all' && entry.level !== levelFilter) {
      return false
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        entry.message.toLowerCase().includes(query) ||
        entry.source?.toLowerCase().includes(query) ||
        entry.timestamp.toLowerCase().includes(query)
      )
    }

    return true
  })

  const { isLoading, error, receiptId } = state

  // Show OpenClaw unavailable error
  if (error && (error.includes('not found') || error.includes('not available') || error.includes('unavailable'))) {
    return (
      <div className="w-full space-y-6">
        <PageHeader
          title="Logs"
          subtitle="View and search OpenClaw system logs"
        />
        <OpenClawUnavailable error={error} onRetry={retryConnection} isRetrying={isLoading} />
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="Logs"
        subtitle="View and search OpenClaw system logs"
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
          onClick={() => fetchLogs('all')}
          disabled={isLoading}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] font-medium transition-colors',
            state.source === 'all' && state.entries.length > 0
              ? 'bg-accent-primary text-white hover:bg-accent-primary/90'
              : 'bg-accent-primary text-white hover:bg-accent-primary/90',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {isLoading && state.source === 'all' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ScrollText className="w-4 h-4" />
          )}
          View Logs
        </button>

        <button
          onClick={() => fetchLogs('gateway')}
          disabled={isLoading}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] font-medium transition-colors',
            'bg-bg-3 text-fg-0 hover:bg-bg-2',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {isLoading && state.source === 'gateway' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Server className="w-4 h-4" />
          )}
          Gateway Logs
        </button>

        <button
          onClick={refreshLogs}
          disabled={isLoading || state.entries.length === 0}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] font-medium transition-colors',
            'bg-bg-3 text-fg-0 hover:bg-bg-2',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          Refresh
        </button>

        <button
          onClick={exportLogs}
          disabled={state.entries.length === 0}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] font-medium transition-colors',
            'bg-bg-3 text-fg-0 hover:bg-bg-2',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      {/* Receipt ID */}
      {receiptId && (
        <div className="text-xs text-fg-3 font-mono">
          Receipt: {receiptId}
        </div>
      )}

      {/* Logs View */}
      {state.entries.length > 0 && (
        <>
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-3 bg-bg-2 rounded-[var(--radius-md)] p-3 border border-bd-0">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-3" />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  'w-full pl-9 pr-3 py-2 rounded-[var(--radius-sm)] text-sm',
                  'bg-bg-3 border border-bd-0 text-fg-0 placeholder:text-fg-3',
                  'focus:outline-none focus:border-accent-primary'
                )}
              />
            </div>

            {/* Level Filter */}
            <div className="relative">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-[var(--radius-sm)] text-sm',
                  'bg-bg-3 border border-bd-0 text-fg-0 hover:bg-bg-1'
                )}
              >
                <Filter className="w-4 h-4" />
                Level: {levelFilter === 'all' ? 'All' : levelFilter.toUpperCase()}
                <ChevronDown className="w-4 h-4" />
              </button>
              {showFilters && (
                <div className="absolute top-full left-0 mt-1 bg-bg-2 border border-bd-0 rounded-[var(--radius-md)] shadow-lg z-10 min-w-[120px]">
                  {(['all', 'error', 'warn', 'info', 'debug'] as LogLevel[]).map((level) => (
                    <button
                      key={level}
                      onClick={() => {
                        setLevelFilter(level)
                        setShowFilters(false)
                      }}
                      className={cn(
                        'w-full px-3 py-2 text-left text-sm hover:bg-bg-3 first:rounded-t-[var(--radius-md)] last:rounded-b-[var(--radius-md)]',
                        levelFilter === level ? 'text-accent-primary' : 'text-fg-0'
                      )}
                    >
                      {level === 'all' ? 'All Levels' : level.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Auto-scroll toggle */}
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-[var(--radius-sm)] text-sm',
                'bg-bg-3 border border-bd-0 hover:bg-bg-1',
                autoScroll ? 'text-accent-primary' : 'text-fg-2'
              )}
            >
              {autoScroll ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              Auto-scroll
            </button>

            {/* Count */}
            <div className="text-xs text-fg-2">
              {filteredLogs.length} of {state.entries.length} entries
            </div>
          </div>

          {/* Logs List */}
          <PageSection title="Log Entries" description={`Showing ${filteredLogs.length} entries`}>
            <div className="bg-bg-1 border border-bd-0 rounded-[var(--radius-md)] max-h-[600px] overflow-y-auto font-mono text-xs">
              {filteredLogs.length === 0 ? (
                <div className="p-8 text-center text-fg-2">
                  No logs match your filters
                </div>
              ) : (
                <div className="divide-y divide-bd-0">
                  {filteredLogs.map((entry, idx) => (
                    <LogEntryRow key={idx} entry={entry} />
                  ))}
                  <div ref={logsEndRef} />
                </div>
              )}
            </div>
          </PageSection>
        </>
      )}

      {/* Initial State */}
      {state.entries.length === 0 && !isLoading && !error && (
        <div className="p-8 text-center bg-bg-2 rounded-[var(--radius-lg)]">
          <ScrollText className="w-16 h-16 mx-auto mb-4 text-fg-3" />
          <h3 className="text-lg font-medium text-fg-0 mb-2">View System Logs</h3>
          <p className="text-sm text-fg-2 max-w-md mx-auto mb-4">
            Access OpenClaw system logs to monitor activity, debug issues, and track
            agent operations. Logs can be filtered by level and searched.
          </p>
          <div className="flex flex-col gap-2 text-sm text-fg-2 max-w-sm mx-auto text-left">
            <div className="flex items-start gap-2">
              <ScrollText className="w-4 h-4 mt-0.5 text-accent-primary shrink-0" />
              <span><strong>View Logs</strong> - Recent 300 log entries</span>
            </div>
            <div className="flex items-start gap-2">
              <Server className="w-4 h-4 mt-0.5 text-fg-2 shrink-0" />
              <span><strong>Gateway Logs</strong> - Gateway-specific logs</span>
            </div>
            <div className="flex items-start gap-2">
              <Download className="w-4 h-4 mt-0.5 text-fg-2 shrink-0" />
              <span><strong>Export</strong> - Download logs as .log file</span>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && state.entries.length === 0 && (
        <div className="p-8 text-center bg-bg-2 rounded-[var(--radius-lg)]">
          <Loader2 className="w-12 h-12 mx-auto mb-4 text-accent-primary animate-spin" />
          <h3 className="text-lg font-medium text-fg-0 mb-2">
            Fetching Logs...
          </h3>
          <p className="text-sm text-fg-2">
            Retrieving log entries from OpenClaw...
          </p>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

function LogEntryRow({ entry }: { entry: LogEntry }) {
  const [expanded, setExpanded] = useState(false)

  const levelConfig = {
    error: { color: 'text-status-error bg-status-error/10', icon: XCircle },
    warn: { color: 'text-status-warning bg-status-warning/10', icon: AlertTriangle },
    info: { color: 'text-status-info bg-status-info/10', icon: Info },
    debug: { color: 'text-fg-2 bg-bg-3', icon: Bug },
    trace: { color: 'text-fg-3 bg-bg-3', icon: Bug },
  }

  const config = levelConfig[entry.level] || levelConfig.info
  const Icon = config.icon
  const hasContext = entry.context && Object.keys(entry.context).length > 0

  return (
    <div className="hover:bg-bg-2/50 transition-colors">
      <div
        className={cn(
          'flex items-start gap-2 px-3 py-2',
          hasContext && 'cursor-pointer'
        )}
        onClick={() => hasContext && setExpanded(!expanded)}
      >
        {/* Timestamp */}
        <span className="text-fg-3 shrink-0 w-[140px]">
          {formatTimestamp(entry.timestamp)}
        </span>

        {/* Level Badge */}
        <span className={cn(
          'shrink-0 w-[60px] px-1.5 py-0.5 rounded text-center flex items-center justify-center gap-1',
          config.color
        )}>
          <Icon className="w-3 h-3" />
          {entry.level.toUpperCase()}
        </span>

        {/* Source */}
        {entry.source && (
          <span className="text-fg-2 shrink-0 w-[100px] truncate">
            [{entry.source}]
          </span>
        )}

        {/* Message */}
        <span className="text-fg-0 flex-1 break-all">
          {entry.message}
        </span>

        {/* Expand indicator */}
        {hasContext && (
          <ChevronDown className={cn(
            'w-4 h-4 text-fg-3 shrink-0 transition-transform',
            expanded && 'rotate-180'
          )} />
        )}
      </div>

      {/* Context details */}
      {expanded && hasContext && (
        <div className="px-3 pb-2 pl-[210px]">
          <pre className="text-fg-2 whitespace-pre-wrap bg-bg-3 p-2 rounded text-[10px]">
            {JSON.stringify(entry.context, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// HELPERS
// ============================================================================

function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }) + '.' + date.getMilliseconds().toString().padStart(3, '0')
  } catch {
    return timestamp
  }
}
