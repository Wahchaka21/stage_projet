const { roomForPair } = require("../utils/socketRooms")
const chatService = require("../services/chatService")

async function chatHandlers(io, socket) {
    const me = socket.data.userId

    socket.on("join", ({peerId})=>{
        if(!peerId) {
            return
        }
        const room = roomForPair(me, peerId)
        socket.join(room)
        socket.to(room).emit("system", {text: "Un participant a rejoint la conversation"})
    })

    socket.on("message", async({peerId, text})=>{
        if(!peerId || !text) {
            return
        }
        const room = roomForPair(me, peerId)

        const msg = {
            _id: Date.now().toString(),
            conversationId: room,
            userId: me,
            text: String(text),
            at: new Date().toISOString()
        }
        await chatService.saveMessage(msg)
        io.to(room).emit("message", msg)
    })
}

module.exports = { chatHandlers }