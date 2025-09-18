const conversation = require("../schemas/Conversation")

async function getOrCreateConversation(userA, userB) {
    const a = String(userA)
    const b = String(userB)

    let left
    let right

    if(a < b) {
        left = a
        right = b
    }
    else {
        left = b
        right = a
    }

    let conv = await conversation.findOne({ userA: left, userB: right })
    if(!conv) {
        conv = await conversation.create({ userA: left, userB: right, lastMessageAt: new Date() })
    }
    return conv
}

module.exports = { getOrCreateConversation }