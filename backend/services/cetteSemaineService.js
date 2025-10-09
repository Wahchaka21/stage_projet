
const cetteSemaineSchema = require("../schemas/cetteSemaineSchema")
const { isValideObjectId } = require("../utils/validator")
const persoError = require("../utils/error")

async function createCetteSemaine(cetteSemaineData) {
    try {
        return await cetteSemaineSchema.create(cetteSemaineData)
    }
    catch(err) {
        if(err && (err.name === "ValidationError" || err.name === "CastError")) {
            const fields = {}
            if(err.errors) {
                for(const key in err.errors) {
                    fields[key] = err.errors[key].message
                }
            }
            throw persoError("VALIDATION_ERROR", "Erreur validation création de \"cette semaine\"", {fields})
        }
        throw persoError("DB_ERROR", "Erreur de création de \"cette semaine\"", { original: err && err.message })
    }
}

async function deleteCetteSemaine(cetteSemaineId) {
    try {
        if(!cetteSemaineId || !isValideObjectId(cetteSemaineId)) {
            console.warn("cetteSemaineService.deleteCetteSemaine indentifiant invalide ou manquant :", cetteSemaineId)
            return null
        }

        const found = await cetteSemaineSchema.findById(cetteSemaineId)
        if(!found) {
            console.warn("cetteSemaineService.deleteCetteSemaine introuvalble pour", cetteSemaineId)
            return null
        }

        const deleted = await cetteSemaineSchema.findByIdAndDelete(cetteSemaineId)
        return deleted
    }
    catch(err) {
        if (err && err.type) {
            throw err
        }
        throw persoError("DB_ERROR", "Erreur suppression de \"cette semaine\"", { original: err && err.message})
    }
}


function makeDateFilter(opts) {
    if(!opts) {
        return null
    }

    const filter = {}

    if(opts.from) {
        const fromDate = new Date(opts.from)
        if(!Number.isNaN(fromDate.getTime())) {
            filter.$gte = fromDate
        }
    }

    if(opts.to) {
        const toDate = new Date(opts.to)
        if(!Number.isNaN(toDate.getTime())) {
            filter.$lte = toDate
        }
    }

    if(Object.keys(filter).length === 0) {
        return null
    }

    return filter
}

async function listCetteSemaineForClient(clientId, opts) {
    try {
        if(!clientId || !isValideObjectId(clientId)) {
            throw persoError("INVALID_ID", "Identifiant client invalide")
        }

        const filter = { sharedWithClientId: clientId }
        const createdAt = makeDateFilter(opts)

        if(createdAt) {
            filter.createdAt = createdAt
        }

        return await cetteSemaineSchema
            .find(filter)
            .sort({ createdAt: 1 })
            .lean()
    }
    catch (err) {
        if(err && err.type) {
            throw err
        }
        throw persoError("DB_ERROR", "Erreur lors de la lecture de \"cette semaine\"", { original: err && err.message })
    }
}

async function listCetteSemaineForUser(userId, opts) {
    try {
        if(!userId || !isValideObjectId(userId)) {
            throw persoError("INVALID_ID", "Identifiant utilisateur invalide")
        }

        const filter = { sharedWithClientId: userId }
        const createdAt = makeDateFilter(opts)

        if(createdAt) {
            filter.createdAt = createdAt
        }

        return await cetteSemaineSchema
            .find(filter)
            .sort({ createdAt: 1 })
            .lean()
    }
    catch(err) {
        if (err && err.type) {
            throw err
        }
        throw persoError("DB_ERROR", "Erreur lors de la lecture des plans clients", { original: err && err.message })
    }
}

async function updateCetteSemaine(cetteSemaineId, coachId, patch) {
    try {
        if (!cetteSemaineId || !isValideObjectId(cetteSemaineId)) {
            throw persoError("INVALID_ID", "Identifiant \"cette semaine\" invalide")
        }
        if (!coachId || !isValideObjectId(coachId)) {
            throw persoError("INVALID_ID", "Identifiant coach invalide")
        }

        const data = {}
        if (typeof patch?.title === "string") {
            data.title = patch.title
        }
        if (typeof patch?.contenu === "string") {
            data.contenu = patch.contenu
        }

        if (Object.keys(data).length === 0) {
            throw persoError("NOT_VALID", "Aucune modification fournie")
        }

        const updated = await cetteSemaineSchema.findOneAndUpdate(
            { _id: cetteSemaineId, userId: coachId },
            { $set: data },
            { new: true, runValidators: true }
        ).lean()

        if (!updated) {
            throw persoError("NOT_FOUND", "\"cette semaine\" introuvable ou non autorisée")
        }

        return updated
    }
    catch (err) {
        if (err && (err.name === "ValidationError" || err.name === "CastError")) {
            const fields = {}
            if (err.errors) {
                for (const k in err.errors) fields[k] = err.errors[k].message
            }
            throw persoError("VALIDATION_ERROR", "Erreur validation mise à jour de \"cette semaine\"", { fields })
        }
        if (err && err.type) {
            throw err
        }
        throw persoError("DB_ERROR", "Erreur mise à jour de \"cette semaine\"", { original: err && err.message })
    }
}

module.exports = {
    createCetteSemaine,
    deleteCetteSemaine,
    listCetteSemaineForClient,
    listCetteSemaineForUser,
    updateCetteSemaine
}