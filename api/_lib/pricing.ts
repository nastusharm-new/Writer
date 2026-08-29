// Single source of truth for the price — read from env vars so it can be
// changed from the Vercel dashboard without a code change, and so the
// amount actually charged always matches what api/pricing.ts shows on the
// landing page (the client never gets to say what the price is).
//
// Defaults below are placeholders — set LICENSE_PRICE_VALUE /
// LICENSE_PRICE_CURRENCY in Vercel to your real price before going live.
export function getPrice(): { value: string; currency: string } {
  return {
    value: process.env.LICENSE_PRICE_VALUE ?? '2900.00',
    currency: process.env.LICENSE_PRICE_CURRENCY ?? 'RUB',
  }
}

export const PRODUCT_DESCRIPTION = 'Draft — лицензия на приложение (пожизненная, десктоп)'
