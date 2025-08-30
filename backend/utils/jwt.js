const jwt = require('jsonwebtoken')
const config = require('../config')

// Signature d'un access token (court) basé sur l'ID utilisateur
function signAccessToken(user, options = {}) {
  const payload = { sub: String(user._id) }
  const signOptions = {
    algorithm: 'HS256',
    issuer: config.jwt_issuer,
    audience: config.jwt_audience,
    expiresIn: options.expiresIn || '15m'
  }
  return jwt.sign(payload, config.jwt_secret, signOptions)
}

// Vérification manuelle (utile hors middleware passport)
function verifyToken(token) {
  return jwt.verify(token, config.jwt_secret, {
    algorithms: ['HS256'],
    issuer: config.jwt_issuer,
    audience: config.jwt_audience
  })
}

module.exports = {
  signAccessToken,
  verifyToken
}