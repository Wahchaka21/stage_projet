const planClientService = require("../services/planClientService")

async function handleGetMyPlanClient(req, res) {
    try {
        const me = req.user
        if (!me || !me._id) {
            return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Auth requise" } })
        }

        const data = await planClientService.listPlanClientForClient(String(me._id))
        return res.status(200).json({ data: data })
    }
    catch (err) {
        if (err && err.code === "INVALID_ID") {
            return res.status(400).json({ error: { code: err.code, message: err.message, ...err.meta } })
        }
        if (err && err.code === "NOT_FOUND") {
            return res.status(404).json({ error: { code: err.code, message: err.message, ...err.meta } })
        }
        if (err && err.code === "DB_ERROR") {
            return res.status(500).json({ error: { code: err.code, message: err.message, ...err.meta } })
        }
        console.error("handleGetMyPlanClient erreur inattendue :", err)
        return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erreur interne" } })
    }
}

async function handleGetPlanClientForUser(req, res) {
    try {
        const me = req.user
        if (!me || me.role !== "admin") {
            return res.status(403).json({ error: { code: "FORBIDDEN", message: "Accès admin requis" } })
        }

        const userId = req.params.userId
        const data = await planClientService.listPlanClientForUser(String(userId))

        const items = []
        if (Array.isArray(data)) {
            for (let i = 0; i < data.length; i++) {
                const x = data[i]

                let contenu = ""
                if (x && x.contenu) {
                    contenu = String(x.contenu)
                }

                let userIdValue = ""
                if (x && x.sharedWithClientId) {
                    userIdValue = String(x.sharedWithClientId)
                }

                items.push({
                    _id: String(x._id),
                    contenu: contenu,
                    userId: userIdValue
                })
            }
        }

        return res.status(200).json({ items: items })
    }
    catch (err) {
        if (err && err.code === "INVALID_ID") {
            return res.status(400).json({ error: { code: err.code, message: err.message, ...err.meta } })
        }
        if (err && err.code === "NOT_FOUND") {
            return res.status(404).json({ error: { code: err.code, message: err.message, ...err.meta } })
        }
        if (err && err.code === "DB_ERROR") {
            return res.status(500).json({ error: { code: err.code, message: err.message, ...err.meta } })
        }
        console.error("handleGetPlanClientForUser erreur inattendue :", err)
        return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erreur interne" } })
    }
}

module.exports = {
    handleGetMyPlanClient,
    handleGetPlanClientForUser
}