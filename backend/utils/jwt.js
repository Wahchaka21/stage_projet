const jwt = require('jsonwebtoken')
const config = require('../config')

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

function verifyToken(token) {
  return jwt.verify(token, config.jwt_secret, {
    algorithms: ['HS256'],
    issuer: config.jwt_issuer,
    audience: config.jwt_audience
  })
}


function signRefreshToken(user, tokenVersion = 0, options = {}) {
  const payload = { sub: String(user._id), ver: tokenVersion }
  const refreshSecret = process.env.REFRESH_JWT_SECRET
  return jwt.sign(payload, refreshSecret, {
    algorithm: 'HS256',
    issuer: process.env.JWT_ISSUER,
    audience: process.env.JWT_AUDIENCE,
    expiresIn: options.expiresIn || process.env.REFRESH_EXPIRES_IN || '30d',
  })
}

function verifyRefreshToken(token) {
  const refreshSecret = process.env.REFRESH_JWT_SECRET
  return jwt.verify(token, refreshSecret, {
    algorithms: ['HS256'],
    issuer: process.env.JWT_ISSUER,
    audience: process.env.JWT_AUDIENCE,
  })
}

module.exports = {
  signAccessToken,
  verifyToken,
  signRefreshToken,
  verifyRefreshToken
}