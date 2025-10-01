const planClientSchema = require("../schemas/planClient")
const { isValideObjectId } = require("../utils/validator")
const persoError = require("../utils/error")

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

module.exports = {
    createPlanClient,
    deletePlanClient,
    listPlanClientForClient,
    listPlanClientForUser
}