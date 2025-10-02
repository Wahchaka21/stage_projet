const planClientSchema = require("../schemas/planClient")
const { isValideObjectId } = require("../utils/validator")
const persoError = require("../utils/error")
const videoSchema = require("../schemas/videoSchema")

async function createPlanClient(planClientData) {
    try {
        return await planClientSchema.create(planClientData)
    }
    catch (err) {
        if (err && (err.name === "ValidationError" || err.name === "CastError")) {
            const fields = {}
            if (err.errors) {
                for (const key in err.errors) {
                fields[key] = err.errors[key].message
                }
            }
            throw persoError("VALIDATION_ERROR", "Erreur validation création du plan client", { fields })
        }
        throw persoError("DB_ERROR", "Erreur de création de plan client", { original: err && err.message })
    }
}

async function deletePlanClient(planClientId) {
    try {
        if (!planClientId || !isValideObjectId(planClientId)) {
            console.warn("planClient.deletePlanClient identifiant invalide ou manquant :", planClientId)
            return null
        }

        const found = await planClientSchema.findById(planClientId)
        if (!found) {
            console.warn("planClient.deletePlanClient introuvable pour", planClientId)
            return null
        }

        const deleted = await planClientSchema.findByIdAndDelete(planClientId)
        return deleted
    }
    catch (err) {
        if (err && err.type) {
            throw err
        }
        throw persoError("DB_ERROR", "Erreur suppression du plan client", { original: err && err.message })
    }
}

async function listPlanClientForClient(clientId) {
    try {
        if (!clientId || !isValideObjectId(clientId)) {
            throw persoError("INVALID_ID", "Identifiant client invalide")
        }
        return await planClientSchema.find({ sharedWithClientId: clientId }).sort({ createdAt: -1 }).lean()
    }
    catch (err) {
        if (err && err.type) {
            throw err
        }
        throw persoError("DB_ERROR", "Erreur lors de la lecture des plans clients", { original: err && err.message })
    }
}

async function listPlanClientForUser(userId) {
    try {
        if (!userId || !isValideObjectId(userId)) {
            throw persoError("INVALID_ID", "Identifiant utilisateur invalide")
        }

        return await planClientSchema.find({ sharedWithClientId: userId }).sort({ createdAt: -1 }).lean()
    }
    catch (err) {
        if (err && err.type) {
            throw err
        }
        throw persoError("DB_ERROR", "Erreur lors de la lecture des plans clients", { original: err && err.message })
    }
}

async function attachVideo(planClientId, videoId) {
    try {
        if(!planClientId || !isValideObjectId(planClientId)) {
            throw persoError("INVALID_ID", "Identifiant plan client invalide", { planClientId })
        }
        
        if(!videoId || !isValideObjectId(videoId)) {
            throw persoError("INVALID_ID", "Identifiant vidéo invalide", { videoId })
        }

        const plan = await planClientSchema.findById(planClientId)
        if(!plan) {
            throw persoError("NOT_FOUND", "Plan client introuvrable", { planClientId })
        }

        const video = await videoSchema.findById(videoId).lean()
        if(!video) {
            throw persoError("NOT_FOUND", "Vidéo introuvable", { videoId })
        }

        const entry = {
            videoId: video._id,
            url: video.url,
            name: video.name,
            size: video.size,
            format: video.format,
            duration: video.videoDuration
        }

        const updated = await planClientSchema.findByIdAndUpdate(
            planClientId,
            { $push: { videos: entry } },
            { new: true }
        ).lean()

        return updated
    }
    catch (err) {
        if(err && err.type) {
            throw err
        }
        throw persoError("DB_ERROR", "Erreur lors de l'upload de la video", { original: err && err.message })
    }
}

async function detachVideo(planClientId, videoId) {
    try {
        if(!planClientId || !isValideObjectId(planClientId)) {
            throw persoError("INVALID_ERROR", "Identifiant plan client invalide", { planClientId })
        }
        if(!videoId || !isValideObjectId(videoId)) {
            throw persoError("INVALID_VIDEO", "Identifiant video invalide", { videoId })
        }

        const updated = await planClientSchema.findByIdAndUpdate(
            planClientId,
            { $pull: { videos: { videoId: videoId } } },
            { new: true }
        ).lean()

        if(!updated) {
            throw persoError("NOT_FOUND", "Plan client introuvable", { planClientId })
        }

        return updated
    }
    catch(err) {
        if(err && err.type) {
            throw err
        }
        throw persoError("DB_ERROR", "Erreur lors du retrait video du plan", { original: err && err.message })
    }
}

module.exports = {
    createPlanClient,
    deletePlanClient,
    listPlanClientForClient,
    listPlanClientForUser,
    attachVideo,
    detachVideo
}