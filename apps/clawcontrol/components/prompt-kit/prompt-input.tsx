'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
} from 'react'
import Image from 'next/image'
import { ImagePlus, Paperclip, Send, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface PromptInputAttachment {
  type: 'image'
  mimeType: string
  fileName: string
  content: string
  sizeBytes: number
}

export interface PromptSubmitPayload {
  text: string
  attachments?: PromptInputAttachment[]
}

export interface PromptInputProps {
  onSubmit: (payload: PromptSubmitPayload) => void | Promise<void>
  disabled?: boolean
  placeholder?: string
  maxLength?: number
  className?: string
  showCharCount?: boolean
  externalDropBatch?: { id: number; files: File[] } | null
}

const DEFAULT_MAX_LEN = 10_000
const MAX_HEIGHT_PX = 180
const MAX_ATTACHMENTS = 4
const MAX_ATTACHMENT_BYTES = 5_000_000

export function PromptInput({
  onSubmit,
  disabled = false,
  placeholder = 'Send a message…',
  maxLength = DEFAULT_MAX_LEN,
  className,
  showCharCount = true,
  externalDropBatch = null,
}: PromptInputProps) {
  const [value, setValue] = useState('')
  const [attachments, setAttachments] = useState<PromptInputAttachment[]>([])
  const [attachmentError, setAttachmentError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const dragDepthRef = useRef(0)

  const canSend = useMemo(() => {
    return !disabled && !isSubmitting && (value.trim().length > 0 || attachments.length > 0)
  }, [attachments.length, disabled, isSubmitting, value])

  const resize = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`
  }, [])

  useEffect(() => {
    resize()
  }, [value, resize])

  const submit = useCallback(async () => {
    if (!canSend) return

    const trimmed = value.trim()

    setIsSubmitting(true)
    try {
      await onSubmit({
        text: trimmed,
        attachments: attachments.length > 0 ? attachments : undefined,
      })
      setValue('')
      setAttachments([])
      setAttachmentError(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } finally {
      setIsSubmitting(false)
      requestAnimationFrame(resize)
    }
  }, [attachments, canSend, onSubmit, resize, value])

  const onKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends; Shift+Enter inserts newline. Cmd/Ctrl+Enter also sends.
    const isSubmitCombo = (e.key === 'Enter' && !e.shiftKey) || ((e.metaKey || e.ctrlKey) && e.key === 'Enter')
    if (!isSubmitCombo) return

    e.preventDefault()
    submit()
  }, [submit])

  const onPickFiles = useCallback(() => {
    if (disabled || isSubmitting) return
    fileInputRef.current?.click()
  }, [disabled, isSubmitting])

  const addFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return
    const slotsLeft = Math.max(0, MAX_ATTACHMENTS - attachments.length)
    const selected = files.slice(0, slotsLeft)
    const next: PromptInputAttachment[] = []
    let errorMessage: string | null = null

    for (const file of selected) {
      if (!file.type.startsWith('image/')) {
        errorMessage = 'Only image attachments are supported.'
        continue
      }
      if (file.size > MAX_ATTACHMENT_BYTES) {
        errorMessage = `${file.name} exceeds ${Math.round(MAX_ATTACHMENT_BYTES / 1_000_000)}MB.`
        continue
      }

      try {
        const dataUrl = await readFileAsDataUrl(file)
        next.push({
          type: 'image',
          mimeType: file.type || 'image/png',
          fileName: file.name,
          content: dataUrl,
          sizeBytes: file.size,
        })
      } catch {
        errorMessage = `Could not read ${file.name}.`
      }
    }

    if (files.length > slotsLeft) {
      errorMessage = `You can attach up to ${MAX_ATTACHMENTS} images per message.`
    }

    if (next.length > 0) {
      setAttachments((prev) => [...prev, ...next].slice(0, MAX_ATTACHMENTS))
      setAttachmentError(null)
    } else if (errorMessage) {
      setAttachmentError(errorMessage)
    }
  }, [attachments.length])

  const onFilesChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    await addFiles(files)

    if (event.target) {
      event.target.value = ''
    }
  }, [addFiles])

  useEffect(() => {
    if (!externalDropBatch || externalDropBatch.files.length === 0) return
    void addFiles(externalDropBatch.files)
  }, [addFiles, externalDropBatch])

  const hasFileDrag = (event: DragEvent): boolean => {
    const types = event.dataTransfer?.types
    if (!types) return false
    return Array.from(types).includes('Files')
  }

  const handleDragEnter = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (!hasFileDrag(event)) return
    event.preventDefault()
    dragDepthRef.current += 1
    setIsDragOver(true)
  }, [])

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (!hasFileDrag(event)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (!hasFileDrag(event)) return
    event.preventDefault()
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
    if (dragDepthRef.current === 0) {
      setIsDragOver(false)
    }
  }, [])

  const handleDrop = useCallback(async (event: DragEvent<HTMLDivElement>) => {
    if (!hasFileDrag(event)) return
    event.preventDefault()
    event.stopPropagation()
    dragDepthRef.current = 0
    setIsDragOver(false)
    const files = Array.from(event.dataTransfer.files ?? [])
    await addFiles(files)
  }, [addFiles])

  const removeAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }, [])

  return (
    <div
      className={cn(
        'border-t border-bd-0 bg-bg-1 px-4 pt-3 pb-2',
        isDragOver && 'bg-bg-2/70',
        className
      )}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((attachment, idx) => (
            <div
              key={`${attachment.fileName}-${idx}`}
              className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-bd-0 bg-bg-0 px-2 py-1.5"
            >
              <Image
                src={attachment.content}
                alt={attachment.fileName}
                width={26}
                height={26}
                className="rounded-[var(--radius-sm)] object-cover border border-bd-0"
                unoptimized
              />
              <span className="max-w-[180px] truncate text-xs text-fg-1">
                {attachment.fileName}
              </span>
              <button
                type="button"
                onClick={() => removeAttachment(idx)}
                className="p-1 rounded-[var(--radius-sm)] text-fg-3 hover:text-fg-1 hover:bg-bg-2 transition-colors"
                title="Remove attachment"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        className={cn(
          'flex items-center gap-2 rounded-[var(--radius-lg)] border px-3 py-2.5',
          isDragOver && 'border-status-info/50',
          disabled
            ? 'border-bd-0 bg-bg-2 opacity-80'
            : 'border-bd-0 bg-bg-0 shadow-sm shadow-black/10'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={onFilesChange}
          disabled={disabled || isSubmitting || attachments.length >= MAX_ATTACHMENTS}
        />

        <button
          type="button"
          onClick={onPickFiles}
          disabled={disabled || isSubmitting || attachments.length >= MAX_ATTACHMENTS}
          className={cn(
            'p-2 rounded-[var(--radius-md)] transition-colors flex-shrink-0',
            disabled || isSubmitting || attachments.length >= MAX_ATTACHMENTS
              ? 'text-fg-3 cursor-not-allowed'
              : 'text-fg-2 hover:text-fg-0 hover:bg-bg-2'
          )}
          title="Attach image"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          disabled={disabled || isSubmitting}
          rows={1}
          maxLength={maxLength}
          className={cn(
            'flex-1 resize-none bg-transparent text-sm text-fg-0 placeholder:text-fg-3',
            'focus:outline-none min-h-[38px] max-h-[180px] py-1 leading-6',
            'font-mono'
          )}
        />

        {/* Clear */}
        {value.length > 0 && !disabled && (
          <button
            type="button"
            onClick={() => setValue('')}
            className="p-2 rounded-[var(--radius-md)] text-fg-2 hover:text-fg-0 hover:bg-bg-2 transition-colors"
            title="Clear"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Send */}
        <button
          type="button"
          disabled={!canSend}
          onClick={submit}
          className={cn(
            'p-2 rounded-[var(--radius-md)] transition-colors flex-shrink-0',
            canSend
              ? 'text-status-info hover:bg-status-info/10'
              : 'text-fg-3 cursor-not-allowed'
          )}
          title={disabled ? 'Disabled' : 'Send'}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-1.5 flex items-center justify-between text-[10px] text-fg-3">
        <span className="inline-flex items-center gap-1.5">
          <ImagePlus className="w-3 h-3" />
          Enter to send • Shift+Enter newline • Drag images to attach
        </span>
        {showCharCount && (
          <span className="font-mono text-fg-3/70">
            {value.length}/{maxLength}
          </span>
        )}
      </div>

      {attachmentError && (
        <div className="mt-1 text-[10px] text-status-warning">
          {attachmentError}
        </div>
      )}
    </div>
  )
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('Could not read file'))
      }
    }
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file'))
    reader.readAsDataURL(file)
  })
}
