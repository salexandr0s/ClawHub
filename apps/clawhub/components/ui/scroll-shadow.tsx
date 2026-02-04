'use client'

import { useRef, useState, useEffect, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ScrollShadowProps {
  children: ReactNode
  className?: string
}

export function ScrollShadow({ children, className }: ScrollShadowProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [showTop, setShowTop] = useState(false)
  const [showBottom, setShowBottom] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const handleScroll = () => {
      setShowTop(el.scrollTop > 0)
      setShowBottom(el.scrollTop < el.scrollHeight - el.clientHeight - 1)
    }

    handleScroll()
    el.addEventListener('scroll', handleScroll)

    // Also check on resize
    const resizeObserver = new ResizeObserver(handleScroll)
    resizeObserver.observe(el)

    return () => {
      el.removeEventListener('scroll', handleScroll)
      resizeObserver.disconnect()
    }
  }, [])

  return (
    <div className="relative">
      {/* Top shadow */}
      <div
        className={cn(
          'absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-bg-1 to-transparent pointer-events-none z-10 transition-opacity duration-150',
          showTop ? 'opacity-100' : 'opacity-0'
        )}
      />

      {/* Scrollable content */}
      <div ref={ref} className={cn('overflow-auto', className)}>
        {children}
      </div>

      {/* Bottom shadow */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-bg-1 to-transparent pointer-events-none z-10 transition-opacity duration-150',
          showBottom ? 'opacity-100' : 'opacity-0'
        )}
      />
    </div>
  )
}
