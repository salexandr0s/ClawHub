'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
}

interface ToastContextValue {
  toasts: Toast[]
  addToast: (type: ToastType, message: string) => void
  removeToast: (id: string) => void
  success: (message: string) => void
  error: (message: string) => void
  warning: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, type, message }])

    // Auto-dismiss after 4s
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // Convenience methods
  const success = useCallback((message: string) => addToast('success', message), [addToast])
  const error = useCallback((message: string) => addToast('error', message), [addToast])
  const warning = useCallback((message: string) => addToast('warning', message), [addToast])
  const info = useCallback((message: string) => addToast('info', message), [addToast])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[100] space-y-2 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={() => onRemove(toast.id)} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
  }
  const Icon = icons[toast.type]

  const colors = {
    success: 'bg-status-success/10 border-status-success/30 text-status-success',
    error: 'bg-status-danger/10 border-status-danger/30 text-status-danger',
    warning: 'bg-status-warning/10 border-status-warning/30 text-status-warning',
    info: 'bg-status-info/10 border-status-info/30 text-status-info',
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-4 py-3 rounded-[var(--radius-md)] border shadow-lg pointer-events-auto',
        'animate-in slide-in-from-right fade-in duration-200',
        'bg-bg-1',
        colors[toast.type]
      )}
    >
      <Icon className="w-icon-md h-icon-md shrink-0" />
      <span className="text-sm flex-1">{toast.message}</span>
      <button
        onClick={onRemove}
        className="p-1 hover:bg-white/10 rounded-[var(--radius-sm)] transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-icon-xs h-icon-xs" />
      </button>
    </div>
  )
}
