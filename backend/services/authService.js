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

  const exists = await User.findOne({ email: normEmail }).lean()
  if (exists) {
    throw persoError('DUPLICATE', 'email déjà utilisé', { fields: { email: 'déjà utilisé' } })
  }

  const user = new User({ email: normEmail, password, name, lastname, nickname, role: 'user' })
  try {
    await user.save()
  } 
  catch (err) {
    if (err && err.code === 11000) {
      const dupField = Object.keys(err.keyPattern || {})[0] || 'field'
      throw persoError('DUPLICATE', `${dupField} déjà utilisé`, { fields: { [dupField]: 'déjà utilisé' } })
    }
    if (err && err.name === 'ValidationError') {
      const fields = {}
      for (let k in err.errors) fields[k] = err.errors[k].message
      throw persoError('VALIDATION_ERROR', 'Données utilisateur invalides', { fields })
    }
    throw persoError('DB_ERROR', 'Erreur de création utilisateur', { original: err.message })
  }

  const token = signAccessToken(user)
  return { user, token }
}

const MAX_LOGIN_ATTEMPTS = Number(process.env.MAX_LOGIN_ATTEMPTS || 5)

async function login({ email, password }) {
  assertString(email, 'email')
  assertString(password, 'password')

  const normEmail = String(email).toLowerCase()

  const user = await User.findOne({ email: normEmail })

  if (!user) {
    throw persoError('AUTH_ERROR', 'Invalid credentials')
  }

  if (user.accountLocked) {
    throw persoError('AUTH_ERROR', 'Invalid credentials')
  }

  const ok = await bcrypt.compare(password, user.password)

  if (!ok) {
    const attempts = (user.loginAttempts || 0) + 1
    const lock = attempts >= MAX_LOGIN_ATTEMPTS

    await User.updateOne(
      { _id: user._id },
      { $set: { loginAttempts: lock ? 0 : attempts, accountLocked: lock } }
    )

    throw persoError('AUTH_ERROR', 'Invalid credentials')
  }

  await User.updateOne(
    { _id: user._id },
    { $set: { lastLogin: new Date(), loginAttempts: 0, accountLocked: false } }
  )

  const token = signAccessToken(user)

  return { user, token }
}

module.exports = {
  register,
  login,
}