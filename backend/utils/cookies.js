function buildRefreshCookieOptions() {
  const prod = process.env.HTTPS_ENABLED === 'true' || process.env.NODE_ENV === 'production'
  return {
    httpOnly: true,
    secure: prod,
    sameSite: 'lax',
    path: '/auth',
    maxAge: parseMaxAge(process.env.REFRESH_MAX_AGE || '30d'),
  }
}

function parseMaxAge(str) {
  if (!str) {
    return 30 * 24 * 3600 * 1000
  }
  if (/^\d+$/.test(str)) {
    return Number(str) * 1000
  }
  const m = String(str).match(/^(\d+)([smhd])$/i)
  if (!m) {
    return 30 * 24 * 3600 * 1000
  }
  const n = Number(m[1]); const u = m[2].toLowerCase()
  const map = { s: 1e3, m: 60e3, h: 3600e3, d: 86400e3 }
  return n * map[u]
}

module.exports = { buildRefreshCookieOptions }