const chatService = require("../services/chatService")

async function getHistory(req, res) {
    const { conversationId } = req.params
    const { limit, before } = req.query
    const items = await chatService.listMessages(conversationId, {
        limit: Number(limit) || 50,
        before
    })
    res.json({ items })
}

module.exports = { getHistory }