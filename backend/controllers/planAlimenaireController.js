const planAlimentaireService = require("../services/planAlimentaireService")

function mapPlan(doc) {
    const out = {}

    if (doc && doc._id) {
        out._id = String(doc._id)
    } 
    else {
        out._id = ""
    }

    if (doc && doc.contenu) {
        out.contenu = String(doc.contenu)
    } 
    else {
        out.contenu = ""
    }

    if (doc && doc.userId) {
        out.userId = String(doc.userId)
    } 
    else {
        out.userId = ""
    }

    if (doc && doc.sharedWithClientId) {
        out.sharedWithClientId = String(doc.sharedWithClientId)
    } 
    else {
        out.sharedWithClientId = ""
    }

    if (doc && doc.title) {
        out.title = String(doc.title)
    } 
    else {
        out.title = ""
    }

    if (doc && doc.createdAt) {
        try {
            out.createdAt = new Date(doc.createdAt).toISOString()
        } 
        catch {
            out.createdAt = null
        }
    } 
    else {
        out.createdAt = null
    }

    return out
}

async function handleCreatePlanAlimentaire(req, res) {
    try {
        const me = req.user
        if(!me || me.role !== "admin") {
            return res.status(403).json({
                error : { 
                    code: "FORBIDDEN",
                    message: "Accès admin requis"
                }
            })
        }

        const body = req.body || {}
        let sharedWithClientId

        if(body && body.sharedWithClientId) {
            sharedWithClientId = String(body.sharedWithClientId)
        }
        else {
            sharedWithClientId = ""
        }

        let contenu

        if(body && body.contenu) {
            contenu = String(body.contenu)
        }
        else {
            contenu = ""
        }

        let title

        if(body && body.title) {
            title = String(body.title)
        }
        else {
            title = ""
        }

        if(!sharedWithClientId) {
            return res.status(400).json({
                error: {
                    code: "BAD_REQUEST",
                    message: "sharedWithClientId requis"
                }
            })
        }

        if(!contenu || !contenu.trim()) {
            return res.status(400).json({
                error: {
                    code: "BAD_REQUEST",
                    message: "contenu requis"
                }
            })
        }

        const created = await planAlimentaireService.createPlanAlimentaire({
            userId: String(me._id),
            sharedWithClientId,
            contenu,
            title
        })

        return res.status(201).json({
            item: mapPlan(created)
        })
    }
    catch (err) {
        if (err && err.code === "VALIDATION_ERROR") {
            return res.status(400).json({ error: { code: err.code, message: err.message, ...err.meta } })
        }
        if (err && err.code === "NOT_FOUND") {
            return res.status(404).json({ error: { code: err.code, message: err.message, ...err.meta } })
        }
        if (err && err.code === "DB_ERROR") {
            return res.status(500).json({ error: { code: err.code, message: err.message, ...err.meta } })
        }
        console.error("\"handleCreatePlanAlimentaire\" erreur inattendue :", err)
        return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erreur interne" } })
    }
}

async function handleDeletePlanAlimenaire(req, res) {
    try {
        const { planAlimentaireId } = req.params

        const result = await planAlimentaireService.deletePlanAlimentaire(planAlimentaireId)
        if(!result) {
            return res.status(404).json({
                error: {
                    code: "NOT_FOUND",
                    message: "\"Plan alimentaire\" introuvable."
                }
            })
        }

        res.status(200).json({
            message: "\"plan alimenaire\" supprimer.",
            data: result
        })
    }
    catch(err) {
        if (err && err.code === "VALIDATION_ERROR") {
            return res.status(400).json({ error: { code: err.code, message: err.message, ...err.meta } })
        }
        if (err && err.code === "NOT_FOUND") {
            return res.status(404).json({ error: { code: err.code, message: err.message, ...err.meta } })
        }
        if (err && err.code === "DB_ERROR") {
            return res.status(500).json({ error: { code: err.code, message: err.message, ...err.meta } })
        }
        console.error("\"handleDeletePlanAlimentaire\" erreur inattendue :", err)
        return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erreur interne" } })
    }
}

async function handleGetMyPlanAlimentaire(req, res) {
    try {
        const me = req.user
        if(!me || me._id) {
            return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Auth requise" } })
        }

        const from = req.query.from
        const to = req.query.to

        const data = await planAlimentaireService.listPlanAlimentaireForClient(String(me._id), { from, to })
        const items = []
        if(Array.isArray(data)) {
            for (const x of data) {
                items.push(mapPlan(x))
            }
        }

        return res.status(200).json({
            items
        })
    }
    catch (err) {
        if (err && err.code === "VALIDATION_ERROR") {
            return res.status(400).json({ error: { code: err.code, message: err.message, ...err.meta } })
        }
        if (err && err.code === "NOT_FOUND") {
            return res.status(404).json({ error: { code: err.code, message: err.message, ...err.meta } })
        }
        if (err && err.code === "DB_ERROR") {
            return res.status(500).json({ error: { code: err.code, message: err.message, ...err.meta } })
        }
        console.error("handleGetMyPlanAlimentaire erreur inattendue :", err)
        return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erreur interne" } })
    }
}

async function handleGetPlanAlimentaireForUser(req, res) {
    try {
        const me = req.user
        if(!me || me.role !== "admin") {
            return res.status(403).json({ error: { code: "FORBIDDEN", message: "Accès admin requis" } })
        }

        const userId = req.params.userId
        const from = req.query.from
        const to = req.query.to

        const data = await planAlimentaireService.listPlanAlimentaireForUser(String(userId), { from, to })
        const items = []
        if(Array.isArray(data)) {
            for(const x of data) {
                items.push(mapPlan(x))
            }
        }

        return res.status(200).json({ items })
    }
    catch(err) {
        if (err && err.code === "VALIDATION_ERROR") {
            return res.status(400).json({ error: { code: err.code, message: err.message, ...err.meta } })
        }
        if (err && err.code === "NOT_FOUND") {
            return res.status(404).json({ error: { code: err.code, message: err.message, ...err.meta } })
        }
        if (err && err.code === "DB_ERROR") {
            return res.status(500).json({ error: { code: err.code, message: err.message, ...err.meta } })
        }
        console.error("handleGetPlanAlimentaireForUser erreur inattendue :", err)
        return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erreur interne" } })
    }
}

async function handleUpdatePlanAlimentaire(req, res) {
    try {
        const me = req.user
        if(!me || me.role !== "admin") {
            return res.status(403).json({ error: { code: "FORBIDDEN", message: "Acces admin requis" } })
        }

        let planAlimentaireId
        if(req.params && req.params.planAlimentaireId) {
            planAlimentaireId = String(req.params.planAlimentaireId)
        }
        else {
            planAlimentaireId = ""
        }

        if(!planAlimentaireId) {
            return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Identifiant \"plan alimentaire\" requis" } })
        }

        const body = req.body || {}

        let titleProvided = false
        let titleValue = ""
        if(body && Object.prototype.hasOwnProperty.call(body, "title")) {
            if(typeof body.title === "string") {
                titleProvided = true
                titleValue = String(body.title)
            }
            else if(body.title === null || body.title === undefined) {
                titleProvided = true
                titleValue = ""
            }
            else {
                return res.status(400).json({ error: { code: "BAD_REQUEST", message: "title doit etre une chaine" } })
            }
        }
        
        let contenuProvided = false
        let contenuValue = ""
        if(body && Object.prototype.hasOwnProperty.call(body, "contenu")) {
            if(typeof body.contenu === "string") {
                contenuProvided = true
                contenuValue = String(body.contenu)
            }
            else if(body.contenu === null || body.contenu === undefined) {
                contenuProvided = true
                contenuValue = ""
            }
            else {
                return res.status(400).json({ error: { code: "BAD_REQUEST", message: "contenu doit être une chaîne" } })
            }
        }
        
        const patch = {}
        if(titleProvided) {
            patch.title = titleValue
        }
        if(contenuProvided) {
            patch.contenu = contenuValue
        }
        
        if(Object.keys(patch).length === 0) {
            return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Aucune modification fournie" } })
        }
        
        const updated = await planAlimentaireService.updatePlanAlimentaire(
            String(planAlimentaireId),
            String(me._id),
            patch
        )
        
        return res.status(200).json({
            item: mapPlan(updated)
        })
    }
    catch (err) {
        if (err && err.code === "VALIDATION_ERROR") {
            return res.status(400).json({ error: { code: err.code, message: err.message, ...err.meta } })
        }
        if (err && err.code === "NOT_FOUND") {
            return res.status(404).json({ error: { code: err.code, message: err.message, ...err.meta } })
        }
        if (err && err.code === "DB_ERROR") {
            return res.status(500).json({ error: { code: err.code, message: err.message, ...err.meta } })
        }
        console.error("handleUpdatePlanAlimentaire erreur inattendue :", err)
        return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erreur interne" } })
    }
}

module.exports = {
    handleCreatePlanAlimentaire,
    handleDeletePlanAlimenaire,
    handleGetMyPlanAlimentaire,
    handleGetPlanAlimentaireForUser,
    handleUpdatePlanAlimentaire
}