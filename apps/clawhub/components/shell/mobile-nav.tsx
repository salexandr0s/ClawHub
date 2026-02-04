'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Menu, X, Settings } from 'lucide-react'
import { navItems } from './rail-nav'
import type { Route } from 'next'

export function MobileNav() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Hamburger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 -ml-2 text-fg-1 hover:text-fg-0 hover:bg-bg-3 rounded-[var(--radius-md)] transition-colors md:hidden"
        aria-label="Open navigation"
      >
        <Menu className="w-icon-lg h-icon-lg" />
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Slide-over Nav */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-bg-1 border-r border-bd-0 transform transition-transform duration-250 ease-out md:hidden',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-[var(--topbar-height)] px-4 border-b border-bd-0">
          <span className="text-lg font-bold text-fg-0 tracking-tight">
            claw<span className="text-status-info">hub</span>
          </span>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 text-fg-2 hover:text-fg-0 hover:bg-bg-3 rounded-[var(--radius-md)] transition-colors"
            aria-label="Close navigation"
          >
            <X className="w-icon-md h-icon-md" />
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 py-2 overflow-y-auto">
          <div className="px-2 space-y-0.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] transition-colors relative',
                    isActive
                      ? 'bg-bg-3 text-fg-0'
                      : 'text-fg-1 hover:text-fg-0 hover:bg-bg-2'
                  )}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-status-info rounded-r" />
                  )}
                  <Icon className="w-icon-md h-icon-md shrink-0" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </nav>

        {/* Settings */}
        <div className="py-2 px-2 border-t border-bd-0">
          <Link
            href={'/settings' as Route}
            onClick={() => setIsOpen(false)}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] transition-colors',
              pathname === '/settings'
                ? 'bg-bg-3 text-fg-0'
                : 'text-fg-1 hover:text-fg-0 hover:bg-bg-2'
            )}
          >
            <Settings className="w-icon-md h-icon-md shrink-0" />
            <span className="text-sm font-medium">Settings</span>
          </Link>
        </div>
      </div>
    </>
  )
}
