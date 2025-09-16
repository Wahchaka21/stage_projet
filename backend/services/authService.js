const bcrypt = require('bcryptjs')
const User = require('../schemas/userSchema')
const { signAccessToken } = require('../utils/jwt')
const persoError = require('../utils/error')
const userService = require("./userService")

function assertString(value, name) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw persoError('VALIDATION_ERROR', `${name} requis`, { fields: { [name]: 'requis' } })
  }
}

function assertStrongPassword(pwd) {
  const errors = userService.validatePassword(pwd)
  if (errors && errors.length) {
    throw persoError('VALIDATION_ERROR', 'Mot de passe non conforme', {
      fields: { password: errors.join(', ') }
    })
  }
}

async function register({ email, password, name, lastname, nickname }) {
  assertString(email, 'email')
  assertString(password, 'password')
  assertString(name, 'name')
  assertString(lastname, 'lastname')
  assertStrongPassword(password)

  const normEmail = String(email).toLowerCase()

  const user = await userService.createUser({
    email: normEmail,
    password,
    name,
    lastname,
    nickname,
  })

  const token = signAccessToken(user)
  return { user, token }
}

const MAX_LOGIN_ATTEMPTS = Number(process.env.MAX_LOGIN_ATTEMPTS || 5)

async function login({ email, password }) {
  assertString(email, 'email')
  assertString(password, 'password')

  const normEmail = String(email).toLowerCase()

  const user = await User.findOne({ email: normEmail, isDeleted: { $ne: true} })
  if (!user) throw persoError('AUTH_ERROR', 'Information invalide')

  const ok = await bcrypt.compare(password, user.password)
  if (!ok) {
    const attempts = (user.loginAttempts || 0) + 1
    const lock = attempts >= MAX_LOGIN_ATTEMPTS

    await User.updateOne(
      { _id: user._id },
      { $set: { loginAttempts: lock ? 0 : attempts, accountLocked: lock } }
    )
    throw persoError('AUTH_ERROR', 'Information invalide')
  }

  await User.updateOne(
    { _id: user._id },
    { $set: { lastLogin: new Date(), loginAttempts: 0, accountLocked: false } }
  )

  const token = signAccessToken(user)
  return { user, token }
}


async function getUserForToken(userId) {
  const u = await User.findById(userId).select("_id role isDeleted tokenVersion")
  if (!u || u.isDeleted) return null
  return u
}

async function issueAccessFor(user) {
  const token = signAccessToken(user)
  return {token}
}

async function bumpTokenVersion(userId) {
  await User.findByIdAndUpdate(userId, {$inc: {tokenVersion: 1}})
}

module.exports = {
  register,
  login,
  getUserForToken,
  issueAccessFor,
  bumpTokenVersion,
}
