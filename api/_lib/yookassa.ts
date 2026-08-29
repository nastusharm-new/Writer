// Thin wrapper around ЮKassa's REST API (https://yookassa.ru/developers/api).
// Both calls use HTTP Basic auth with the shop's own id/secret — set these
// in Vercel's environment variables, never in the repo.
const API_BASE = 'https://api.yookassa.ru/v3'

function authHeader(): string {
  const shopId = process.env.YOOKASSA_SHOP_ID
  const secretKey = process.env.YOOKASSA_SECRET_KEY
  if (!shopId || !secretKey) throw new Error('YOOKASSA_SHOP_ID / YOOKASSA_SECRET_KEY are not set')
  return `Basic ${Buffer.from(`${shopId}:${secretKey}`).toString('base64')}`
}

export interface YookassaPayment {
  id: string
  status: 'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled'
  amount: { value: string; currency: string }
  metadata?: Record<string, string>
  confirmation?: { type: string; confirmation_url?: string }
}

// Creates a payment for one license and returns the ЮKassa-hosted page to
// redirect the buyer to. The price always comes from our own env vars
// (getPrice() in api/_lib/pricing.ts) — never from the request body, so a
// tampered client request can't talk the shop down to a lower amount.
export async function createPayment(params: {
  email: string
  amountValue: string
  currency: string
  description: string
  returnUrl: string
}): Promise<YookassaPayment> {
  const res = await fetch(`${API_BASE}/payments`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
      'Idempotence-Key': crypto.randomUUID(),
    },
    body: JSON.stringify({
      amount: { value: params.amountValue, currency: params.currency },
      capture: true,
      confirmation: { type: 'redirect', return_url: params.returnUrl },
      description: params.description,
      metadata: { email: params.email },
      // Best-effort receipt for 54-ФЗ — double-check vat_code and
      // payment_subject match how your kkt/self-employment is actually
      // registered with ЮKassa before relying on this in production.
      receipt: {
        customer: { email: params.email },
        items: [
          {
            description: params.description,
            quantity: '1.00',
            amount: { value: params.amountValue, currency: params.currency },
            vat_code: 1,
            payment_subject: 'service',
            payment_mode: 'full_payment',
          },
        ],
      },
    }),
  })
  if (!res.ok) throw new Error(`YooKassa createPayment failed: ${res.status} ${await res.text()}`)
  return (await res.json()) as YookassaPayment
}

// Re-fetches a payment by id from ЮKassa itself. The webhook handler uses
// this rather than trusting the notification body directly — anyone can
// POST arbitrary JSON to a public webhook URL, but they can't make
// ЮKassa's own API say a payment succeeded when it didn't.
export async function getPayment(paymentId: string): Promise<YookassaPayment> {
  const res = await fetch(`${API_BASE}/payments/${paymentId}`, {
    headers: { Authorization: authHeader() },
  })
  if (!res.ok) throw new Error(`YooKassa getPayment failed: ${res.status} ${await res.text()}`)
  return (await res.json()) as YookassaPayment
}
