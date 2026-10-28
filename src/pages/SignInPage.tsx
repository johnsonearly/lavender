import { useState, type FormEvent } from 'react'
import { Logo, SparkleField } from '@/components/decor/Decor'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Form'
import { Segmented } from '@/components/ui/Layout'
import { BRAND } from '@/config/brand'
import { getSupabase } from '@/data/supabaseClient'

/** Only shown when Supabase is configured. Demo mode needs no account. */
export default function SignInPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Enter a valid email address.')
    if (password.length < 8) return setError('Use at least 8 characters for your password.')
    setBusy(true)
    try {
      const client = await getSupabase()
      if (mode === 'signin') {
        const { error: err } = await client.auth.signInWithPassword({ email, password })
        if (err) throw err
      } else {
        const { data, error: err } = await client.auth.signUp({ email, password })
        if (err) throw err
        if (!data.session) setInfo('Check your inbox to confirm your email, then sign in.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative grid min-h-dvh place-items-center bg-gradient-to-br from-lilac/70 via-cream to-blush/60 px-4">
      <SparkleField />
      <main className="relative w-full max-w-sm rounded-4xl border border-line bg-white/95 p-6 shadow-lift">
        <Logo />
        <h1 className="mt-5 font-serif text-2xl font-semibold">{mode === 'signin' ? 'Welcome back' : 'Create your closet'}</h1>
        <p className="mt-1 text-sm text-muted">{BRAND.tagline}</p>
        <Segmented
          label="Account action"
          className="mt-5"
          value={mode}
          onChange={setMode}
          options={[{ id: 'signin', label: 'Sign in' }, { id: 'signup', label: 'Sign up' }]}
        />
        <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
          <Field label="Email">{(p) => <Input {...p} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />}</Field>
          <Field label="Password">
            {(p) => <Input {...p} type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} />}
          </Field>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          {info && <p role="status" className="text-sm text-plum">{info}</p>}
          <Button type="submit" className="w-full" loading={busy}>
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </Button>
        </form>
      </main>
    </div>
  )
}
