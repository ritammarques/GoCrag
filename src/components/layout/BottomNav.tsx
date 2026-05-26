'use client'

// components/layout/BottomNav.tsx

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MapPin, Compass, Heart, User } from 'lucide-react'

const TABS = [
  { href: '/map',       label: 'Mapa',      Icon: MapPin  },
  { href: '/explore',   label: 'Explorar',  Icon: Compass },
  { href: '/favorites', label: 'Favoritos', Icon: Heart   },
  { href: '/profile',   label: 'Perfil',    Icon: User    },
] as const

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-neutral-200 shadow-nav"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-around h-16">
        {TABS.map(({ href, label, Icon }) => {
          const active =
            pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-0.5 flex-1 py-2 min-w-0"
            >
              <Icon
                size={22}
                className={active ? 'text-brand-600' : 'text-neutral-400'}
                strokeWidth={active ? 2.5 : 1.8}
              />
              <span
                className={`text-[10px] font-medium leading-none ${
                  active ? 'text-brand-600' : 'text-neutral-400'
                }`}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
