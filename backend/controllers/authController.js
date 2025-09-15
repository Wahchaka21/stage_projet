const authService = require('../services/authService')
const { signRefreshToken, verifyRefreshToken } = require('../utils/jwt')
const { buildRefreshCookieOptions } = require('../utils/cookies')

async function register(req, res) {
  try {
    const { email, password, name, lastname, nickname } = req.body || {}
    const { user, token } = await authService.register({ email, password, name, lastname, nickname })

    // on pose le refresh en cookie HttpOnly (durée longue)
    const refresh = signRefreshToken(user, user.tokenVersion || 0)
    res.cookie('refreshToken', refresh, buildRefreshCookieOptions())

    res.status(201).json({ token, user })
  } 
  catch (err) {
    const type = err.type || 'INTERNAL'
    const status = type === 'VALIDATION_ERROR' ? 400 : (type === 'DUPLICATE' ? 409 : 500)
    res.status(status).json({ error: err.message || 'Erreur', fields: err.fields || {} })
  }
}

async function login(req, res) {
  try {
    const { email, password, remember } = req.body || {}
    const { user, token } = await authService.login({ email, password })

    const refreshExpiresIn = remember ? '30d' : '1d'
    const refreshMs = remember ? 30*24*60*60*1000 : 24*60*60*1000

    const refresh = signRefreshToken(user, user.tokenVersion || 0, { expiresIn: refreshExpiresIn })

    res.cookie('refreshToken', refresh, buildRefreshCookieOptions(refreshMs))

    res.status(200).json({ token, user })
  } 
  catch (err) {
    const type = err.type || 'INTERNAL'
    const status = type === 'AUTH_ERROR' ? 401 : (type === 'VALIDATION_ERROR' ? 400 : 500)
    res.status(status).json({ error: 'Information invalide' })
  }
}

async function refresh(req, res) {
  try {
    const token = req.cookies?.refreshToken
    if (!token) return res.status(401).json({ error: 'Refresh manquant' })

    let payload
    try { payload = verifyRefreshToken(token) }
    catch { return res.status(401).json({ error: 'Refresh invalide' }) }

    // authService.getUserById minimal pour vérifier qu’il existe encore et n’est pas soft-deleted
    const user = await authService.getUserForToken(payload.sub)
    if (!user) return res.status(401).json({ error: 'Utilisateur invalide' })

    // (optionnel) si tu utilises tokenVersion dans ton schema
    if (typeof user.tokenVersion === 'number' && payload.ver !== user.tokenVersion) {
      return res.status(401).json({ error: 'Refresh révoqué' })
    }

    // re-génère un access court + rotate le refresh
    const { token: newAccess } = await authService.issueAccessFor(user)
    const newRefresh = signRefreshToken(user, user.tokenVersion || 0)
    res.cookie('refreshToken', newRefresh, buildRefreshCookieOptions())

    return res.status(200).json({ token: newAccess })
  } 
  catch (err) {
    return res.status(500).json({ error: 'Erreur interne' })
  }
}

async function logout(req, res) {
  try {
    // (optionnel) si tu veux invalider globalement tous les refresh de l’utilisateur connecté
    // if (req.user?._id) await authService.bumpTokenVersion(req.user._id)

    res.clearCookie('refreshToken', { ...buildRefreshCookieOptions(), maxAge: 0 })
    return res.status(200).json({ message: 'Déconnecté' })
  } 
  catch (err) {
    return res.status(500).json({ error: 'Erreur interne' })
  }
}

async function me(req, res) {
  res.status(200).json(req.user)
}

module.exports = {
  register,
  login,
  me,
  refresh,
  logout,
}