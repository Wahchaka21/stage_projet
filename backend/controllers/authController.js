const authService = require('../services/authService')

async function register(req, res) {
  try {
    const { email, password, name, lastname, nickname } = req.body || {}
    const { user, token } = await authService.register({ email, password, name, lastname, nickname })
    res.status(201).json({ token, user })
  } catch (err) {
    const type = err.type || 'INTERNAL'
    const status = type === 'VALIDATION_ERROR' ? 400 : (type === 'DUPLICATE' ? 409 : 500)
    res.status(status).json({ error: err.message || 'Erreur', fields: err.fields || {} })
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body || {}
    const { user, token } = await authService.login({ email, password })
    res.status(200).json({ token, user })
  } catch (err) {
    const type = err.type || 'INTERNAL'
    const status = type === 'AUTH_ERROR' ? 401 : (type === 'VALIDATION_ERROR' ? 400 : 500)
    res.status(status).json({ error: 'Invalid credentials' })
  }
}

async function me(req, res) {
  // req.user est fourni par passport, déjà filtré/lean selon la stratégie
  res.status(200).json(req.user)
}

module.exports = {
  register,
  login,
  me,
}

