'use client'

import { AppShell } from '@/components/shell/app-shell'
import { SearchModal, useSearchModal } from '@/components/shell/search-modal'
import { ProtectedActionProvider } from '@/components/protected-action-modal'
import { SyncBanner } from '@/components/sync-banner'
import { usePathname } from 'next/navigation'

/**
 * Dashboard Layout
 *
 * Wraps all main application routes with the AppShell.
 * Includes global search modal with Cmd/Ctrl+K shortcut.
 * Provides protected action modal for Governor-enforced confirmations.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const search = useSearchModal()
  const pathname = usePathname()
  const isConsoleRoute = pathname === '/console' || pathname.startsWith('/console/')

  return (
    <ProtectedActionProvider>
      <AppShell
        onSearchClick={search.onOpen}
        contentPadding={isConsoleRoute ? 'none' : 'default'}
      >
        {isConsoleRoute ? (
          <div className="relative h-full">
            <div className="pointer-events-none absolute inset-x-3 top-3 z-20">
              <SyncBanner withMargin={false} className="pointer-events-auto" />
            </div>
            {children}
          </div>
        ) : (
          <>
            <SyncBanner />
            {children}
          </>
        )}
      </AppShell>
      <SearchModal open={search.open} onClose={search.onClose} />
    </ProtectedActionProvider>
  )
}
