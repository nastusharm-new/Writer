// Sends the "here's your license" email via Resend
// (https://resend.com/docs/api-reference/emails/send-email). Needs
// RESEND_API_KEY and a RESEND_FROM address on a domain verified in the
// Resend dashboard — an unverified `from` gets the send rejected outright.
const RESEND_API = 'https://api.resend.com/emails'

export async function sendLicenseEmail(params: { to: string; licenseKey: string; baseUrl: string }) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM
  if (!apiKey || !from) throw new Error('RESEND_API_KEY / RESEND_FROM are not set')

  const macUrl = `${params.baseUrl}/api/download?platform=mac&key=${encodeURIComponent(params.licenseKey)}`
  const winUrl = `${params.baseUrl}/api/download?platform=windows&key=${encodeURIComponent(params.licenseKey)}`

  const html = `
    <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
      <h1 style="font-size: 22px; border-bottom: 2px solid #8c2f2f; padding-bottom: 12px;">Draft</h1>
      <p>Спасибо за покупку! Приложение активируется этим ключом — введите его целиком, без пробелов и переносов, в окне активации при первом запуске:</p>
      <p style="background: #f4f1ea; border: 1px solid #d8d2c2; padding: 14px; font-family: 'Courier New', monospace; font-size: 13px; word-break: break-all;">${params.licenseKey}</p>
      <p>Скачать приложение:</p>
      <p>
        <a href="${macUrl}" style="color: #8c2f2f;">Draft для Mac</a>
        &nbsp;·&nbsp;
        <a href="${winUrl}" style="color: #8c2f2f;">Draft для Windows</a>
      </p>
      <p style="color: #555; font-size: 13px;">
        Лицензия куплена на одного пользователя и один компьютер. Активация происходит полностью
        локально — интернет для неё не нужен. Сохраните это письмо: ключ понадобится при переустановке.
      </p>
    </div>
  `.trim()

  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: params.to,
      subject: 'Ваш лицензионный ключ Draft',
      html,
    }),
  })
  if (!res.ok) throw new Error(`Resend send failed: ${res.status} ${await res.text()}`)
}
