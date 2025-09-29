const chatService = require("../services/chatService")

async function chatHandlers(io, socket) {
    const me = socket.data.userId
    if(!me) {
        try {
            socket.disconnect()
        }
        catch (err) {
            console.error(err)
        }
        return
    }

    try {
        socket.join("user:" + String(me))
    }
    catch(err) {
        console.error("socket joun user room error :", err)
    }

    socket.on("join", async ({ peerId }) => {
        try {
            if (!peerId) {
                return
            }

            const conv = await chatService.getOrCreateConversation(me, peerId)
            const room = "conv:" + String(conv._id)

            try {
                for(const roomName of socket.rooms) {
                    const isConvRoom = typeof roomName === "string" && roomName.startsWith("conv:")
                    if(isConvRoom) {
                        socket.leave(roomName)
                    }
                }
            }
            catch (err) {
                console.error(err)
            }
            socket.join(room)

            socket.emit("system", { joined: room, Conversation: String(conv._id) })
        }
        catch (err) {
            console.error("[socket join] erreur :", err)
        }
    })

    socket.on("message", async ({ peerId, text }) => {
        try {
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

            const conv = await chatService.getOrCreateConversation(me, peerId)
            const saved = await chatService.saveMessage({
                conversationId: conv._id,
                userId: me,
                text: trimmed
            })

            const room = "conv:" + String(conv._id)
            io.to(room).emit("message", saved)

            let destinataireId
            if(String(conv.userA) === String(me)) {
                destinataireId = String(conv.userB)
            }
            else {
                destinataireId = String(conv.userA)
            }

            io.to("user:" + destinataireId).emit("badge:maybe-update", { conversationId: String(conv._id)})
        }
        catch (err) {
            console.error("[socket message] erreur :", err)
        }
    })

    socket.on("deleted-message-notify", async ({ conversationId, messageId }) => {
        try {
            if(!conversationId) {
                return
            }
            const room = "conv:" + String(conversationId)
            io.to(room).emit("message-deleted", { _id: messageId })
        }
        catch (err) {
            console.error("[socket deleted-message-notify] erreur :", err)
        }
    })
}

module.exports = { chatHandlers }