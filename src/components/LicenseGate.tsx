import { useState } from 'react'
import type { FormEvent } from 'react'
import { isExpired, storeLicense, verifyLicenseKey } from '../lib/license'

interface Props {
  onActivated: () => void
}

// Shown once, before anything else, on a desktop build with no valid
// license stored yet. Purely offline — the key is verified locally
// against an embedded public key (see lib/license.ts), nothing is sent
// anywhere.
export function LicenseGate({ onActivated }: Props) {
  const [key, setKey] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!key.trim()) return
    setChecking(true)
    setError(null)
    const payload = await verifyLicenseKey(key)
    setChecking(false)
    if (!payload) {
      setError('Ключ не подошёл — проверьте, что скопирован целиком, без пробелов и переносов.')
      return
    }
    if (isExpired(payload)) {
      setError('Пробный период по этому ключу уже закончился — нужен новый ключ.')
      return
    }
    storeLicense(payload)
    onActivated()
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1>Draft</h1>
        <p className="auth-subtitle">Введите лицензионный ключ, чтобы активировать приложение.</p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Лицензионный ключ"
            autoFocus
            spellCheck={false}
          />
          <button type="submit" disabled={checking}>
            {checking ? '…' : 'Активировать'}
          </button>
        </form>
        {error && <p className="auth-hint auth-hint--error">{error}</p>}
        <p className="auth-hint auth-hint--muted">
          Куплено на один компьютер и одного пользователя. Активация происходит полностью локально — интернет не
          нужен.
        </p>
      </div>
    </div>
  )
}
