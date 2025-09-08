const express = require('express')
const userController = require('../controllers/userController')
const isAuth = require('../middlewares/authCheck')

const router = express.Router()

router.delete('/delete', isAuth, userController.handleDeleteMe)

module.exports = router