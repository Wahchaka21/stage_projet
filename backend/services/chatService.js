const conversation = require("../schemas/Conversation")
const message = require("../schemas/Message")
const persoError = require("../utils/error")
const { isValideObjectId } = require("../utils/validator")
const { getOrCreateConversation } = require("../utils/conversation")
const photoSchema = require("../schemas/photoSchema")
const fs = require("fs")
const path = require("path")
const videoSchema = require("../schemas/videoSchema")

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

async function deleteMessage(messageId, userId, isAdmin = false) {
    try {
        if(!isValideObjectId(messageId)) {
            throw persoError("INVALID_ID", "ID de message invalide", { fields: { messageId } })
        }

        let filtre
        if(isAdmin === true) {
            filtre = { _id: messageId }
        }
        else {
            filtre = { _id: messageId, userId: String(userId) }
        }

        const cible = await message.findOne(filtre).lean()
        if(!cible) {
            throw persoError("NOT_FOUND", "le message n'a pas ete trouve", { fields: { messageId } })
        }

        const deleted = await message.deleteOne(filtre)
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

async function modifyMessage(messageId, userId, nouveauTexte) {
    try {
        if (!isValideObjectId(messageId)) {
            throw persoError("INVALID_ID", "ID de message invalide", { fields: { messageId } })
        }

        const type = typeof nouveauTexte
        if (type !== "string" && type !== "number") {
            throw persoError("VALIDATION_ERROR", "Texte invalide", { fields: { text: "string attendu" } })
        }
        let texte
        if (type === "number") {
            texte = String(nouveauTexte)
        }
        else {
            texte = nouveauTexte
        }
        texte = texte.trim()

        if (texte.length === 0) {
            throw persoError("VALIDATION_ERROR", "Le message ne peut pas être vide", { fields: { text: "vide" } })
        }

        if (texte.length > 5000) {
            throw persoError("VALIDATION_ERROR", "Le message dépasse 5000 caractères", { fields: { max: 5000 } })
        }

        const filtre = { _id: messageId, userId: userId }
        const cible = await message.findOne(filtre).lean()

        if (!cible) {
            throw persoError("NOT_FOUND", "Message introuvable (ou non autorisé)", { fields: { messageId } })
        }

        const maj = await message
        .findOneAndUpdate(
            filtre,
            { $set: { text: texte } },
            { new: true, runValidators: true }
        )
        .lean()

        if (!maj) {
            throw persoError("DB_ERROR", "La modification du message n'a pas abouti")
        }

        let atOut = maj.at

        if (maj.at instanceof Date) {
            atOut = maj.at.toISOString()
        } 
        else {
            const tmp = new Date(maj.at)
            if(isNaN(tmp.getTime())) {
                atOut = new Date().toISOString()
            }
            else {
                atOut = tmp.toISOString()
            }
        }

        let updatedAtOut
        if(maj.updatedAt instanceof Date) {
            updatedAtOut = maj.updatedAt.toISOString()
        }
        else{
            if(maj.updatedAt) {
                const tmp2 = new Date(maj.updatedAt)
                if(isNaN(tmp2.getTime())) {
                    updatedAtOut = undefined
                }
                else {
                    updatedAtOut = tmp2.toISOString()
                }
            }
            else {
                updatedAtOut = undefined
            }
        }

        return {
            _id: String(maj._id),
            conversationId: String(maj.conversationId),
            userId: String(maj.userId),
            text: maj.text,
            at: atOut,
            updatedAt: updatedAtOut
        }
    }
    catch (err) {
        if (err && err.code) {
            throw err
        }
        throw persoError("DB_ERROR", "Erreur lors de la modification du message")
    }
}

async function uploadPhoto(photoData) {
    try {
        return await photoSchema.create(photoData)
    }
    catch (err) {
        if (err.name === "ValidationError") {
            const fields = {}
            for (let key in err.errors) {
                fields[key] = err.errors[key].message
            }

            throw persoError("VALIDATION_ERROR", "Erreur validation upload photo", { fields })
        }

        throw persoError("DB_ERROR", "erreur upload photo", { original: err.message })
    }
}

async function deletePhoto(photoId) {
    try {
        if (!photoId || !isValideObjectId(photoId)) {
            console.warn('[chatService.deletePhoto] identifiant invalide ou manquant :', photoId)
            return null
        }

        const photo = await photoSchema.findById(photoId)
        if (!photo) {
            console.warn('[chatService.deletePhoto] photo introuvable pour', photoId)
            return null
        }

        let filename
        try {
            const urlObj = new URL(photo.url)
            filename = path.basename(urlObj.pathname)
        }
        catch (parseErr) {
            filename = path.basename(photo.url)
        }

        const filePath = path.join(
            __dirname,
            '..',
            'uploads',
            'photos',
            filename
        )

        const deleted = await photoSchema.findByIdAndDelete(photoId)

        if (deleted) {
            try {
                await fs.promises.unlink(filePath)
            }
            catch (fileErr) {
                if (fileErr.code !== 'ENOENT') {
                    console.warn('[chatService.deletePhoto] impossible de supprimer le fichier :', filePath)
                    console.warn('[chatService.deletePhoto] raison :', fileErr.message)
                }
            }
        }

        return deleted
    }
    catch (err) {
        if (err?.type) {
            throw err
        }
        throw persoError('DB_ERROR', 'Erreur suppression de la photo', { original: err.message })
    }
}

async function uploadVideo(videoData) {
    try {
        return await videoSchema.create(videoData)
    }
    catch(err) {
        if (err.name === "ValidationError") {
            const fields = {}
            for(let key in err.errors) {
                fields[key] = err.errors[key].message
            }

            throw persoError("VALIDATION_ERROR", "Erreur validation upload video", { fields })
        }

        throw persoError("DB_ERROR", "erreur upload video", { original: err.message })
    }
}

async function deleteVideo(videoId) {
    try {
        if(!videoId || !isValideObjectId(videoId)) {
            console.warn("[chatService.deleteVideo] indentifiant invalide ou manquant :", videoId)
            return null
        }

        const video = await videoSchema.findById(videoId)
        if(!video) {
            console.warn("[chatService.deleteVideo] video introuvable pour", videoId)
            return null
        }

        let filename
        try {
            const urlObj = new URL(video.url)
            filename = path.basename(urlObj.pathname)
        }
        catch (parseErr) {
            filename = path.basename(video.url)
        }
        
        const filePath = path.join(
            __dirname,
            "..",
            "uploads",
            "videos",
            filename
        )

        const deleted = await videoSchema.findByIdAndDelete(videoId)
        if(deleted) {
            try {
                await fs.promises.unlink(filePath)
            }
            catch (fileErr) {
                if (fileErr.code !== "ENOENT") {
                    console.warn("[chatService.deleteVideo] impossible de supprimer le fichier :", filePath)
                    console.warn("[chatService.deleteVideo] raison :", fileErr.message)
                }
            }
        }

        return deleted
    }
    catch (err) {
        if (err?.type) {
            throw err
        }
        throw persoError("DB_ERROR", "Erreur de suppression de la video", { original: err.message})
    }
}

module.exports = {
    listMessages,
    saveMessage,
    getOrCreateConversation,
    listMessagesBetween,
    deleteMessage,
    modifyMessage,
    uploadPhoto,
    deletePhoto,
    uploadVideo,
    deleteVideo
}