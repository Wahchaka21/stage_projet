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

router.post('/register', authController.register)

router.post('/login', authController.login)

router.get('/me', isAuth, authController.me)

router.post('/refresh', authController.refresh)

router.post('/logout', authController.logout)

module.exports = router