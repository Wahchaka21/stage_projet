const Message = require("../schemas/Message")
const Member = require("../schemas/conversationMember")
const {isValideObjectId} = require("../utils/validator")
const persoError = require("../utils/error")

async function markAsRead(conversationId, userId, at = new Date()) {
    if(!isValideObjectId(conversationId)) {
        throw persoError("INVALID_ID", "conversationId invalide", { fields: { conversationId } })
    }
    const doc = await Member.findOneAndUpdate(
        { conversationId, userId },
        { $set: {lastReadAt: at } },
        { upsert: true, new: true }
    )
    return { ok: true, lastReadAt: doc.lastReadAt }
}

async function countPerConversation(userId, conversationIds) {
    if (!conversationIds || conversationIds.length === 0) {
        return { perConversation: {}, total: 0 }
    }

    const members = await Member.find({ userId, conversationId: { $in: conversationIds } })
    const mapLast = new Map(members.map(m => [String(m.conversationId), m.lastReadAt]))

    const perConv = {}
    for (const convId of conversationIds) {
        const since = mapLast.get(String(convId)) || new Date(0)
        const n = await Message.countDocuments({
            conversationId: convId,
            at: { $gt: since },
            userId: { $ne: userId }
        })
        perConv[String(convId)] = n
    }
    const total = Object.values(perConv).reduce((a, b) => a + b, 0)
    return { perConversation: perConv, total }
}

module.exports = {
    markAsRead,
    countPerConversation
}