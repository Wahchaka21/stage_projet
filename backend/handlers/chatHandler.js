const { roomForPair } = require("../utils/socketRooms")
const chatService = require("../services/chatService")

async function chatHandlers(io, socket) {
    const me = socket.data.userId

    socket.on("join", ({ peerId }) => {
        if (!peerId) {
            return
        }
        const room = roomForPair(me, peerId)
        socket.join(room)
        socket.to(room).emit("system", { text: "Un participant a rejoint la conversation" })
    })

    socket.on("message", async ({ peerId, text }) => {
        if (!peerId) {
            return
        }
        if (typeof text !== "string") {
            return
        }

        const trimmed = text.trim()
        if (trimmed.length === 0) {
            return
        }

        const room = roomForPair(me, peerId)

        try {
            const conv = await chatService.getOrCreateConversation(me, peerId)
            const saved = await chatService.saveMessage({
                conversationId: conv._id,
                userId: me,
                text: trimmed
            })

            io.to(room).emit("message", saved)
        } 
        catch (err) {
            console.error("[chat] erreur sauvegarde message", err)
        }
    })
}

module.exports = { chatHandlers }