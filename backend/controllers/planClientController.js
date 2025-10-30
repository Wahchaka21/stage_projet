const planClientService = require("../services/planClientService")

function mapVideo(doc) {
    const out = { videoId: "", url: "", name: "", size: 0, format: "", duration: 0 }
    if (doc && doc.videoId) {
        out.videoId = String(doc.videoId)
    }
    if (doc && doc.url) {
        out.url = String(doc.url)
    }
    if (doc && doc.name) {
        out.name = String(doc.name)
    }
    if (doc && typeof doc.size === "number") {
        out.size = doc.size
    }
    if (doc && doc.format) {
        out.format = String(doc.format)
    }
    if (doc && typeof doc.duration === "number") {
        out.duration = doc.duration
    }
    return out
}

function mapExercise(doc) {
    const out = {
        _id: "",
        name: "",
        type: "",
        sets: 0,
        reps: 0,
        workSec: 0,
        restSec: 0,
        loadKg: 0,
        rpe: 0,
        hrZone: "",
        notes: "",
        video: { url: "", name: "", duration: 0 }
    }

    if (doc && doc._id) {
        out._id = String(doc._id)
    }
    if (doc && doc.name) {
        out.name = String(doc.name)
    }
    if (doc && doc.type) {
        out.type = String(doc.type)
    }
    if (doc && typeof doc.sets === "number") {
        out.sets = doc.sets
    }
    if (doc && typeof doc.reps === "number") {
        out.reps = doc.reps
    }
    if (doc && typeof doc.workSec === "number") {
        out.workSec = doc.workSec
    }
    if (doc && typeof doc.restSec === "number") {
        out.restSec = doc.restSec
    }
    if (doc && typeof doc.loadKg === "number") {
        out.loadKg = doc.loadKg
    }
    if (doc && typeof doc.rpe === "number") {
        out.rpe = doc.rpe
    }
    if (doc && doc.hrZone) {
        out.hrZone = String(doc.hrZone)
    }
    if (doc && doc.notes) {
        out.notes = String(doc.notes)
    }
    if (doc && doc.video) {
        const video = { url: "", name: "", duration: 0 }
        if (doc.video.url) {
            video.url = String(doc.video.url)
        }
        if (doc.video.name) {
            video.name = String(doc.video.name)
        }
        if (typeof doc.video.duration === "number") {
            video.duration = doc.video.duration
        }
        out.video = video
    }

    return out
}

function mapPlan(doc) {
    const out = {
        _id: "",
        userId: "",
        sharedWithClientId: "",
        title: "",
        contenu: "",
        createdAt: "",
        videos: [],
        exercises: []
    }

    if (doc && doc._id) {
        out._id = String(doc._id)
    }
    if (doc && doc.userId) {
        out.userId = String(doc.userId)
    }
    if (doc && doc.sharedWithClientId) {
        out.sharedWithClientId = String(doc.sharedWithClientId)
    }
    if (doc && doc.title) {
        out.title = String(doc.title)
    }
    if (doc && doc.contenu) {
        out.contenu = String(doc.contenu)
    }
    if (doc && doc.createdAt) {
        try {
            out.createdAt = new Date(doc.createdAt).toISOString()
        }
        catch {
            out.createdAt = ""
        }
    }

    if (doc && Array.isArray(doc.videos)) {
        const videos = []
        for (const v of doc.videos) {
            videos.push(mapVideo(v))
        }
        out.videos = videos
    }

    if (doc && Array.isArray(doc.exercises)) {
        const exercises = []
        for (const ex of doc.exercises) {
            exercises.push(mapExercise(ex))
        }
        out.exercises = exercises
    }

    return out
}

function mapPlans(list) {
    const items = []
    if (Array.isArray(list)) {
        for (const doc of list) {
            items.push(mapPlan(doc))
        }
    }
    return items
}

async function handleCreatePlanClient(req, res) {
    try {
        const me = req.user
        if (!me || me.role !== "admin") {
            return res.status(403).json({ error: { code: "FORBIDDEN", message: "Acces admin requis" } })
        }

        const body = req.body || {}
        let sharedWithClientId = ""
        if (body && body.sharedWithClientId) {
            sharedWithClientId = String(body.sharedWithClientId)
        }
        let title = ""
        if (body && body.title) {
            title = String(body.title)
        }
        let contenu = ""
        if (body && body.contenu) {
            contenu = String(body.contenu)
        }

        let exercises = []
        if (body && Array.isArray(body.exercises)) {
            exercises = body.exercises
        }

        if (!sharedWithClientId) {
            return res.status(400).json({ error: { code: "BAD_REQUEST", message: "sharedWithClientId requis" } })
        }

        const created = await planClientService.createPlanClient({
            userId: String(me._id),
            sharedWithClientId,
            title,
            contenu,
            exercises
        })

        return res.status(201).json({ item: mapPlan(created) })
    }
    catch (err) {
        if (err && err.code === "INVALID_ID") {
            return res.status(400).json({ error: { code: err.code, message: err.message, ...err.meta } })
        }
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
        const items = mapPlans(data)

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
            return res.status(403).json({ error: { code: "FORBIDDEN", message: "Acces admin requis" } })
        }

        const userId = String(req.params.userId || "")
        const from = req.query.from
        const to = req.query.to

        const data = await planClientService.listPlanClientForUser(userId, { from, to })
        const items = mapPlans(data)

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
            return res.status(403).json({ error: { code: "FORBIDDEN", message: "Acces admin requis" } })
        }

        const planClientId = String(req.params.planClientId || "")
        let videoId = ""
        if (req.body && req.body.videoId) {
            videoId = String(req.body.videoId)
        }
        else if (req.params && req.params.videoId) {
            videoId = String(req.params.videoId)
        }

        if (!planClientId || !videoId) {
            return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Identifiants requis" } })
        }

        const updated = await planClientService.attachVideo(planClientId, videoId)
        return res.status(200).json({ item: mapPlan(updated) })
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
            return res.status(403).json({ error: { code: "FORBIDDEN", message: "Acces admin requis" } })
        }

        const planClientId = String(req.params.planClientId || "")
        const videoId = String(req.params.videoId || "")

        if (!planClientId || !videoId) {
            return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Identifiants requis" } })
        }

        const updated = await planClientService.detachVideo(planClientId, videoId)
        return res.status(200).json({ item: mapPlan(updated) })
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

async function handleQuickAddExercise(req, res) {
    try {
        const me = req.user
        if (!me || me.role !== "admin") {
            return res.status(403).json({ error: { code: "FORBIDDEN", message: "Acces admin requis" } })
        }
        const planId = String(req.params.planClientId || "")
        const updated = await planClientService.quickAddExercise(planId)
        return res.status(200).json({ item: mapPlan(updated) })
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
        console.error("handleQuickAddExercise erreur inattendue :", err)
        return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erreur interne" } })
    }
}

async function handleUpdateExercise(req, res) {
    try {
        const me = req.user
        if (!me || me.role !== "admin") {
            return res.status(403).json({ error: { code: "FORBIDDEN", message: "Acces admin requis" } })
        }
        const planId = String(req.params.planClientId || "")
        const exerciseId = String(req.params.exerciseId || "")
        const patch = req.body || {}
        const updated = await planClientService.updateExercise(planId, exerciseId, patch)
        return res.status(200).json({ item: mapPlan(updated) })
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
        console.error("handleUpdateExercise erreur inattendue :", err)
        return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erreur interne" } })
    }
}

async function handleRemoveExercise(req, res) {
    try {
        const me = req.user
        if (!me || me.role !== "admin") {
            return res.status(403).json({ error: { code: "FORBIDDEN", message: "Acces admin requis" } })
        }
        const planId = String(req.params.planClientId || "")
        const exerciseId = String(req.params.exerciseId || "")
        const updated = await planClientService.removeExercise(planId, exerciseId)
        return res.status(200).json({ item: mapPlan(updated) })
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
        console.error("handleRemoveExercise erreur inattendue :", err)
        return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erreur interne" } })
    }
}

async function handleReorderExercises(req, res) {
    try {
        const me = req.user
        if (!me || me.role !== "admin") {
            return res.status(403).json({ error: { code: "FORBIDDEN", message: "Acces admin requis" } })
        }
        const planId = String(req.params.planClientId || "")
        let orderedIds = []
        if (req.body && Array.isArray(req.body.orderedIds)) {
            orderedIds = req.body.orderedIds.map(String)
        }
        const updated = await planClientService.reorderExercises(planId, orderedIds)
        return res.status(200).json({ item: mapPlan(updated) })
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
        console.error("handleReorderExercises erreur inattendue :", err)
        return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erreur interne" } })
    }
}

module.exports = {
    handleCreatePlanClient,
    handleGetMyPlanClient,
    handleGetPlanClientForUser,
    handleAttachVideoToPlan,
    handleDetachVideoFromPlan,
    handleQuickAddExercise,
    handleUpdateExercise,
    handleRemoveExercise,
    handleReorderExercises
}
