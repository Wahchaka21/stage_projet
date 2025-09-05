const express = require('express')
const rateLimit = require('express-rate-limit')
const authController = require('../controllers/authController')
const isAuth = require('../middlewares/authCheck')

const router = express.Router()

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later.' }
})

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many accounts created from this IP, please try again later.' }
})

// POST /auth/register
router.post('/register', registerLimiter, authController.register)

// POST /auth/login
router.post('/login', loginLimiter, authController.login)

// GET /auth/me (route protégée)
router.get('/me', isAuth, authController.me)

module.exports = router