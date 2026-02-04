'use client'

import { cn } from '@/lib/utils'
import {
  X,
  Search,
  FolderOpen,
  Copy,
  CheckCircle,
  Loader2,
  FileText,
} from 'lucide-react'
import { useState, useCallback } from 'react'
import Link from 'next/link'

interface DayViewerProps {
  date: string // YYYY-MM-DD
  content: string | null
  isLoading: boolean
  error: string | null
  onClose: () => void
  onSearchWithinDay?: (date: string) => void
}

export function DayViewer({
  date,
  content,
  isLoading,
  error,
  onClose,
  onSearchWithinDay,
}: DayViewerProps) {
  const [copied, setCopied] = useState(false)

  const filePath = `memory/${date}.md`

  const handleCopyPath = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(filePath)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API failed
    }
  }, [filePath])

  const formatDateDisplay = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-bg-1 border border-bd-1 rounded-[var(--radius-lg)] shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-bd-0 shrink-0">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-accent-primary" />
            <div>
              <h3 className="font-medium text-fg-0">{formatDateDisplay(date)}</h3>
              <p className="text-xs text-fg-3 font-mono">{filePath}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-fg-2 hover:text-fg-0 hover:bg-bg-3 rounded-[var(--radius-md)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-bd-0 shrink-0">
          {onSearchWithinDay && (
            <button
              onClick={() => onSearchWithinDay(date)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-[var(--radius-md)] bg-bg-3 text-fg-1 hover:text-fg-0 hover:bg-bg-2 transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
              Search within day
            </button>
          )}
          <Link
            href={`/workspace?path=${encodeURIComponent(filePath)}`}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-[var(--radius-md)] bg-bg-3 text-fg-1 hover:text-fg-0 hover:bg-bg-2 transition-colors"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            Open in Workspace
          </Link>
          <button
            onClick={handleCopyPath}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-[var(--radius-md)] transition-colors',
              copied
                ? 'bg-status-success/10 text-status-success'
                : 'bg-bg-3 text-fg-1 hover:text-fg-0 hover:bg-bg-2'
            )}
          >
            {copied ? (
              <>
                <CheckCircle className="w-3.5 h-3.5" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy path
              </>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 min-h-0">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-accent-primary animate-spin" />
            </div>
          )}

          {error && !isLoading && (
            <div className="p-4 rounded-[var(--radius-md)] bg-status-error/10 border border-status-error/30 text-status-error text-sm">
              {error}
            </div>
          )}

          {!content && !isLoading && !error && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto mb-3 text-fg-3" />
              <p className="text-fg-2">No daily note for this date.</p>
              <p className="text-xs text-fg-3 mt-1">
                Daily notes are created automatically when events occur.
              </p>
            </div>
          )}

          {content && !isLoading && (
            <div className="prose prose-invert prose-sm max-w-none">
              <pre className="whitespace-pre-wrap text-sm text-fg-1 font-mono bg-bg-3 p-4 rounded-[var(--radius-md)] border border-bd-0 overflow-x-auto">
                {content}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
