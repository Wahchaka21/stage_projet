const conversation = require("../schemas/Conversation")
const message = require("../schemas/Message")
const persoError = require("../utils/error")
const { isValideObjectId } = require("../utils/validator")
const { getOrCreateConversation } = require("../utils/conversation")

async function listMessages(conversationId, options = {}) {
    const result = []
    if (!conversationId) {
        return result
    }

    let limit = options.limit
    if (typeof limit !== "number" || isNaN(limit)) {
        limit = 50
    }
    if (limit <= 0) {
        limit = 50
    }
    if (limit > 100) {
        limit = 100
    }

    const findQuery = { conversationId }
    if (options.before) {
        const beforeDate = new Date(options.before)
        if (!isNaN(beforeDate.getTime())) {
            findQuery.at = { $lt: beforeDate }
        }
    }

    const docs = await message
        .find(findQuery)
        .sort({ at: 1 })
        .limit(limit)
        .lean()

    for (let i = 0; i < docs.length; i++) {
        const doc = docs[i]
        if (!doc) {
            continue
        }

        let atValue = doc.at
        if (doc.at instanceof Date) {
            atValue = doc.at.toISOString()
        } 
        else {
            const tmp = new Date(doc.at)
            if (!isNaN(tmp.getTime())) {
                atValue = tmp.toISOString()
            } else {
                atValue = new Date().toISOString()
            }
        }

        result.push({
            _id: String(doc._id),
            conversationId: String(doc.conversationId),
            userId: String(doc.userId),
            text: doc.text,
            at: atValue
        })
    }

    return result
}

async function saveMessage(doc) {
    if (!doc) {
        throw new Error("message payload manquant")
    }

    if (!doc.conversationId) {
        throw new Error("conversationId manquant")
    }

    if (!doc.userId) {
        throw new Error("userId manquant")
    }

    if (typeof doc.text !== "string") {
        throw new Error("texte invalide")
    }

    const trimmed = doc.text.trim()
    if (trimmed.length === 0) {
        throw new Error("texte vide")
    }

    let atValue = doc.at
    if (atValue) {
        const asDate = new Date(atValue)
        if (!isNaN(asDate.getTime())) {
            atValue = asDate
        } 
        else {
            atValue = new Date()
        }
    } 
    else {
        atValue = new Date()
    }

    const created = await message.create({
        conversationId: doc.conversationId,
        userId: doc.userId,
        text: trimmed,
        at: atValue
    })

    await conversation.findByIdAndUpdate(doc.conversationId, {
        lastMessageAt: atValue
    })

    let outAt = created.at
    if (created.at instanceof Date) {
        outAt = created.at.toISOString()
    } 
    else {
        const tmp = new Date(created.at)
        if (!isNaN(tmp.getTime())) {
            outAt = tmp.toISOString()
        } else {
            outAt = new Date().toISOString()
        }
    }

    return {
        _id: String(created._id),
        conversationId: String(created.conversationId),
        userId: String(created.userId),
        text: created.text,
        at: outAt
    }
}


async function listMessagesBetween(meId, peerId, limit, beforeDate) {
    const conv = await getOrCreateConversation(meId, peerId)

    let safeLimit = limit
    if (typeof safeLimit !== "number" || isNaN(safeLimit)) {
        safeLimit = 50
    }
    if (safeLimit <= 0) {
        safeLimit = 50
    }
    if (safeLimit > 100) {
        safeLimit = 100
    }

    const findQuery = { conversationId: conv._id }

    if (beforeDate instanceof Date && !isNaN(beforeDate.getTime())) {
        findQuery.at = { $lt: beforeDate }
    }

    const docs = await message
        .find(findQuery)
        .sort({ at: 1 })
        .limit(safeLimit)
        .lean()

    const result = []

    for (let i = 0; i < docs.length; i++) {
        const m = docs[i]
        if (!m) {
            continue
        }

        let atValue = m.at
        if (m.at instanceof Date) {
            atValue = m.at.toISOString()
        } 
        else {
            const tmp = new Date(m.at)
            if (!isNaN(tmp.getTime())) {
                atValue = tmp.toISOString()
            } 
            else {
                atValue = new Date().toISOString()
            }
        }

        result.push({
            _id: String(m._id),
            conversationId: String(m.conversationId),
            userId: String(m.userId),
            text: m.text,
            at: atValue
        })
    }

    return { conversationId: String(conv._id), messages: result }
}

async function deleteMessage(messageId) {
    try {
        if(!isValideObjectId(messageId)) {
            throw persoError("INVALID_ID", "ID de message invalide", { fields: { messageId } })
        }

        let filtre
        if(isAdmin === true) {
            filtre = { _id: messageId }
        }
        else {
            filtre = { _id: messageId, userId}
        }

        const cible = await message.findOne(filtre).lean()
        if(!cible) {
            throw persoError("NOT_FOUND", "le message n'a pas été trouvé", { fields: { messageId } })
        }

        const deleted = await message.deleteOne({ _id: messageId })
        if(!deleted || deleted.deletedCount !== 1) {
            throw persoError("DB_ERROR", "La suppression n'a pas abouti")
        }
        
        return { _id: String(messageId), conversationId: String(cible.conversationId) }
    }
    catch (err) {
        if (err && err.code) {
            throw err
        }

        throw persoError("DB_ERROR", "Erreur lors de la supression du message")
    }
}

module.exports = {
    listMessages,
    saveMessage,
    getOrCreateConversation,
    listMessagesBetween,
    deleteMessage
}