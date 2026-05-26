'use client'

// components/layout/AppShell.tsx

import { BottomNav } from './BottomNav'

interface AppShellProps {
  children: React.ReactNode
  /** fullscreen=true: sem padding bottom (para o mapa) */
  fullscreen?: boolean
}

export function AppShell({ children, fullscreen = false }: AppShellProps) {
  return (
    <div className="flex flex-col h-full">
      <main className={`flex-1 overflow-hidden ${!fullscreen ? 'pb-16' : ''}`}>
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
