const rateLimit = require('express-rate-limit')
const geoip = require('geoip-lite')
const User = require('../schemas/userSchema')

const ADMIN_CONFIG = {
  MAX_SESSION_DURATION: 2 * 60 * 60 * 1000,
  TOKEN_REFRESH_INTERVAL: 30 * 60 * 1000,
  MAX_FAILED_ATTEMPTS: 3,
  LOCKOUT_DURATION: 15 * 60 * 1000,
  ALLOWED_IPS: process.env.ADMIN_ALLOWED_IPS ? process.env.ADMIN_ALLOWED_IPS.split(',') : [],
  ALLOWED_COUNTRIES: process.env.ADMIN_ALLOWED_COUNTRIES ? process.env.ADMIN_ALLOWED_COUNTRIES.split(',') : [],
  REQUIRE_2FA_FOR_CRITICAL: false,
}

const adminRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Trop de requêtes administrateur, réessayez plus tard', type: 'RATE_LIMIT_EXCEEDED' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `admin_${req.ip}_${req.user?._id || 'anonymous'}`
})

const invalidatedSessions = new Set()

function validateAdminLocation(ip, allowedCountries) {
  if (!allowedCountries.length) return { valid: true }
  const geo = geoip.lookup(ip)
  if (!geo) return { valid: false, reason: 'Impossible de déterminer la localisation' }
  if (!allowedCountries.includes(geo.country)) {
    return { valid: false, reason: `Accès non autorisé depuis ${geo.country}`, country: geo.country }
  }
  return { valid: true, country: geo.country }
}

async function validateAdminInDatabase(userId) {
  try {
    const user = await User.findById(userId).select('_id email role accountLocked isDeleted lastLogin')
    if (!user) return { valid: false, reason: 'Utilisateur introuvable' }
    if (user.isDeleted || user.accountLocked) return { valid: false, reason: 'Compte désactivé ou verrouillé' }
    if (user.role !== 'admin') return { valid: false, reason: 'Privilèges administrateur révoqués' }
    return { valid: true, user }
  } catch (e) {
    return { valid: false, reason: 'Erreur de validation en base' }
  }
}

function logAdminActivity(req, action, status = 'SUCCESS', details = {}) {
  const logData = {
    timestamp: new Date().toISOString(),
    adminId: req.user?._id,
    adminEmail: req.user?.email,
    action,
    status,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    route: `${req.method} ${req.path}`,
    ...details,
  }
  console.log(`[ADMIN_AUDIT] ${JSON.stringify(logData)}`)
}

async function isAdmin(req, res, next) {
  const startTime = Date.now()
  let details = {}
  try {
    const user = req.user
    if (!user) {
      logAdminActivity(req, 'ADMIN_ACCESS_DENIED', 'FAILURE', { reason: 'Non authentifié' })
      return res.status(401).json({ error: 'Authentification requise', type: 'UNAUTHORIZED' })
    }

    const sessionId = req.sessionId || req.user?.sessionId
    if (sessionId && invalidatedSessions.has(sessionId)) {
      logAdminActivity(req, 'ADMIN_ACCESS_DENIED', 'FAILURE', { reason: 'Session invalidée', sessionId })
      return res.status(401).json({ error: 'Session expirée, reconnexion requise', type: 'SESSION_INVALIDATED' })
    }

    const dbValidation = await validateAdminInDatabase(user._id)
    if (!dbValidation.valid) {
      logAdminActivity(req, 'ADMIN_ACCESS_DENIED', 'FAILURE', { reason: dbValidation.reason })
      return res.status(403).json({ error: 'Accès administrateur révoqué', type: 'ADMIN_PRIVILEGES_REVOKED' })
    }

    const tokenIat = req.user?.iat ? (Date.now() - req.user.iat * 1000) : 0
    if (tokenIat && tokenIat > ADMIN_CONFIG.MAX_SESSION_DURATION) {
      logAdminActivity(req, 'ADMIN_ACCESS_DENIED', 'FAILURE', { reason: 'Session expirée' })
      return res.status(401).json({ error: 'Session administrateur expirée', type: 'ADMIN_SESSION_EXPIRED' })
    }

    const clientIp = req.ip
    if (ADMIN_CONFIG.ALLOWED_IPS.length && !ADMIN_CONFIG.ALLOWED_IPS.includes(clientIp)) {
      logAdminActivity(req, 'ADMIN_ACCESS_DENIED', 'FAILURE', { reason: 'IP non autorisée', ip: clientIp })
      return res.status(403).json({ error: 'Accès non autorisé depuis cette IP', type: 'IP_NOT_ALLOWED' })
    }

    if (ADMIN_CONFIG.ALLOWED_COUNTRIES.length) {
      const loc = validateAdminLocation(clientIp, ADMIN_CONFIG.ALLOWED_COUNTRIES)
      if (!loc.valid) {
        logAdminActivity(req, 'ADMIN_ACCESS_DENIED', 'FAILURE', { reason: loc.reason, country: loc.country })
        return res.status(403).json({ error: 'Accès géographiquement restreint', type: 'LOCATION_RESTRICTED' })
      }
      details.country = loc.country
    }

    const userAgent = req.get('User-Agent')
    if (req.user?.lastUserAgent && userAgent && req.user.lastUserAgent !== userAgent) {
      logAdminActivity(req, 'ADMIN_NEW_DEVICE_DETECTED', 'WARNING', { newUserAgent: userAgent, lastUserAgent: req.user.lastUserAgent })
    }

    req.user = { ...(dbValidation.user?.toObject?.() ? dbValidation.user.toObject() : dbValidation.user), adminValidated: true, lastAdminAccess: new Date() }

    logAdminActivity(req, 'ADMIN_ACCESS_GRANTED', 'SUCCESS', { responseTime: `${Date.now() - startTime}ms`, ...details })

    res.set({ 'X-Admin-Session': 'active', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'X-XSS-Protection': '1; mode=block' })
    next()
  } catch (error) {
    logAdminActivity(req, 'ADMIN_ACCESS_ERROR', 'ERROR', { error: error.message })
    return res.status(500).json({ error: 'Erreur de validation administrateur', type: 'VALIDATION_ERROR' })
  }
}

function requireCriticalAdminAuth(req, res, next) {
  // Placeholder: à intégrer si vous avez une 2FA ou re-auth
  next()
}

function invalidateAdminSession(sessionId) {
  if (sessionId) {
    invalidatedSessions.add(sessionId)
    setTimeout(() => invalidatedSessions.delete(sessionId), 60 * 60 * 1000)
  }
}

module.exports = {
  isAdmin: [adminRateLimit, isAdmin],
  requireCriticalAdminAuth,
  invalidateAdminSession,
  ADMIN_CONFIG,
}