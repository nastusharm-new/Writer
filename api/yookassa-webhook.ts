import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getPayment } from './_lib/yookassa'
import { signLicense } from './_lib/signLicense'
import { sendLicenseEmail } from './_lib/email'
import { supabaseAdmin } from './_lib/supabaseAdmin'

function baseUrl(req: VercelRequest): string {
  const proto = (req.headers['x-forwarded-proto'] as string | undefined) ?? 'https'
  return `${proto}://${req.headers.host}`
}

// POST /api/yookassa-webhook — configure this exact URL as the HTTP
// notification address in the ЮKassa dashboard. ЮKassa retries a
// notification until it gets a 2xx back, so every path below either does
// the (idempotent) work and returns 200, or lets a genuine error bubble up
// as 500 so it tries again later.
//
// The incoming body is never trusted on its own — anyone can POST
// arbitrary JSON to a public webhook URL. The payment id is the only
// thing taken from it; everything that matters (status, amount, email) is
// re-fetched straight from ЮKassa's own API before acting on it.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const paymentId = req.body?.object?.id as string | undefined
  if (!paymentId) return res.status(200).json({ ok: true, skipped: 'no payment id' })

  const payment = await getPayment(paymentId)
  if (payment.status !== 'succeeded') {
    return res.status(200).json({ ok: true, skipped: `status is ${payment.status}` })
  }

  const email = payment.metadata?.email
  if (!email) {
    console.error(`yookassa-webhook: payment ${paymentId} succeeded but has no metadata.email`)
    return res.status(200).json({ ok: true, skipped: 'no email in metadata' })
  }

  const db = supabaseAdmin()
  const { data: existing } = await db
    .from('license_orders')
    .select('id')
    .eq('provider_payment_id', paymentId)
    .maybeSingle()
  if (existing) return res.status(200).json({ ok: true, skipped: 'already processed' })

  const licenseKey = await signLicense(email, paymentId)

  // Insert first, then email — if this insert loses a race to a
  // concurrent delivery of the same notification, the unique constraint on
  // provider_payment_id rejects the duplicate and we treat it exactly like
  // the "already processed" check above.
  const { error: insertError } = await db.from('license_orders').insert({
    provider: 'yookassa',
    provider_payment_id: paymentId,
    email,
    amount: payment.amount.value,
    currency: payment.amount.currency,
    license_key: licenseKey,
  })
  if (insertError) {
    if (insertError.code === '23505') return res.status(200).json({ ok: true, skipped: 'already processed (race)' })
    throw insertError
  }

  // The order is recorded either way at this point. If sending fails, the
  // license key is still sitting in license_orders for the seller to look
  // up and resend by hand — this does not retry on its own.
  try {
    await sendLicenseEmail({ to: email, licenseKey, baseUrl: baseUrl(req) })
  } catch (err) {
    console.error(`yookassa-webhook: order ${paymentId} recorded but email to ${email} failed`, err)
  }

  res.status(200).json({ ok: true })
}
