import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createPayment } from './_lib/yookassa'
import { getPrice, PRODUCT_DESCRIPTION } from './_lib/pricing'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function baseUrl(req: VercelRequest): string {
  const proto = (req.headers['x-forwarded-proto'] as string | undefined) ?? 'https'
  return `${proto}://${req.headers.host}`
}

// POST /api/create-payment { email } — starts a ЮKassa payment for one
// license and hands back the hosted page to redirect the buyer to. The
// license itself isn't issued here: that happens once the payment
// actually succeeds (see api/yookassa-webhook.ts), never optimistically.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' })

  const email = typeof req.body?.email === 'string' ? req.body.email.trim() : ''
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'invalid email' })

  try {
    const { value, currency } = getPrice()
    const payment = await createPayment({
      email,
      amountValue: value,
      currency,
      description: PRODUCT_DESCRIPTION,
      returnUrl: `${baseUrl(req)}/thank-you.html`,
    })
    const confirmationUrl = payment.confirmation?.confirmation_url
    if (!confirmationUrl) throw new Error('YooKassa response had no confirmation_url')
    res.status(200).json({ confirmationUrl })
  } catch (err) {
    console.error('create-payment failed', err)
    res.status(502).json({ error: 'payment provider error' })
  }
}
