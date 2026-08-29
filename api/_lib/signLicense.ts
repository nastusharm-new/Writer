// Server-side counterpart to scripts/generate-license.mjs: same signing
// logic, but reads the private key from an environment variable instead
// of a local file, so the payment webhook can issue a license key the
// instant a sale comes in — no one has to run the CLI script by hand.
//
// The private key never touches the git repo either way: here it lives
// only in Vercel's environment-variable store (Project Settings ->
// Environment Variables -> LICENSE_PRIVATE_KEY_JWK), which is why this
// file needs to run in a Vercel Function rather than in the shipped app.
import { webcrypto } from 'node:crypto'

export interface LicensePayload {
  email: string
  issuedAt: string
  orderId?: string
  expiresAt?: string
}

function toBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

let cachedPrivateKey: Promise<webcrypto.CryptoKey> | null = null
function getPrivateKey(): Promise<webcrypto.CryptoKey> {
  cachedPrivateKey ??= (async () => {
    const raw = process.env.LICENSE_PRIVATE_KEY_JWK
    if (!raw) throw new Error('LICENSE_PRIVATE_KEY_JWK is not set')
    const jwk = JSON.parse(raw) as JsonWebKey
    return webcrypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
  })()
  return cachedPrivateKey
}

// Signs a fresh license key for a completed order. `orderId` is the
// provider's payment id, so a support request can be traced back to the
// exact ЮKassa payment that produced it.
export async function signLicense(email: string, orderId: string): Promise<string> {
  const payload: LicensePayload = { email, issuedAt: new Date().toISOString(), orderId }
  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload))
  const key = await getPrivateKey()
  const signature = await webcrypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, payloadBytes)
  return `${toBase64Url(payloadBytes)}.${toBase64Url(new Uint8Array(signature))}`
}
