import {
  BarChart3,
  CalendarHeart,
  Home,
  MessageCircleHeart,
  MoreHorizontal,
  Palette,
  Settings,
  Shirt,
  Sparkles,
  Star,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { BRAND } from '@/config/brand'
import { cn } from '@/lib/utils'
import { useApp } from '@/state/AppProvider'
import { Logo, Sparkle } from '../decor/Decor'
import { Dialog } from '../ui/Dialog'

interface NavItem {
  to: string
  label: string
  icon: typeof Home
  end?: boolean
}

export const PRIMARY_NAV: NavItem[] = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/wardrobe', label: 'My Wardrobe', icon: Shirt },
  { to: '/studio', label: 'Outfit Studio', icon: Sparkles },
  { to: '/stylist', label: 'AI Stylist', icon: MessageCircleHeart },
  { to: '/discover', label: 'Style Discovery', icon: Palette },
  { to: '/calendar', label: 'Outfit Calendar', icon: CalendarHeart },
  { to: '/settings', label: 'Profile & Settings', icon: Settings },
]

const SECONDARY_NAV: NavItem[] = [
  { to: '/outfits', label: 'Saved outfits', icon: Star },
  { to: '/insights', label: 'Wardrobe insights', icon: BarChart3 },
]

const MOBILE_TABS: NavItem[] = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/wardrobe', label: 'Wardrobe', icon: Shirt },
  { to: '/studio', label: 'Studio', icon: Sparkles },
  { to: '/stylist', label: 'Stylist', icon: MessageCircleHeart },
]

function SideLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-[15px] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender',
          isActive ? 'bg-white text-plum shadow-soft' : 'text-ink/75 hover:bg-white/60 hover:text-ink',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={cn('h-[18px] w-[18px]', isActive ? 'text-lavender-600' : 'text-muted group-hover:text-lavender-600')} aria-hidden />
          <span className="flex-1">{item.label}</span>
          {isActive && <Sparkle className="h-3 w-3 text-lavender" />}
        </>
      )}
    </NavLink>
  )
}

function ModeBadge() {
  const { mode } = useApp()
  return (
    <div className="rounded-2xl border border-line bg-white/70 p-3 text-xs leading-relaxed text-muted">
      <p className="font-semibold text-ink">{mode === 'local' ? 'Demo mode' : 'Synced account'}</p>
      {mode === 'local' ? 'Your wardrobe is saved privately in this browser only.' : 'Your wardrobe is stored in your private account.'}
    </div>
  )
}

export function AppShell({ children }: { children?: ReactNode }) {
  const [moreOpen, setMoreOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  const moreActive = !MOBILE_TABS.some((t) => (t.end ? location.pathname === t.to : location.pathname.startsWith(t.to)))

  return (
    <div className="min-h-dvh bg-cream">
      <a href="#main" className="sr-only z-50 rounded-full bg-plum px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-gradient-to-b from-lilac/70 via-lavender-50 to-blush/40 px-4 py-6 lg:flex">
        <NavLink to="/" className="mb-8 rounded-2xl px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender" aria-label={`${BRAND.name} home`}>
          <Logo />
        </NavLink>
        <nav aria-label="Main" className="flex flex-1 flex-col gap-1">
          {PRIMARY_NAV.map((item) => (
            <SideLink key={item.to} item={item} />
          ))}
          <p className="mb-1 mt-6 px-3.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Collections</p>
          {SECONDARY_NAV.map((item) => (
            <SideLink key={item.to} item={item} />
          ))}
        </nav>
        <ModeBadge />
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line/70 bg-cream/85 px-4 py-3 backdrop-blur lg:hidden">
        <NavLink to="/" aria-label={`${BRAND.name} home`}>
          <Logo className="[&_span.font-serif]:text-xl" />
        </NavLink>
        <NavLink
          to="/settings"
          aria-label="Profile and settings"
          className={({ isActive }) => cn('rounded-full p-2 text-muted hover:bg-lilac', isActive && 'bg-lilac text-plum')}
        >
          <Settings className="h-5 w-5" />
        </NavLink>
      </header>

      <main id="main" className="px-4 pb-28 pt-5 sm:px-6 lg:ml-64 lg:px-10 lg:pb-12 lg:pt-10">
        <div className="mx-auto max-w-6xl">{children ?? <Outlet />}</div>
      </main>

      {/* Mobile bottom tabs */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {MOBILE_TABS.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn('flex min-h-[60px] flex-col items-center justify-center gap-1 text-[11px] font-medium', isActive ? 'text-plum' : 'text-muted')
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span className={cn('rounded-full px-3.5 py-1 transition-colors', isActive && 'bg-lilac')}>
                        <Icon className="h-5 w-5" aria-hidden />
                      </span>
                      {item.label}
                    </>
                  )}
                </NavLink>
              </li>
            )
          })}
          <li>
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className={cn('flex min-h-[60px] w-full flex-col items-center justify-center gap-1 text-[11px] font-medium', moreActive ? 'text-plum' : 'text-muted')}
              aria-haspopup="dialog"
            >
              <span className={cn('rounded-full px-3.5 py-1', moreActive && 'bg-lilac')}>
                <MoreHorizontal className="h-5 w-5" aria-hidden />
              </span>
              More
            </button>
          </li>
        </ul>
      </nav>

      <Dialog open={moreOpen} onClose={() => setMoreOpen(false)} title="More from Lavender" size="sm">
        <nav aria-label="More" className="grid grid-cols-2 gap-2 pb-2">
          {[...PRIMARY_NAV.slice(4), ...SECONDARY_NAV].map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMoreOpen(false)}
                className={({ isActive }) =>
                  cn('flex flex-col gap-2 rounded-3xl border border-line p-4 text-sm font-medium', isActive ? 'border-lavender bg-lilac text-plum' : 'bg-white text-ink')
                }
              >
                <Icon className="h-5 w-5 text-lavender-600" aria-hidden />
                {item.label}
              </NavLink>
            )
          })}
        </nav>
        <ModeBadge />
      </Dialog>
    </div>
  )
}
