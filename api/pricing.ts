import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getPrice } from './_lib/pricing'

// GET /api/pricing — lets the static landing page (public/buy.html) show
// the current price without hardcoding it into HTML. Display-only: the
// actual charge in create-payment.ts reads the same getPrice() directly,
// so the two can never drift apart.
export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json(getPrice())
}
