const convoService = require("../services/chatService")
const path = require("path")
const ffmpeg = require("fluent-ffmpeg")

async function getHistory(req, res) {
    try {
        const conversationId = req.params.conversationId
        const limit = Number(req.query.limit)
        const before = req.query.before

        const items = await convoService.listMessages(conversationId, {
            limit,
            before
        })

        res.json({ items })
    } 
    catch (err) {
        if (err && err.code === "INVALID_ID") {
            return res.status(400).json({ error: { code: err.code, message: err.message, ...err.meta }})
        }

        if(err && err.code === "NOT_FOUND") {
            return res.status(404).json({ error: { code: err.code, message: err.message, ...err.meta}})
        }

        if (err && err.code === "DB_ERROR") {
            return res.status(500).json({ error: { code: err.code, message: err.message, ...err.meta}})
        }

        console.error("[getHistory] erreur inattendue :", err)
        return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erreur interne"}})
    }
}

async function getMessages(req, res) {
    try {
        const me = req.user
        if (!me) {
            res.status(401).json({ error: "non authentifie" })
            return
        }

        const peerIdRaw = req.params.peerId
        if (!peerIdRaw) {
            res.status(400).json({ error: "peerId requis" })
            return
        }
        const peerId = String(peerIdRaw)

        let limit = 50
        if (req.query && req.query.limit) {
            const n = Number(req.query.limit)
            if (!isNaN(n)) {
                limit = n
            }
        }
        if (limit > 100) {
            limit = 100
        }
        if (limit <= 0) {
            limit = 50
        }

        let beforeDate = null
        if (req.query && req.query.before) {
            const d = new Date(String(req.query.before))
            if (!isNaN(d.getTime())) {
                beforeDate = d
            }
        }

        const out = await convoService.listMessagesBetween(me._id, peerId, limit, beforeDate)

        res.status(200).json({ conversationId: out.conversationId, messages: out.messages })
    } 
    catch (err) {
        if (err && err.code === "INVALID_ID") {
            return res.status(400).json({ error: { code: err.code, message: err.message, ...err.meta }})
        }

        if(err && err.code === "NOT_FOUND") {
            return res.status(404).json({ error: { code: err.code, message: err.message, ...err.meta}})
        }

        if (err && err.code === "DB_ERROR") {
            return res.status(500).json({ error: { code: err.code, message: err.message, ...err.meta}})
        }

        console.error("[getMessage] erreur inattendue :", err)
        return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erreur interne"}})
    }
}

async function handleDeleteMessage(req, res) {
    try {
        const messageId = req.params.id

        let userId
        if(req.user && req.user._id) {
            userId = String(req.user._id)
        }
        else {
            return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Connexion requise"}})
        }

        let isAdmin
        if(req.user && req.user.role === "admin") {
            isAdmin = true
        }
        else {
            isAdmin = false
        }

        const result = await convoService.deleteMessage(messageId, userId, isAdmin)
        if (result && result.conversationId) {
            const room = "conv:" + result.conversationId
            const io = req.app && req.app.get("io")
            if (io) {
                io.to(room).emit("message-deleted", { _id: messageId })
            }
        }

        res.status(200).json({
            message: "Message supprimé !",
            data: result
        })
    }
    catch (err) {
        if (err && err.code === "INVALID_ID") {
            return res.status(400).json({ error: { code: err.code, message: err.message, ...err.meta }})
        }

        if(err && err.code === "NOT_FOUND") {
            return res.status(404).json({ error: { code: err.code, message: err.message, ...err.meta}})
        }

        if (err && err.code === "DB_ERROR") {
            return res.status(500).json({ error: { code: err.code, message: err.message, ...err.meta}})
        }

        console.error("[handleDeleteMessage] erreur inattendue :", err)
        return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erreur interne"}})
    }
}

async function handleModifyMessage(req, res) {
    try {
        const messageId = req.params.messageId
        const {nouveauTexte} = req.body

        let userId
        
        if(req.user && req.user._id) {
            userId = String(req.user._id)
        }
        else {
            return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Connexion requise"}})
        }

        const result = await convoService.modifyMessage(messageId, userId, nouveauTexte)

        if(result && result.conversationId && req.app && req.app.get("io")) {
            const room = "conv:" + String(result.conversationId)
            const io = req.app && req.app.get("io")
            io.to(room).emit("message-modified", { 
                _id: result._id,
                text: result.text,
                updatedAt: result.updatedAt
            })
        }

        res.status(200).json({
            message: "Message modifier !",
            data: result
        })
    }
    catch (err) {
        if (err && err.code === "INVALID_ID") {
            return res.status(400).json({ error: {code: err.code, message: err.message, ...err.meta }})
        }

        if (err && err.code === "NOT_FOUND") {
            return res.status(404).json({error: {code: err.code, message: err.message, ...err.meta}})
        }

        if (err && err.code ==="DB_ERROR") {
            return res.status(500).json({error: {code: err.code, message: err.message, ...err.meta}})
        }

        console.error("[handleModifyMessage] erreur inattendue :", err)
        return res.status(500).json({ error: {code: "INTERNAL_ERROR", message: "Erreur interne"}})
    }
}

async function handleUploadPhoto(req, res) {
    try {
        const file = req.file
        const userId = req.user._id

        if(!file) {
            return res.status(400).json({ error: "Aucune photo n'a été reçue" })
        }

        const url = `http://localhost:3000/uploads/photos/${file.filename}`

        const photo = await convoService.uploadPhoto({
            userId,
            name: file.originalname,
            url,
            size: file.size,
            format: file.mimetype
        })

        res.status(201).json(photo)
    }
    catch (err) {
        if (err && err.code === "INVALID_ID") {
            return res.status(400).json({ error: {code: err.code, message: err.message, ...err.meta }})
        }

        if (err && err.code === "NOT_FOUND") {
            return res.status(404).json({error: {code: err.code, message: err.message, ...err.meta}})
        }

        if (err && err.code ==="DB_ERROR") {
            return res.status(500).json({error: {code: err.code, message: err.message, ...err.meta}})
        }

        console.error("[handleUploadPhoto] erreur inattendue :", err)
        return res.status(500).json({ error: {code: "INTERNAL_ERROR", message: "Erreur interne"}})
    }
}

async function handleDeletePhoto(req, res) {
    try {
        const photoId = req.params.photoId
        
        const result = await convoService.deletePhoto(photoId)

        res.status(200).json({
            message: "photo supprimée",
            data: result
        })
    }
    catch (err) {
        if (err && err.code === "INVALID_ID") {
            return res.status(400).json({ error: {code: err.code, message: err.message, ...err.meta }})
        }

        if (err && err.code === "NOT_FOUND") {
            return res.status(404).json({error: {code: err.code, message: err.message, ...err.meta}})
        }

        if (err && err.code ==="DB_ERROR") {
            return res.status(500).json({error: {code: err.code, message: err.message, ...err.meta}})
        }

        console.error("[handleDeletePhoto] erreur inattendue :", err)
        return res.status(500).json({ error: {code: "INTERNAL_ERROR", message: "Erreur interne"}})
    }
}

function ffprobeDuration(filePath) {
    return new Promise((resolve) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err || !metadata?.format?.duration) {
                return resolve(null)
            }

            const sec = Math.round(Number(metadata.format.duration))
            resolve(Number.isFinite(sec) ? sec : null)
        })
    })
}

async function handleUploadVideo(req, res) {
    try {
        const file = req.file
        const userId = req.user._id

        if(!file) {
            return res.status(400).json({ error: "Aucune video n'a été reçue" })
        }

        const url = `http://localhost:3000/uploads/videos/${file.filename}`

        const videoDuration = await ffprobeDuration(file.path)

        const video = await convoService.uploadVideo({
            userId,
            name: file.originalname,
            url,
            size: file.size,
            format: file.mimetype,
            videoDuration
        })

        res.status(201).json(video)
    }
    catch(err) {
        if (err && err.code === "INVALID_ID") {
            return res.status(400).json({ error: {code: err.code, message: err.message, ...err.meta }})
        }

        if (err && err.code === "NOT_FOUND") {
            return res.status(404).json({error: {code: err.code, message: err.message, ...err.meta}})
        }

        if (err && err.code ==="DB_ERROR") {
            return res.status(500).json({error: {code: err.code, message: err.message, ...err.meta}})
        }

        console.error("[handleUploadVideo] erreur inattendue :", err)
        return res.status(500).json({ error: {code: "INTERNAL_ERROR", message: "Erreur interne"}})
    }
}

async function handleDeleteVideo(req, res) {
    try {
        const videoId = req.params.videoId

        const result = await convoService.deleteVideo(videoId)

        res.status(200).json({
            message: "Video supprimée",
            data: result
        })
    }
    catch (err) {
        if (err && err.code === "INVALID_ID") {
            return res.status(400).json({ error: {code: err.code, message: err.message, ...err.meta }})
        }

        if (err && err.code === "NOT_FOUND") {
            return res.status(404).json({error: {code: err.code, message: err.message, ...err.meta}})
        }

        if (err && err.code ==="DB_ERROR") {
            return res.status(500).json({error: {code: err.code, message: err.message, ...err.meta}})
        }

        console.error("[handleDeleteVideo] erreur inattendue :", err)
        return res.status(500).json({ error: {code: "INTERNAL_ERROR", message: "Erreur interne"}})
    }
}

async function getVideoInfo(req, res) {
    try {
        const videoId = req.params.videoId

        const video = await convoService.getVideo(videoId)

        res.status(200).json({
            videoId: String(video._id),
            name: video.name,
            url: video.url,
            size: video.size,
            format: video.format,
            videoDuration: video.videoDuration
        })
    }
    catch (err) {
        if (err && err.code === "INVALID_ID") {
            return res.status(400).json({ error: {code: err.code, message: err.message, ...err.meta }})
        }

        if (err && err.code === "NOT_FOUND") {
            return res.status(404).json({error: {code: err.code, message: err.message, ...err.meta}})
        }

        if (err && err.code ==="DB_ERROR") {
            return res.status(500).json({error: {code: err.code, message: err.message, ...err.meta}})
        }

        console.error("[getVideoInfo] erreur inattendue :", err)
        return res.status(500).json({ error: {code: "INTERNAL_ERROR", message: "Erreur interne"}})
    }
}

module.exports = {
    getHistory,
    getMessages,
    handleDeleteMessage,
    handleModifyMessage,
    handleUploadPhoto,
    handleDeletePhoto,
    handleUploadVideo,
    handleDeleteVideo,
    getVideoInfo
}