'use client'

import { memo, useMemo } from 'react'
import Image from 'next/image'
import { Bot, Terminal, User } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'
import { CopyButton } from './code-block/copy-button'
import { Markdown } from './markdown'

export type PromptKitRole = 'operator' | 'agent' | 'system'

export interface MessageProps {
  id?: string
  role: PromptKitRole
  content: string
  attachments?: Array<{
    type: 'image'
    mimeType: string
    fileName: string
    content: string
  }>
  timestamp: Date
  pending?: boolean
  streaming?: boolean
  error?: string
  className?: string
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 text-fg-2">
      <span className="inline-flex gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-fg-2 animate-pulse" />
        <span className="w-1.5 h-1.5 rounded-full bg-fg-2 animate-pulse [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-fg-2 animate-pulse [animation-delay:300ms]" />
      </span>
      <span className="text-xs">Thinking…</span>
    </div>
  )
}

function splitTraceContent(content: string): { main: string; trace: string | null } {
  const trimmed = content.trim()
  if (!trimmed) return { main: '', trace: null }

  const lines = content.split('\n')
  if (lines.length < 6) return { main: content, trace: null }

  const LOG_LINE_PATTERN =
    /^\s*(?:clawcontrol@\S+\s+dev|> .* dev|cross-env\s|node\s+scripts\/|▲\s+Next\.js|✓\s+Starting|⚠\s+|Local:\s+http|Network:\s+http|prisma:query|\[(?:db|boot)\]|error:|warn:|info:|SELECT\s|BEGIN\s|COMMIT\b|FROM\s+main\.)/i

  let splitIndex = 0
  for (const line of lines) {
    if (LOG_LINE_PATTERN.test(line.trim())) {
      splitIndex++
      continue
    }
    break
  }

  if (splitIndex < 4) return { main: content, trace: null }

  const trace = lines.slice(0, splitIndex).join('\n').trim()
  const main = lines.slice(splitIndex).join('\n').trim()
  return {
    main: main || '',
    trace: trace || null,
  }
}

export const Message = memo(function Message({
  role,
  content,
  attachments,
  timestamp,
  pending,
  streaming,
  error,
  className,
}: MessageProps) {
  const reduceMotion = useReducedMotion()

  const isOperator = role === 'operator'
  const isSystem = role === 'system'

  const avatar = useMemo(() => {
    if (isOperator) return <User className="w-4 h-4 text-fg-1" />
    if (isSystem) return <Terminal className="w-4 h-4 text-fg-2" />
    return <Bot className="w-4 h-4 text-fg-1" />
  }, [isOperator, isSystem])

  const wrapperAlign = isSystem ? 'justify-center' : isOperator ? 'justify-end' : 'justify-start'
  const parsedContent = useMemo(() => {
    if (isOperator) return { main: content, trace: null as string | null }
    return splitTraceContent(content)
  }, [content, isOperator])

  const bubbleClasses = cn(
    'group relative w-fit max-w-full px-4 py-3 text-sm break-words',
    'rounded-[10px]',
    isOperator
      ? 'bg-bg-2 text-fg-0'
      : isSystem
        ? 'bg-bg-2 text-fg-0'
        : 'bg-bg-3 text-fg-0',
    pending && 'opacity-70',
    error && 'outline outline-1 outline-status-danger/50'
  )

  return (
    <motion.div
      layout
      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={cn('flex w-full', wrapperAlign, className)}
    >
      <div
        className={cn(
          'flex gap-3 max-w-[88%]',
          !isSystem && 'min-w-0',
          isOperator && 'justify-end',
          isSystem && 'max-w-[760px]',
          isOperator && 'flex-row-reverse'
        )}
      >
        {!isSystem && (
          <div
            className={cn(
              'mt-0.5 w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0',
              isOperator ? 'bg-bg-3' : 'bg-bg-2'
            )}
          >
            {avatar}
          </div>
        )}

        <div className={cn('min-w-0', isOperator && 'flex flex-col items-end')}>
          <div className={cn(bubbleClasses, !isSystem && 'pr-10')}>
            {/* Hover actions */}
            {!isSystem && content && (
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <CopyButton text={content} variant="ghost" />
              </div>
            )}

            {/* Content */}
            {streaming && !content ? (
              <TypingIndicator />
            ) : (
              <Markdown content={parsedContent.main || ''} />
            )}

            {attachments && attachments.length > 0 && (
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {attachments.map((attachment, idx) => (
                  <div
                    key={`${attachment.fileName}-${idx}`}
                    className="overflow-hidden rounded-[var(--radius-md)] border border-bd-0 bg-bg-0"
                    title={attachment.fileName}
                  >
                    <Image
                      src={attachment.content}
                      alt={attachment.fileName}
                      width={180}
                      height={120}
                      className="h-20 w-full object-cover"
                      unoptimized
                    />
                    <div className="truncate px-2 py-1 text-[10px] text-fg-2">
                      {attachment.fileName}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {parsedContent.trace && (
              <details className="mt-2 overflow-hidden rounded-[var(--radius-md)] border border-bd-0 bg-bg-0/40">
                <summary className="cursor-pointer list-none px-2.5 py-1.5 text-[11px] text-fg-2 hover:text-fg-1">
                  Trace output
                </summary>
                <pre className="max-h-52 overflow-auto border-t border-bd-0 px-2.5 py-2 text-[10px] leading-5 text-fg-2 whitespace-pre-wrap font-mono">
                  {parsedContent.trace}
                </pre>
              </details>
            )}

            {streaming && content && (
              <div className="mt-2 flex items-center gap-2 text-[10px] text-fg-2">
                <span className="w-1.5 h-1.5 bg-status-progress rounded-full animate-pulse" />
                <span>Streaming</span>
              </div>
            )}

            {error && (
              <div className="mt-2 text-xs text-status-danger">
                {error}
              </div>
            )}
          </div>

          <div className={cn('mt-1 text-[10px] text-fg-3', isOperator && 'text-right')}>
            {formatTime(timestamp)}
            {pending && <span className="ml-2 text-fg-3/70">sending…</span>}
          </div>
        </div>
      </div>
    </motion.div>
  )
})
