const Conversation = require("../schemas/Conversation")
const unreadService = require("../services/unreadService")
const persoError = require("../utils/error")

async function getMesNonLus(req, res) {
    try {
        const me = String(req.user._id)

        const mine = await Conversation.find(
            { $or: [{ userA: me }, { userB: me }] },
            { _id: 1 }
        )
        const convIds = mine.map(c => c._id)

        const data = await unreadService.countPerConversation(me, convIds)
        res.json(data)
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

        console.error("[getMesNonLus] erreur inattendue :", err)
        return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erreur interne"}})
    }
}

async function postMarquerLu(req, res) {
    try {
        const me = String(req.user._id)
        const convId = req.params.id
        const at = req.body?.at ? new Date(req.body.at) : new Date()

        const ok = await unreadService.markAsRead(convId, me, at)
        res.json(ok)
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

        console.error("[postMarquerLu] erreur inattendue :", err)
        return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erreur interne"}})
    }
}

module.exports = {
    getMesNonLus,
    postMarquerLu
}