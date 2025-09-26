const rdvSchema = require("../schemas/rdv")
const { isValideObjectId } = require("../utils/validator")
const persoError = require("../utils/error")

async function createRdv(rdvData) {
    try {
        return await rdvSchema.create(rdvData)
    }
    catch(err) {
        if (err.name === "ValidationError" || err.name === "CastError") {
            const fields = {}
            for (let key in err.errors) {
                fields[key] = err.errors[key].message
            }

            throw persoError("VALIDATION_ERROR", "Erreur validation création de rendez-vous", { fields })
        }

        throw persoError("DB_ERROR", "Erreur de création de rendez-vous", { original: err.message })
    }
}

async function deleteRdv(rdvId) {
    try {
        if(!rdvId || !isValideObjectId(rdvId)) {
            console.warn("rdvService.deleteRdv identifant invalide ou manquand :", rdvId)
            return null
        }

        const rdv = await rdvSchema.findById(rdvId)
        if (!rdv) {
            console.warn("rdvService.deleteRdv rdv introuvable pour", rdvId)
            return null
        }

        const deleted = await rdvSchema.findByIdAndDelete(rdvId)
        return deleted
    }
    catch (err) {
        if (err?.type) {
            throw err
        }
        throw persoError("DB_ERROR", "Erreur suppression du rendez-vous", { original: err.message })
    }
}

async function listRdvsForClient(clientId, { from, to } = {}) {
    try {
        if (!clientId || !isValideObjectId(clientId)) {
            throw persoError("INVALID_ID", "Identifiant client invalide");
        }
        const filter = { sharedWithClientId: clientId };
        if (from || to) {
            filter.date = {}

            if (from) {
                filter.date.$gte = new Date(from)
            }

            if (to) {
                filter.date.$lte = new Date(to)
            }
        }
        return await rdvSchema.find(filter).sort({ date: 1 }).lean();
    } 
    catch (err) {
        if (err?.type) throw err
        throw persoError("DB_ERROR", "Erreur lors de la lecture des rendez-vous", { original: err.message })
    }
}

async function listRdvsForUser(userId, { from, to } = {}) {
    try {
        if (!userId || !isValideObjectId(userId)) {
            throw persoError("INVALID_ID", "Identifiant utilisateur invalide")
        }
        const filter = { userId }
        if (from || to) {
            filter.date = {}

            if (from) {
                filter.date.$gte = new Date(from)
            }

            if (to) {
                filter.date.$lte = new Date(to)
            }
        }
        return await rdvSchema.find(filter).sort({ date: 1 }).lean()
    } 
    catch (err) {
        if (err?.type) throw err
        throw persoError("DB_ERROR", "Erreur lors de la lecture des rendez-vous", { original: err.message })
    }
}

module.exports = {
    createRdv,
    deleteRdv,
    listRdvsForClient,
    listRdvsForUser
}