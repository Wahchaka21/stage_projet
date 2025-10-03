const planClientService = require("../services/planClientService")

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

    out.videos = []
    if (doc && Array.isArray(doc.videos)) {
        for (const v of doc.videos) {
            const it = {}
            if (v && v.videoId) {
                it.videoId = String(v.videoId)
            } 
            else {
                it.videoId = ""
            }
            if (v && v.url) {
                it.url = String(v.url)
            } 
            else {
                it.url = ""
            }
            if (v && v.name) {
                it.name = String(v.name)
            } 
            else {
                it.name = ""
            }
            if (v && typeof v.size === "number") {
                it.size = v.size
            } 
            else {
                it.size = 0
            }
            if (v && v.format) {
                it.format = String(v.format)
            } 
            else {
                it.format = ""
            }
            if (v && typeof v.duration === "number") {
                it.duration = v.duration
            }
            else {
                it.duration = 0
            }
            out.videos.push(it)
        }
    }

    return out
}

async function handleCreatePlanClient(req, res) {
    try {
        const me = req.user
        if (!me || me.role !== "admin") {
            return res.status(403).json({ error: { code: "FORBIDDEN", message: "Accès admin requis" } })
        }

        const body = req.body || {}
        let sharedWithClientId
        if (body && body.sharedWithClientId) {
            sharedWithClientId = String(body.sharedWithClientId)
        }
        else {
            sharedWithClientId = ""
        }
        let contenu
        if (body && body.contenu) {
            contenu = String(body.contenu)
        }
        else {
            contenu = ""
        }
        let title
        if (body && body.title) {
            title = String(body.title)
        }
        else {
            title = ""
        }

        if (!sharedWithClientId) {
            return res.status(400).json({ error: { code: "BAD_REQUEST", message: "sharedWithClientId requis" } })
        }
        if (!contenu || !contenu.trim()) {
            return res.status(400).json({ error: { code: "BAD_REQUEST", message: "contenu requis" } })
        }

        const created = await planClientService.createPlanClient({
            userId: String(me._id),
            sharedWithClientId,
            contenu,
            title,
        })

        return res.status(201).json({ item: mapPlan(created) })
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
        console.error("handleCreatePlanClient erreur inattendue :", err)
        return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erreur interne" } })
    }
}

async function handleGetMyPlanClient(req, res) {
    try {
        const me = req.user
        if (!me || !me._id) {
            return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Auth requise" } })
        }

        const from = req.query.from
        const to = req.query.to

        const data = await planClientService.listPlanClientForClient(String(me._id), { from, to })
        const items = []
        if (Array.isArray(data)) {
            for (const x of data) {
                items.push(mapPlan(x))
            }
        }

        return res.status(200).json({ items })
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
        const from = req.query.from
        const to = req.query.to

        const data = await planClientService.listPlanClientForUser(String(userId), { from, to })
        const items = []
        if (Array.isArray(data)) {
            for (const x of data) {
                items.push(mapPlan(x))
            }
        }

        return res.status(200).json({ items })
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

async function handleAttachVideoToPlan(req, res) {
    try {
        const me = req.user
        if (!me || me.role !== "admin") {
            return res.status(403).json({ error: { code: "FORBIDDEN", message: "Accès admin requis" } })
        }

        const planClientId = req.params.planClientId
        const bodyVideoId = req.body && req.body.videoId ? String(req.body.videoId) : ""

        if (!bodyVideoId) {
            return res.status(400).json({ error: { code: "BAD_REQUEST", message: "videoId requis" } })
        }

        const updated = await planClientService.attachVideo(String(planClientId), String(bodyVideoId))
        const item = mapPlan(updated)

        return res.status(200).json({ item })
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
        console.error("handleAttachVideoToPlan erreur inattendue :", err)
        return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erreur interne" } })
    }
}

async function handleDetachVideoFromPlan(req, res) {
    try {
        const me = req.user
        if (!me || me.role !== "admin") {
            return res.status(403).json({ error: { code: "FORBIDDEN", message: "Accès admin requis" } })
        }

        const planClientId = req.params.planClientId
        const videoId = req.params.videoId

        const updated = await planClientService.detachVideo(String(planClientId), String(videoId))
        const item = mapPlan(updated)

        return res.status(200).json({ item })
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
        console.error("handleDetachVideoFromPlan erreur inattendue :", err)
        return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erreur interne" } })
    }
}

module.exports = {
    handleCreatePlanClient,
    handleGetMyPlanClient,
    handleGetPlanClientForUser,
    handleAttachVideoToPlan,
    handleDetachVideoFromPlan
}
