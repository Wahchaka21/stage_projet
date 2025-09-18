const express = require('express')
const isAuth = require('../middlewares/authCheck')
const {getHistory} = require("../controllers/chatController")
const chatController = require("../controllers/chatController")

const router = express.Router()

router.get("/:conversationId/history", isAuth, getHistory)
router.get("/:peerId/messages", isAuth, chatController.getMessages)
router.delete("/delete/:id", isAuth, chatController.handleDeleteMessage)

module.exports = router