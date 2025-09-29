const express = require("express")
const isAuth = require("../middlewares/authCheck")
const chatController = require("../controllers/chatController")
const upload = require("../middlewares/uploadPhoto")
const {uploadVideo, gererErreurUpload} = require("../middlewares/uploadVideo")
const unreadController = require("../controllers/unreadController")

const router = express.Router()

router.get("/:conversationId/history", isAuth, chatController.getHistory)
router.get("/:peerId/messages", isAuth, chatController.getMessages)
router.delete("/delete/:id", isAuth, chatController.handleDeleteMessage)
router.put("/modify/:messageId", isAuth, chatController.handleModifyMessage)
router.post("/upload", upload.single("photo"), isAuth, chatController.handleUploadPhoto)
router.delete("/deletePhoto/:photoId", isAuth, chatController.handleDeletePhoto)
router.post("/uploadVideo", isAuth, uploadVideo.single("video"), chatController.handleUploadVideo, gererErreurUpload)
router.get("/video/:videoId", isAuth, chatController.getVideoInfo)
router.delete("/deleteVideo/:videoId", isAuth, chatController.handleDeleteVideo)
router.get("/me/unread", isAuth, unreadController.getMesNonLus)
router.post("/conversation/:id/read", isAuth, unreadController.postMarquerLu)

module.exports = router