const express = require('express')
const isAuth = require('../middlewares/authCheck')
const chatController = require("../controllers/chatController")

const router = express.Router()

router.get("/:conversationId/history", isAuth, chatController.getHistory)
router.get("/:peerId/messages", isAuth, chatController.getMessages)
router.delete("/delete/:id", isAuth, chatController.handleDeleteMessage)
router.put("/modify/:messageId", isAuth, chatController.handleModifyMessage)

module.exports = router