const convoService = require("../services/chatService")

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
        res.status(500).json({ error: "erreur chargement historique" })
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
        res.status(500).json({ error: "erreur chargement messages" })
    }
}

module.exports = {
    getHistory,
    getMessages
}
