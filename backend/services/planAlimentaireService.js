const rubriqueSchema = require("../schemas/rubriqueSchema")
const { isValideObjectId } = require("../utils/validator")
const persoError = require("../utils/error")

async function createPlanAlimentaire(planAliementaireData) {
    try {
        return await rubriqueSchema.create(planAliementaireData)
    }
    catch(err){
        if(err &&(err.name === "ValidationError" || err.name === "CastError")){
            const fields = {}
            if(err.errors) {
                for(const key in err.errors){
                    fields[key] = err.errors[key].message
                }
            }
            throw persoError("VALIDATION_ERROR", "Erreur validation création d'un plan alimentaire.", { fields })
        }
        throw persoError("DB_ERROR", "Erreur de création d'un plan alimentaire.", { original: err && err.message })
    }
}

async function deletePlanAlimentaire(planAlimentaireId) {
    try {
        if(!planAlimentaireId || !isValideObjectId(planAlimentaireId)) {
            console.warn("\"PlanAlimentaireService.deletePlanAlimentaire\" identifiant invalide ou manquant :", planAlimentaireId + ".")
            return null
        }

        const found = await rubriqueSchema.findById(planAlimentaireId)
        if(!found){
            console.warn("\"planAlimentaireService.deletePlanAlimentaire\" introuvable pour " + planAlimentaireId + ".")
            return null
        }

        const deleted = await rubriqueSchema.findByIdAndDelete(planAlimentaireId)
        return deleted
    }
    catch(err){
        if(err && err.type){
            throw err
        }
        throw persoError("DB_ERROR", "Erreur suppression du \"plan alimentaire\".", { original: err && err.message })
    }
}

function makeDateFilter(opts){
    if(!opts){
        return null
    }

    const filter = {}

    if(opts.from){
        const fromDate = new Date(opts.from)
        if(!Number.isNaN(fromDate.getTime())) {
            filter.$gte = fromDate
        }
    }

    if(opts.to){
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

async function listPlanAlimentaireForClient(clientId, opts) {
    try {
        if(!clientId || !isValideObjectId(clientId)) {
            throw persoError("INVALID_ID", "Identifiant client invalide.")
        }

        const filter = { sharedWithClientId: clientId }
        const createdAt = makeDateFilter(opts)

        if(createdAt){
            filter.createdAt = createdAt
        }

        return await rubriqueSchema
            .find(filter)
            .sort({ createdAt: 1 })
            .lean()
    }
    catch(err){
        if(err && err.type){
            throw err
        }
        throw persoError("DB_ERROR", "Erreur lors de la lecture du \"plan alimentaire\".", { original: err && err.message })
    }
}

async function listPlanAlimentaireForUser(userId, opts){
    try {
        if(!userId || !isValideObjectId(userId)){
            throw persoError("INVALID_ID", "Identifiant utilisateur invalide")
        }

        const filter = { sharedWithClientId: userId }
        const createdAt = makeDateFilter(opts)

        if(createdAt) {
            filter.createdAt = createdAt
        }

        return await rubriqueSchema
            .find(filter)
            .sort({ createdAt: 1 })
            .lean()
    }
    catch(err) {
        if(err && err.type) {
            throw err
        }
        throw persoError("DB_ERROR", "Erreur lors de la leture des plans clients", { original: err && err.message })
    }
}

async function updatePlanAlimentaire(planAlimentaireId, coachId, patch) {
    try {
        if(!planAlimentaireId || !isValideObjectId(planAlimentaireId)) {
            throw persoError("INVALID_ID", "Identifiant du \"plan alimentaire\" invalide.")
        }

        if(!coachId || !isValideObjectId(coachId)) {
            throw persoError("INVALID_ID", "Identifiant coach invalide.")
        }

        const data = {}
        if(typeof patch?.title === "string") {
            data.title = patch.title
        }

        if (typeof patch?.contenu === "string") {
            data.contenu = patch.contenu
        }
        
        if (Object.keys(data).length === 0) {
            throw persoError("NOT_VALID", "Aucune modification fournie")
        }

        const updated = await rubriqueSchema.findOneAndDelete(
            { _id: planAlimentaireId, userId: coachId },
            { $set: data },
            { new: true, runValidators: true}
        ).lean()

        if(!updated){
            throw persoError("NOT_FOUND", "\"Plan alimentaire\" introuvable ou non autorisée.")
        }

        return updated
    }
    catch (err) {
        if(err && (err.name === "ValidationError" || err.name === "CastError")) {
            const fields = {}
            if(err.errors) {
                for(const k in err.errors) fields[key] = err.errors[key].message
            }
            throw persoError("VALIDATION_ERROR", "Erreur validation mise à jour du plan alimentaire.", { fields })
        }

        if(err && err.type) {
            throw err
        }

        throw persoError("DB_ERROR", "Erreur mise à jour du plan alimentaire.", { original: err && err.message})
    }
}

module.exports = {
    createPlanAlimentaire,
    deletePlanAlimentaire,
    listPlanAlimentaireForClient,
    listPlanAlimentaireForUser,
    updatePlanAlimentaire
}