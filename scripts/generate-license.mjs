#!/usr/bin/env node
// Run this yourself, offline, whenever someone buys the app — it never
// talks to a network. Needs the PRIVATE half of the keypair (see
// scripts/generate-keypair.mjs), which must never be committed to the
// repo or shipped in the app — only you should ever hold it.
//
// Usage:
//   node scripts/generate-license.mjs --email buyer@example.com [--order 12345] [--key private/license-private-key.json]
//   node scripts/generate-license.mjs --email test@example.com --trial-days 7   # expires in a week

import { webcrypto } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2)
function getArg(name) {
  const i = args.indexOf(`--${name}`)
  return i === -1 ? undefined : args[i + 1]
}

const email = getArg('email')
const orderId = getArg('order')
const trialDaysArg = getArg('trial-days')
const keyPath =
  getArg('key') ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'private', 'license-private-key.json')

if (!email) {
  console.error('Usage: node scripts/generate-license.mjs --email buyer@example.com [--order 12345] [--trial-days 7] [--key path]')
  process.exit(1)
}

let expiresAt
if (trialDaysArg !== undefined) {
  const trialDays = Number(trialDaysArg)
  if (!Number.isFinite(trialDays) || trialDays <= 0) {
    console.error(`--trial-days must be a positive number, got "${trialDaysArg}".`)
    process.exit(1)
  }
  expiresAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString()
}

if (!fs.existsSync(keyPath)) {
  console.error(`Private key not found at ${keyPath}.`)
  console.error('Generate one first with: node scripts/generate-keypair.mjs')
  process.exit(1)
}

const { privateKey: privateJwk } = JSON.parse(fs.readFileSync(keyPath, 'utf8'))
const privateKey = await webcrypto.subtle.importKey(
  'jwk',
  privateJwk,
  { name: 'ECDSA', namedCurve: 'P-256' },
  false,
  ['sign'],
)

const payload = {
  email,
  issuedAt: new Date().toISOString(),
  ...(orderId ? { orderId } : {}),
  ...(expiresAt ? { expiresAt } : {}),
}
const payloadBytes = new TextEncoder().encode(JSON.stringify(payload))
const signatureBuffer = await webcrypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privateKey, payloadBytes)

function toBase64Url(bytes) {
  return Buffer.from(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const licenseKey = `${toBase64Url(payloadBytes)}.${toBase64Url(new Uint8Array(signatureBuffer))}`

const trialNote = expiresAt ? ` — пробный, до ${new Date(expiresAt).toLocaleDateString('ru-RU')}` : ''
console.log(`\nЛицензионный ключ для ${email}${orderId ? ` (заказ ${orderId})` : ''}${trialNote}:\n`)
console.log(licenseKey)
console.log()
