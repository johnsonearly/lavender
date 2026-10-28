import type { Session } from '@supabase/supabase-js'
import { Loader2 } from 'lucide-react'
import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Logo } from './components/decor/Decor'
import { AppShell } from './components/layout/AppShell'
import { Button } from './components/ui/Button'
import { getLocalUserId, LocalStore } from './data/localStore'
import { getSupabase, isSupabaseConfigured } from './data/supabaseClient'
import { SupabaseStore } from './data/supabaseStore'
import { AppProvider, useApp } from './state/AppProvider'
import { ItemDialogProvider } from './state/itemDialog'
import { ToastProvider } from './state/toast'

const HomePage = lazy(() => import('./pages/HomePage'))
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'))
const WardrobePage = lazy(() => import('./pages/WardrobePage'))
const ItemEditorPage = lazy(() => import('./pages/ItemEditorPage'))
const StudioPage = lazy(() => import('./pages/StudioPage'))
const OutfitsPage = lazy(() => import('./pages/OutfitsPage'))
const StylistPage = lazy(() => import('./pages/StylistPage'))
const DiscoverPage = lazy(() => import('./pages/DiscoverPage'))
const QuizPage = lazy(() => import('./pages/QuizPage'))
const CalendarPage = lazy(() => import('./pages/CalendarPage'))
const InsightsPage = lazy(() => import('./pages/InsightsPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
const SignInPage = lazy(() => import('./pages/SignInPage'))

function Splash({ message = 'Opening your closet…' }: { message?: string }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-cream" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-4">
        <Logo />
        <p className="flex items-center gap-2 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {message}
        </p>
      </div>
    </div>
  )
}

function PageFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-muted" role="status">
      <Loader2 className="h-5 w-5 animate-spin" aria-label="Loading page" />
    </div>
  )
}

function AppRoutes() {
  const { status, loadError, reload, profile } = useApp()
  const location = useLocation()

  if (status === 'loading') return <Splash />
  if (status === 'error') {
    return (
      <div className="grid min-h-dvh place-items-center bg-cream px-6">
        <div className="max-w-md text-center" role="alert">
          <Logo className="mb-6" />
          <h1 className="font-serif text-2xl font-semibold">We couldn’t open your wardrobe</h1>
          <p className="mt-2 text-sm text-muted">{loadError}</p>
          <Button className="mt-6" onClick={reload}>
            Try again
          </Button>
        </div>
      </div>
    )
  }

  const needsOnboarding = !profile?.onboardingCompleted
  if (needsOnboarding && location.pathname !== '/welcome') return <Navigate to="/welcome" replace />

  return (
    <ItemDialogProvider>
      <Suspense fallback={<Splash message="Loading…" />}>
        <Routes>
          <Route path="/welcome" element={<OnboardingPage />} />
          <Route element={<AppShell />}>
            <Route index element={<Lazy><HomePage /></Lazy>} />
            <Route path="wardrobe" element={<Lazy><WardrobePage /></Lazy>} />
            <Route path="wardrobe/new" element={<Lazy><ItemEditorPage /></Lazy>} />
            <Route path="wardrobe/:id/edit" element={<Lazy><ItemEditorPage /></Lazy>} />
            <Route path="studio" element={<Lazy><StudioPage /></Lazy>} />
            <Route path="outfits" element={<Lazy><OutfitsPage /></Lazy>} />
            <Route path="stylist" element={<Lazy><StylistPage /></Lazy>} />
            <Route path="discover" element={<Lazy><DiscoverPage /></Lazy>} />
            <Route path="discover/quiz" element={<Lazy><QuizPage /></Lazy>} />
            <Route path="calendar" element={<Lazy><CalendarPage /></Lazy>} />
            <Route path="insights" element={<Lazy><InsightsPage /></Lazy>} />
            <Route path="settings" element={<Lazy><SettingsPage /></Lazy>} />
            <Route path="*" element={<Lazy><NotFoundPage /></Lazy>} />
          </Route>
        </Routes>
      </Suspense>
    </ItemDialogProvider>
  )
}

function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageFallback />}>{children}</Suspense>
}

function LocalGate() {
  const store = useMemo(() => new LocalStore(getLocalUserId()), [])
  return (
    <AppProvider store={store}>
      <AppRoutes />
    </AppProvider>
  )
}

function SupabaseGate() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [store, setStore] = useState<SupabaseStore | null>(null)

  useEffect(() => {
    let unsubscribe: (() => void) | undefined
    getSupabase().then((client) => {
      client.auth.getSession().then(({ data }) => setSession(data.session))
      const { data } = client.auth.onAuthStateChange((_event, next) => setSession(next))
      unsubscribe = () => data.subscription.unsubscribe()
    })
    return () => unsubscribe?.()
  }, [])

  const userId = session?.user.id
  useEffect(() => {
    if (!userId) {
      setStore(null)
      return
    }
    getSupabase().then((client) => setStore(new SupabaseStore(client, userId)))
  }, [userId])

  if (session === undefined) return <Splash message="Checking your account…" />
  if (!session) {
    return (
      <Suspense fallback={<Splash />}>
        <SignInPage />
      </Suspense>
    )
  }
  if (!store) return <Splash />
  return (
    <AppProvider key={store.userId} store={store}>
      <AppRoutes />
    </AppProvider>
  )
}

export function App() {
  return (
    <ToastProvider>
      <BrowserRouter>{isSupabaseConfigured ? <SupabaseGate /> : <LocalGate />}</BrowserRouter>
    </ToastProvider>
  )
}
