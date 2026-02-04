'use client'

import { useState, useCallback, useEffect } from 'react'
import { PageHeader, PageSection, TypedConfirmModal } from '@clawhub/ui'
import { memoryApi, HttpError } from '@/lib/http'
import { useProtectedAction } from '@/lib/hooks/useProtectedAction'
import { OpenClawUnavailable } from '@/components/openclaw-unavailable'
import type { ActionKind } from '@clawhub/core'
import { cn } from '@/lib/utils'
import { MemoryCalendar } from './components/memory-calendar'
import { DayViewer } from './components/day-viewer'
import {
  RefreshCw,
  Loader2,
  Database,
  HardDrive,
  FileText,
  Search,
  XCircle,
  Calendar,
  RotateCcw,
} from 'lucide-react'

// Types for memory state
interface MemoryStatus {
  filesIndexed: number
  totalChunks: number
  backend: string
  lastIndexed?: string
  indexSizeBytes?: number
  workspacePath?: string
}

interface SearchResult {
  path: string
  snippet: string
  score: number
  line?: number
}

interface DailyNoteInfo {
  date: string
  exists: boolean
  eventCount?: number
  sizeBytes?: number
}

interface MemoryState {
  isLoading: boolean
  status: MemoryStatus | null
  searchResults: SearchResult[]
  dailyNotes: Map<string, DailyNoteInfo>
  error: string | null
  receiptId: string | null
}

type TabId = 'index' | 'calendar'

export function MemoryClient() {
  const [activeTab, setActiveTab] = useState<TabId>('index')
  const [state, setState] = useState<MemoryState>({
    isLoading: false,
    status: null,
    searchResults: [],
    dailyNotes: new Map(),
    error: null,
    receiptId: null,
  })
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  // Calendar state
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [dayContent, setDayContent] = useState<string | null>(null)
  const [dayLoading, setDayLoading] = useState(false)
  const [dayError, setDayError] = useState<string | null>(null)

  const protectedAction = useProtectedAction()

  // Fetch memory status
  const fetchStatus = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      const result = await memoryApi.getStatus()
      setState((prev) => ({
        ...prev,
        isLoading: false,
        status: result.data,
        receiptId: result.receiptId || null,
      }))
    } catch (err) {
      const message = err instanceof HttpError ? err.message : 'Failed to fetch memory status'
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: message,
      }))
    }
  }, [])

  // Fetch daily notes list
  const fetchDailyNotes = useCallback(async () => {
    try {
      const result = await memoryApi.getDailyNotes()
      const notesMap = new Map<string, DailyNoteInfo>()
      for (const note of result.data) {
        notesMap.set(note.date, note)
      }
      setState((prev) => ({
        ...prev,
        dailyNotes: notesMap,
      }))
    } catch (err) {
      // Silently fail for daily notes list
      console.error('Failed to fetch daily notes:', err)
    }
  }, [])

  // Rebuild index with confirmation
  const handleRebuildIndex = useCallback(() => {
    protectedAction.trigger({
      actionKind: 'action.caution' as ActionKind,
      actionTitle: 'Rebuild Memory Index',
      actionDescription: 'This will rebuild the entire memory index. Depending on the number of files in your workspace, this may take several minutes.',
      onConfirm: async (typedConfirmText) => {
        setActionInProgress('rebuild')
        setState((prev) => ({ ...prev, error: null }))

        try {
          await memoryApi.rebuildIndex(typedConfirmText)
          // Refresh status after rebuild
          await fetchStatus()
        } catch (err) {
          const message = err instanceof HttpError ? err.message : 'Failed to rebuild index'
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

  // Search memory
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return

    setIsSearching(true)
    setState((prev) => ({ ...prev, error: null, searchResults: [] }))

    try {
      const result = await memoryApi.search(searchQuery)
      setState((prev) => ({
        ...prev,
        searchResults: result.data,
        receiptId: result.receiptId || null,
      }))
    } catch (err) {
      const message = err instanceof HttpError ? err.message : 'Search failed'
      setState((prev) => ({ ...prev, error: message }))
    } finally {
      setIsSearching(false)
    }
  }, [searchQuery])

  // Handle day click in calendar
  const handleDayClick = useCallback(async (date: string) => {
    setSelectedDate(date)
    setDayContent(null)
    setDayError(null)
    setDayLoading(true)

    try {
      const result = await memoryApi.getDailyNote(date)
      setDayContent(result.data?.content || null)
    } catch (err) {
      const message = err instanceof HttpError ? err.message : 'Failed to load daily note'
      setDayError(message)
    } finally {
      setDayLoading(false)
    }
  }, [])

  // Close day viewer
  const closeDayViewer = useCallback(() => {
    setSelectedDate(null)
    setDayContent(null)
    setDayError(null)
  }, [])

  // Retry connection
  const retryConnection = useCallback(() => {
    fetchStatus()
  }, [fetchStatus])

  // Load daily notes when calendar tab is active
  useEffect(() => {
    if (activeTab === 'calendar') {
      fetchDailyNotes()
    }
  }, [activeTab, fetchDailyNotes])

  const { isLoading, status, searchResults, dailyNotes, error, receiptId } = state

  // Format file size
  const formatSize = (bytes: number | undefined) => {
    if (bytes === undefined) return 'N/A'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Show OpenClaw unavailable error
  if (error && (error.includes('not found') || error.includes('not available') || error.includes('unavailable'))) {
    return (
      <div className="w-full space-y-6">
        <PageHeader
          title="Memory"
          subtitle="Memory index and daily notes"
        />
        <OpenClawUnavailable error={error} onRetry={retryConnection} isRetrying={isLoading} />
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="Memory"
        subtitle="Memory index and daily notes"
      />

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 p-1 bg-bg-2 rounded-[var(--radius-md)] w-fit">
        <button
          onClick={() => setActiveTab('index')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-[var(--radius-sm)] text-sm font-medium transition-colors',
            activeTab === 'index'
              ? 'bg-bg-1 text-fg-0 shadow-sm'
              : 'text-fg-2 hover:text-fg-0'
          )}
        >
          <Database className="w-4 h-4" />
          Index
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-[var(--radius-sm)] text-sm font-medium transition-colors',
            activeTab === 'calendar'
              ? 'bg-bg-1 text-fg-0 shadow-sm'
              : 'text-fg-2 hover:text-fg-0'
          )}
        >
          <Calendar className="w-4 h-4" />
          Calendar
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3 rounded-md border flex items-center gap-2 bg-status-error/10 border-status-error/30">
          <XCircle className="w-4 h-4 text-status-error shrink-0" />
          <span className="text-sm text-status-error">{error}</span>
        </div>
      )}

      {/* Index Tab */}
      {activeTab === 'index' && (
        <>
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
              Memory Status
            </button>

            <button
              onClick={handleRebuildIndex}
              disabled={actionInProgress !== null}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] font-medium transition-colors',
                'bg-status-warning/10 text-status-warning hover:bg-status-warning/20',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {actionInProgress === 'rebuild' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4" />
              )}
              Rebuild Index
            </button>
          </div>

          {/* Receipt ID */}
          {receiptId && (
            <div className="text-xs text-fg-3 font-mono">
              Receipt: {receiptId}
            </div>
          )}

          {/* Status Cards */}
          {status && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-[var(--radius-lg)] border bg-bg-2 border-bd-0">
                <div className="flex items-center gap-2 text-fg-3 mb-2">
                  <FileText className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase">Files Indexed</span>
                </div>
                <p className="text-2xl font-semibold text-fg-0">{status.filesIndexed.toLocaleString()}</p>
              </div>

              <div className="p-4 rounded-[var(--radius-lg)] border bg-bg-2 border-bd-0">
                <div className="flex items-center gap-2 text-fg-3 mb-2">
                  <Database className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase">Total Chunks</span>
                </div>
                <p className="text-2xl font-semibold text-fg-0">{status.totalChunks.toLocaleString()}</p>
              </div>

              <div className="p-4 rounded-[var(--radius-lg)] border bg-bg-2 border-bd-0">
                <div className="flex items-center gap-2 text-fg-3 mb-2">
                  <HardDrive className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase">Index Size</span>
                </div>
                <p className="text-2xl font-semibold text-fg-0">{formatSize(status.indexSizeBytes)}</p>
              </div>

              <div className="p-4 rounded-[var(--radius-lg)] border bg-bg-2 border-bd-0">
                <div className="flex items-center gap-2 text-fg-3 mb-2">
                  <Database className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase">Backend</span>
                </div>
                <p className="text-lg font-semibold text-fg-0">{status.backend}</p>
                {status.lastIndexed && (
                  <p className="text-xs text-fg-3 mt-1">
                    Last indexed: {new Date(status.lastIndexed).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Search Section */}
          <PageSection title="Search Memory" description="Search through indexed files">
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Enter search query..."
                className="flex-1 px-4 py-2 rounded-[var(--radius-md)] bg-bg-3 border border-bd-0 text-fg-0 placeholder:text-fg-3 focus:outline-none focus:ring-1 focus:ring-accent-primary"
              />
              <button
                onClick={handleSearch}
                disabled={isSearching || !searchQuery.trim()}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] font-medium transition-colors',
                  'bg-accent-primary text-white hover:bg-accent-primary/90',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {isSearching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                Search
              </button>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs text-fg-3">{searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found</p>
                {searchResults.map((result, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-[var(--radius-md)] bg-bg-3 border border-bd-0"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-fg-0 font-mono">{result.path}</span>
                      <span className="text-xs text-fg-3">Score: {(result.score * 100).toFixed(0)}%</span>
                    </div>
                    {result.line !== undefined && (
                      <span className="text-xs text-fg-3">Line {result.line}</span>
                    )}
                    <p className="text-sm text-fg-2 mt-1 line-clamp-2">{result.snippet}</p>
                  </div>
                ))}
              </div>
            )}
          </PageSection>

          {/* Initial State */}
          {!status && !isLoading && (
            <div className="p-8 text-center bg-bg-2 rounded-[var(--radius-lg)]">
              <Database className="w-16 h-16 mx-auto mb-4 text-fg-3" />
              <h3 className="text-lg font-medium text-fg-0 mb-2">Memory Index</h3>
              <p className="text-sm text-fg-2 max-w-md mx-auto mb-4">
                The memory index enables semantic search across your workspace files.
                Click "Memory Status" to view index statistics and search capabilities.
              </p>
            </div>
          )}

          {/* Loading State */}
          {isLoading && !status && (
            <div className="p-8 text-center bg-bg-2 rounded-[var(--radius-lg)]">
              <Loader2 className="w-12 h-12 mx-auto mb-4 text-accent-primary animate-spin" />
              <h3 className="text-lg font-medium text-fg-0 mb-2">Loading Memory Status...</h3>
            </div>
          )}
        </>
      )}

      {/* Calendar Tab */}
      {activeTab === 'calendar' && (
        <>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={fetchDailyNotes}
              disabled={isLoading}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] font-medium transition-colors',
                'bg-accent-primary text-white hover:bg-accent-primary/90',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar */}
            <div className="lg:col-span-2">
              <MemoryCalendar
                month={selectedMonth}
                onMonthChange={setSelectedMonth}
                dailyNotes={dailyNotes}
                onDayClick={handleDayClick}
                selectedDate={selectedDate || undefined}
              />
            </div>

            {/* Sidebar with notes info */}
            <div className="space-y-4">
              <div className="p-4 rounded-[var(--radius-lg)] border bg-bg-2 border-bd-0">
                <h3 className="font-medium text-fg-0 mb-2">Daily Notes</h3>
                <p className="text-sm text-fg-2">
                  {dailyNotes.size} notes found in workspace
                </p>
                <p className="text-xs text-fg-3 mt-2">
                  Click any day to view its daily note. Days with notes are highlighted with a dot.
                </p>
              </div>

              {selectedDate && (
                <div className="p-4 rounded-[var(--radius-lg)] border bg-status-info/5 border-status-info/30">
                  <h3 className="font-medium text-fg-0 mb-1">Selected: {selectedDate}</h3>
                  <p className="text-xs text-fg-3">
                    {dailyNotes.get(selectedDate)?.exists
                      ? 'Daily note exists'
                      : 'No daily note for this date'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Day Viewer Modal */}
      {selectedDate && (
        <DayViewer
          date={selectedDate}
          content={dayContent}
          isLoading={dayLoading}
          error={dayError}
          onClose={closeDayViewer}
        />
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
