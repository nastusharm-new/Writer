import { useState } from 'react'
import type { FormEvent } from 'react'
import { isSupabaseConfigured } from '../lib/supabase'

interface Props {
  signInWithEmail: (email: string) => Promise<{ requiresConfirmation: boolean }>
}

export function AuthScreen({ signInWithEmail }: Props) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('sending')
    try {
      const { requiresConfirmation } = await signInWithEmail(email.trim())
      setStatus(requiresConfirmation ? 'sent' : 'idle')
    } catch (err) {
      console.error(err)
      setStatus('error')
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1>Draft</h1>
        <p className="auth-subtitle">Место, где копятся фрагменты — до того, как они станут книгой.</p>
        <form onSubmit={submit}>
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />
          <button type="submit" disabled={status === 'sending'}>
            {isSupabaseConfigured ? 'Прислать ссылку для входа' : 'Войти'}
          </button>
        </form>
        {status === 'sent' && (
          <p className="auth-hint">Проверь почту — мы прислали ссылку для входа.</p>
        )}
        {status === 'error' && <p className="auth-hint auth-hint--error">Не получилось войти. Попробуй ещё раз.</p>}
        {!isSupabaseConfigured && (
          <p className="auth-hint auth-hint--muted">
            Supabase не настроен — данные хранятся локально, в этом браузере.
          </p>
        )}
      </div>
    </div>
  )
}
