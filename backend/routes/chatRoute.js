const express = require('express')
const isAuth = require('../middlewares/authCheck')
const {getHistory} = require("../controllers/chatController")

const router = express.Router()

router.get("/:conversationId/message", isAuth, getHistory)

module.exports = router