// Offline licensing for the desktop build: no server, ever. A license key
// is a payload (buyer email + issue date) signed with an ECDSA P-256
// private key kept only by the seller (see scripts/generate-license.mjs);
// this file only holds the matching PUBLIC key, which is safe to ship —
// it can verify signatures but can't create new ones.
const PUBLIC_KEY_JWK: JsonWebKey = {
  key_ops: ['verify'],
  ext: true,
  kty: 'EC',
  x: 'FI4qe24Sp3tOKkLiT87OUgL2VSlVnFrs4pHeNk1nHYE',
  y: '1AD2GOdWDTuwrwXvnPlrCgKPYwbHJWi_mBSexBK2pR8',
  crv: 'P-256',
}

export interface LicensePayload {
  email: string
  issuedAt: string
  orderId?: string
}

function base64UrlToBytes(b64url: string): Uint8Array<ArrayBuffer> {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(b64url.length / 4) * 4, '=')
  const bin = atob(b64)
  const bytes = new Uint8Array(new ArrayBuffer(bin.length))
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

let cachedPublicKey: Promise<CryptoKey> | null = null
function getPublicKey(): Promise<CryptoKey> {
  cachedPublicKey ??= crypto.subtle.importKey('jwk', PUBLIC_KEY_JWK, { name: 'ECDSA', namedCurve: 'P-256' }, false, [
    'verify',
  ])
  return cachedPublicKey
}

// Returns the verified payload, or null if the key is malformed or the
// signature doesn't check out (tampered, or just not one we ever issued).
export async function verifyLicenseKey(licenseKey: string): Promise<LicensePayload | null> {
  const parts = licenseKey.trim().split('.')
  if (parts.length !== 2) return null
  const [payloadB64, signatureB64] = parts
  try {
    const payloadBytes = base64UrlToBytes(payloadB64)
    const payload = JSON.parse(new TextDecoder().decode(payloadBytes)) as LicensePayload
    if (!payload.email || !payload.issuedAt) return null
    const signature = base64UrlToBytes(signatureB64)
    const key = await getPublicKey()
    const valid = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, signature, payloadBytes)
    return valid ? payload : null
  } catch {
    return null
  }
}

const STORAGE_KEY = 'draft:license'

// Plain localStorage rather than the Tauri store plugin: this only ever
// needs to gate the UI before the rest of the app (and its own local data
// store) has even decided how to initialize, so it stays independent of
// that async setup.
export function getStoredLicense(): LicensePayload | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as LicensePayload) : null
  } catch {
    return null
  }
}

export function storeLicense(payload: LicensePayload) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

export function clearLicense() {
  localStorage.removeItem(STORAGE_KEY)
}
