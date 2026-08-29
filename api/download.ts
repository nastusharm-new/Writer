import type { VercelRequest, VercelResponse } from '@vercel/node'
import { isExpired, verifyLicenseKey } from '../src/lib/license'

// The repo is private, so a plain link to a GitHub Release 404s for anyone
// without repo access — this endpoint is the workaround: it checks the
// license key server-side, then uses a repo-scoped token (never shipped to
// the browser) to ask GitHub for the asset and hands the buyer GitHub's
// own temporary, unauthenticated download URL.
const OWNER = process.env.GITHUB_REPO_OWNER ?? 'nastusharm-new'
const REPO = process.env.GITHUB_REPO_NAME ?? 'Writer'

interface ReleaseAsset {
  id: number
  name: string
}
interface Release {
  draft: boolean
  prerelease: boolean
  assets: ReleaseAsset[]
}

function githubHeaders(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN
  if (!token) throw new Error('GITHUB_TOKEN is not set')
  return { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }
}

function pickAsset(assets: ReleaseAsset[], platform: string): ReleaseAsset | undefined {
  if (platform === 'mac') return assets.find((a) => a.name.endsWith('.dmg'))
  if (platform === 'windows') {
    return assets.find((a) => a.name.endsWith('.msi')) ?? assets.find((a) => a.name.endsWith('.exe'))
  }
  return undefined
}

// GET /api/download?key=<license>&platform=mac|windows
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const key = typeof req.query.key === 'string' ? req.query.key : ''
  const platform = typeof req.query.platform === 'string' ? req.query.platform : ''

  const payload = await verifyLicenseKey(key)
  if (!payload) return res.status(403).send('Ключ не подошёл.')
  if (isExpired(payload)) return res.status(403).send('Срок действия ключа истёк.')
  if (platform !== 'mac' && platform !== 'windows') return res.status(400).send('Unknown platform.')

  // /releases/latest already excludes drafts and prereleases — a release
  // the CI workflow just created stays invisible here until you publish it
  // (undraft it) in GitHub, which is the intended review gate.
  const releaseRes = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/releases/latest`, {
    headers: githubHeaders(),
  })
  if (!releaseRes.ok) return res.status(502).send('Не удалось получить релиз.')
  const release = (await releaseRes.json()) as Release

  const asset = pickAsset(release.assets, platform)
  if (!asset) return res.status(404).send('Установщик для этой платформы не найден в последнем релизе.')

  // Ask GitHub for the asset with redirect handling turned off, so we get
  // the 302 to grab rather than following it into a multi-hundred-MB body
  // this function would otherwise have to stream through itself.
  const assetRes = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/releases/assets/${asset.id}`, {
    headers: { ...githubHeaders(), Accept: 'application/octet-stream' },
    redirect: 'manual',
  })
  const location = assetRes.headers.get('location')
  if (!location) return res.status(502).send('GitHub не вернул ссылку на файл.')

  res.redirect(302, location)
}
