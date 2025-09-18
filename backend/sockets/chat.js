const { getOrCreateConversation } = require("../services/chatService");
const Message = require("../schemas/Message");

function registerChatNamespace(io) {
  io.on('connection', (socket) => {
    const me = socket.user
    if (!me) {
      socket.disconnect()
      return
    }

    socket.on('join', async (payload) => {
      try {
        let peerId = null
        if (payload && payload.peerId) {
          peerId = String(payload.peerId)
        }

        if (!peerId) {
          return
        }

        const conv = await getOrCreateConversation(me._id, peerId)

        const roomName = 'conv:' + String(conv._id)

        try {
          socket.leaveAll()
        } 
        catch (err) {
          console.error(err)
        }

        socket.join(roomName)
        socket.emit('system', { joined: roomName })
      } 
      catch (err) {
        console.error(err)
      }
    })

    socket.on('message', async (payload) => {
      try {
        let peerId = null
        let text = ""

        if (payload && payload.peerId) {
          peerId = String(payload.peerId)
        }

        if (payload && payload.text) {
          text = String(payload.text).trim()
        }

        if (!peerId) {
          return
        }
        if (text.length === 0) {
          return
        }

        const conv = await getOrCreateConversation(me._id, peerId)

        const msgDoc = await Message.create({
          conversationId: conv._id,
          userId: me._id,
          text: text,
          at: new Date(),
        })

        await conv.updateOne({ $set: { lastMessageAt: msgDoc.at } })

        const roomName = 'conv:' + String(conv._id)

        const out = {
          _id: String(msgDoc._id),
          conversationId: String(conv._id),
          userId: String(me._id),
          text: msgDoc.text,
          at: msgDoc.at,
        }

        io.to(roomName).emit('message', out)
      } 
      catch (err) {
        console.error(err)
      }
    })
  })
}

module.exports = { registerChatNamespace }