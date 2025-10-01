const rdvService = require("../services/rdvService")

async function handleGetMyRdvs(req, res) {
    try {
        const me = req.user
        if(!me?._id) {
            return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Auth requise" } })
        }

        const {from, to} = req.query
        const data = await rdvService.listRdvsForClient(String(me._id), {from, to})

        return res.status(200).json({ data })
    }
    catch(err) {
        if (err && err.code === "INVALID_ID") {
            return res.status(400).json({ error: {code: err.code, message: err.message, ...err.meta }})
        }

        if (err && err.code === "NOT_FOUND") {
            return res.status(404).json({error: {code: err.code, message: err.message, ...err.meta}})
        }

        if (err && err.code ==="DB_ERROR") {
            return res.status(500).json({error: {code: err.code, message: err.message, ...err.meta}})
        }

        console.error("handleGetMyRdvs erreur inattendue :", err)
        return res.status(500).json({ error: {code: "INTERNAL_ERROR", message: "Erreur interne"}})
    }
}

async function handleGetRdvsForUser(req, res) {
    try {
        const me = req.user
        if(!me || me.role !== "admin") {
            return res.status(403).json({ error: { code: "FORBIDDEN", message: "Accès admin requis" } })
        }

        const {userId} = req.params
        const {from, to} = req.query
        const data = await rdvService.listRdvsForUser(String(userId), {from, to})

        const items = (data || []).map(x => {
            let at = ""
            if (x.date) {
                at = new Date(x.date).toISOString()
            }
            else {
                at = ""
            }

            let userIdValue = ""
            if (x.sharedWithClientId) {
                userIdValue = String(x.sharedWithClientId)
            }
            else {
                userIdValue = ""
            }

            return {
                _id: String(x._id),
                at,
                description: x.description || "",
                userId: userIdValue
            }
        })

        return res.status(200).json({ items })
    }
    catch(err) {
        if (err && err.code === "INVALID_ID") {
            return res.status(400).json({ error: {code: err.code, message: err.message, ...err.meta }})
        }

        if (err && err.code === "NOT_FOUND") {
            return res.status(404).json({error: {code: err.code, message: err.message, ...err.meta}})
        }

        if (err && err.code ==="DB_ERROR") {
            return res.status(500).json({error: {code: err.code, message: err.message, ...err.meta}})
        }

        console.error("handleGetRdvsForUser erreur inattendue :", err)
        return res.status(500).json({ error: {code: "INTERNAL_ERROR", message: "Erreur interne"}})
    }
}

module.exports = {
    handleGetMyRdvs,
    handleGetRdvsForUser
}