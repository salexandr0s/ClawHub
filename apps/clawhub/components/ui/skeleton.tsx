'use client'

import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse bg-bg-3 rounded-[var(--radius-md)]',
        className
      )}
    />
  )
}

export function SkeletonText({ className }: SkeletonProps) {
  return <Skeleton className={cn('h-4 w-full', className)} />
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 p-3 border-b border-bd-0">
      <Skeleton className="w-8 h-8 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-6 w-16 shrink-0" />
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="p-4 border border-bd-0 rounded-[var(--radius-md)] bg-bg-2 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  )
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="border border-bd-0 rounded-[var(--radius-md)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-3 bg-bg-1 border-b border-bd-1">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-16 ml-auto" />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  )
}

export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 border border-bd-0 rounded-[var(--radius-md)] bg-bg-2">
          <Skeleton className="h-3 w-16 mb-2" />
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  )
}
