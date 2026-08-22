#!/usr/bin/env node
// Run this ONCE, offline. It creates the keypair the whole licensing
// system depends on:
//   - the PRIVATE key goes to private/license-private-key.json — never
//     commit it, never share it. Back it up somewhere safe (a password
//     manager, an encrypted drive). Losing it means you can no longer
//     issue new license keys; leaking it means anyone could.
//   - the PUBLIC key gets printed so you can paste it into
//     src/lib/license.ts's PUBLIC_KEY_JWK constant. That one is meant to
//     ship inside the app — it can only verify signatures, not create
//     them.
//
// Re-running this OVERWRITES the existing private key file and prints a
// new public key — every license key issued under the old keypair would
// stop verifying unless you keep the old public key around too. Only do
// this if you actually mean to rotate keys.

import { webcrypto } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(dir, '..', 'private')
const outPath = path.join(outDir, 'license-private-key.json')

const keyPair = await webcrypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
const publicKey = await webcrypto.subtle.exportKey('jwk', keyPair.publicKey)
const privateKey = await webcrypto.subtle.exportKey('jwk', keyPair.privateKey)

fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(outPath, JSON.stringify({ publicKey, privateKey }, null, 2))

console.log(`\nPrivate key saved to ${outPath} — back it up now, then keep it out of git (already gitignored).\n`)
console.log('Paste this into src/lib/license.ts as PUBLIC_KEY_JWK:\n')
console.log(JSON.stringify(publicKey, null, 2))
console.log()
