const planClientSchema = require("../schemas/planClient")
const { isValideObjectId } = require("../utils/validator")
const persoError = require("../utils/error")
const videoSchema = require("../schemas/videoSchema")

const EXERCISE_TYPES = ["cardio", "muscu", "mobilite", "autre"]

const defaultExercise = {
    name: "Nouvel exercice",
    type: "muscu",
    sets: 3,
    reps: 12,
    workSec: 0,
    restSec: 90,
    loadKg: 0,
    rpe: 0,
    hrZone: "",
    notes: "",
    video: { url: "", name: "", duration: 0 }
}

function readNumber(value, fallback, opts) {
    let candidate = value
    if (typeof candidate === "string") {
        if (candidate.trim() === "") {
            candidate = null
        }
        else {
            candidate = Number(candidate)
        }
    }
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
        if (opts && typeof opts.min === "number") {
            if (candidate < opts.min) {
                candidate = opts.min
            }
        }
        if (opts && typeof opts.max === "number") {
            if (candidate > opts.max) {
                candidate = opts.max
            }
        }
        if (opts && opts.round === true) {
            candidate = Math.round(candidate)
        }
        return candidate
    }
    return fallback
}

function sanitizeVideo(input) {
    const video = { url: "", name: "", duration: 0 }
    if (input && typeof input === "object") {
        if (input.url) {
            video.url = String(input.url)
        }
        if (input.name) {
            video.name = String(input.name)
        }
        if (Object.prototype.hasOwnProperty.call(input, "duration")) {
            video.duration = readNumber(input.duration, 0, { min: 0, round: true })
        }
    }
    return video
}

function sanitizeExercise(input) {
    const item = {
        name: defaultExercise.name,
        type: defaultExercise.type,
        sets: defaultExercise.sets,
        reps: defaultExercise.reps,
        workSec: defaultExercise.workSec,
        restSec: defaultExercise.restSec,
        loadKg: defaultExercise.loadKg,
        rpe: defaultExercise.rpe,
        hrZone: defaultExercise.hrZone,
        notes: defaultExercise.notes,
        video: sanitizeVideo(defaultExercise.video)
    }

    if (!input || typeof input !== "object") {
        return item
    }

    if (input.name) {
        item.name = String(input.name)
    }
    if (input.type && EXERCISE_TYPES.includes(String(input.type))) {
        item.type = String(input.type)
    }
    if (Object.prototype.hasOwnProperty.call(input, "sets")) {
        item.sets = readNumber(input.sets, item.sets, { min: 1, round: true })
    }
    if (Object.prototype.hasOwnProperty.call(input, "reps")) {
        item.reps = readNumber(input.reps, item.reps, { min: 1, round: true })
    }
    if (Object.prototype.hasOwnProperty.call(input, "workSec")) {
        item.workSec = readNumber(input.workSec, item.workSec, { min: 0, round: true })
    }
    if (Object.prototype.hasOwnProperty.call(input, "restSec")) {
        item.restSec = readNumber(input.restSec, item.restSec, { min: 0, round: true })
    }
    if (Object.prototype.hasOwnProperty.call(input, "loadKg")) {
        item.loadKg = readNumber(input.loadKg, item.loadKg, { min: 0 })
    }
    if (Object.prototype.hasOwnProperty.call(input, "rpe")) {
        item.rpe = readNumber(input.rpe, item.rpe, { min: 0, max: 10 })
    }
    if (Object.prototype.hasOwnProperty.call(input, "hrZone")) {
        if (input.hrZone) {
            item.hrZone = String(input.hrZone)
        }
        else {
            item.hrZone = ""
        }
    }
    if (Object.prototype.hasOwnProperty.call(input, "notes")) {
        if (input.notes) {
            item.notes = String(input.notes)
        }
        else {
            item.notes = ""
        }
    }
    if (Object.prototype.hasOwnProperty.call(input, "video")) {
        item.video = sanitizeVideo(input.video)
    }
    return item
}

function sanitizeExercisePatch(patch) {
    const data = {}
    if (!patch || typeof patch !== "object") {
        return data
    }

    if (Object.prototype.hasOwnProperty.call(patch, "name")) {
        if (patch.name) {
            data.name = String(patch.name)
        }
        else {
            data.name = ""
        }
    }
    if (Object.prototype.hasOwnProperty.call(patch, "type")) {
        if (patch.type && EXERCISE_TYPES.includes(String(patch.type))) {
            data.type = String(patch.type)
        }
    }
    if (Object.prototype.hasOwnProperty.call(patch, "sets")) {
        data.sets = readNumber(patch.sets, defaultExercise.sets, { min: 1, round: true })
    }
    if (Object.prototype.hasOwnProperty.call(patch, "reps")) {
        data.reps = readNumber(patch.reps, defaultExercise.reps, { min: 1, round: true })
    }
    if (Object.prototype.hasOwnProperty.call(patch, "workSec")) {
        data.workSec = readNumber(patch.workSec, defaultExercise.workSec, { min: 0, round: true })
    }
    if (Object.prototype.hasOwnProperty.call(patch, "restSec")) {
        data.restSec = readNumber(patch.restSec, defaultExercise.restSec, { min: 0, round: true })
    }
    if (Object.prototype.hasOwnProperty.call(patch, "loadKg")) {
        data.loadKg = readNumber(patch.loadKg, defaultExercise.loadKg, { min: 0 })
    }
    if (Object.prototype.hasOwnProperty.call(patch, "rpe")) {
        data.rpe = readNumber(patch.rpe, defaultExercise.rpe, { min: 0, max: 10 })
    }
    if (Object.prototype.hasOwnProperty.call(patch, "hrZone")) {
        if (patch.hrZone) {
            data.hrZone = String(patch.hrZone)
        }
        else {
            data.hrZone = ""
        }
    }
    if (Object.prototype.hasOwnProperty.call(patch, "notes")) {
        if (patch.notes) {
            data.notes = String(patch.notes)
        }
        else {
            data.notes = ""
        }
    }
    if (Object.prototype.hasOwnProperty.call(patch, "video")) {
        data.video = sanitizeVideo(patch.video)
    }

    return data
}

function buildPlanPayload(planClientData) {
    const data = {
        userId: planClientData.userId,
        sharedWithClientId: planClientData.sharedWithClientId,
        title: "",
        contenu: "",
        exercises: []
    }

    if (planClientData.title) {
        data.title = String(planClientData.title)
    }
    if (planClientData.contenu) {
        data.contenu = String(planClientData.contenu)
    }
    else {
        data.contenu = ""
    }
    if (Array.isArray(planClientData.exercises)) {
        const list = []
        for (const item of planClientData.exercises) {
            list.push(sanitizeExercise(item))
        }
        data.exercises = list
    }

    return data
}

async function createPlanClient(planClientData) {
    try {
        const payload = buildPlanPayload(planClientData)
        return await planClientSchema.create(payload)
    }
    catch (err) {
        if (err && (err.name === "ValidationError" || err.name === "CastError")) {
            const fields = {}
            if (err.errors) {
                for (const key in err.errors) {
                    fields[key] = err.errors[key].message
                }
            }
            throw persoError("VALIDATION_ERROR", "Erreur validation creation du plan client", { fields })
        }
        throw persoError("DB_ERROR", "Erreur creation plan client", { original: err && err.message })
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

function makeDateFilter(opts) {
    if (!opts) {
        return null
    }

    const filter = {}

    if (opts.from) {
        const fromDate = new Date(opts.from)
        if (!Number.isNaN(fromDate.getTime())) {
            filter.$gte = fromDate
        }
    }

    if (opts.to) {
        const toDate = new Date(opts.to)
        if (!Number.isNaN(toDate.getTime())) {
            filter.$lte = toDate
        }
    }

    if (Object.keys(filter).length === 0) {
        return null
    }

    return filter
}

async function listPlanClientForClient(clientId, opts) {
    try {
        if (!clientId || !isValideObjectId(clientId)) {
            throw persoError("INVALID_ID", "Identifiant client invalide")
        }
        const filter = { sharedWithClientId: clientId }
        const createdAt = makeDateFilter(opts)

        if (createdAt) {
            filter.createdAt = createdAt
        }

        return await planClientSchema
            .find(filter)
            .sort({ createdAt: 1 })
            .lean()
    }
    catch (err) {
        if (err && err.type) {
            throw err
        }
        throw persoError("DB_ERROR", "Erreur lecture plans clients", { original: err && err.message })
    }
}

async function listPlanClientForUser(userId, opts) {
    try {
        if (!userId || !isValideObjectId(userId)) {
            throw persoError("INVALID_ID", "Identifiant utilisateur invalide")
        }

        const filter = { sharedWithClientId: userId }
        const createdAt = makeDateFilter(opts)

        if (createdAt) {
            filter.createdAt = createdAt
        }

        return await planClientSchema
            .find(filter)
            .sort({ createdAt: 1 })
            .lean()
    }
    catch (err) {
        if (err && err.type) {
            throw err
        }
        throw persoError("DB_ERROR", "Erreur lecture plans clients", { original: err && err.message })
    }
}

async function attachVideo(planClientId, videoId) {
    try {
        if (!planClientId || !isValideObjectId(planClientId)) {
            throw persoError("INVALID_ID", "Identifiant plan client invalide", { planClientId })
        }

        if (!videoId || !isValideObjectId(videoId)) {
            throw persoError("INVALID_ID", "Identifiant video invalide", { videoId })
        }

        const plan = await planClientSchema.findById(planClientId)
        if (!plan) {
            throw persoError("NOT_FOUND", "Plan client introuvable", { planClientId })
        }

        const video = await videoSchema.findById(videoId).lean()
        if (!video) {
            throw persoError("NOT_FOUND", "Video introuvable", { videoId })
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
        if (err && err.type) {
            throw err
        }
        throw persoError("DB_ERROR", "Erreur attache video au plan", { original: err && err.message })
    }
}

async function detachVideo(planClientId, videoId) {
    try {
        if (!planClientId || !isValideObjectId(planClientId)) {
            throw persoError("INVALID_ID", "Identifiant plan client invalide", { planClientId })
        }
        if (!videoId || !isValideObjectId(videoId)) {
            throw persoError("INVALID_ID", "Identifiant video invalide", { videoId })
        }

        const updated = await planClientSchema.findByIdAndUpdate(
            planClientId,
            { $pull: { videos: { videoId: videoId } } },
            { new: true }
        ).lean()

        if (!updated) {
            throw persoError("NOT_FOUND", "Plan client introuvable", { planClientId })
        }

        return updated
    }
    catch (err) {
        if (err && err.type) {
            throw err
        }
        throw persoError("DB_ERROR", "Erreur retrait video du plan", { original: err && err.message })
    }
}

async function quickAddExercise(planClientId) {
    try {
        if (!planClientId || !isValideObjectId(planClientId)) {
            throw persoError("INVALID_ID", "Identifiant plan client invalide", { planClientId })
        }

        const updated = await planClientSchema.findByIdAndUpdate(
            planClientId,
            { $push: { exercises: sanitizeExercise({}) } },
            { new: true }
        ).lean()

        if (!updated) {
            throw persoError("NOT_FOUND", "Plan client introuvable", { planClientId })
        }

        return updated
    }
    catch (err) {
        if (err && err.type) {
            throw err
        }
        throw persoError("DB_ERROR", "Erreur ajout exercice", { original: err && err.message })
    }
}

async function updateExercise(planClientId, exerciseId, patch) {
    try {
        if (!planClientId || !isValideObjectId(planClientId)) {
            throw persoError("INVALID_ID", "Identifiant plan client invalide", { planClientId })
        }
        if (!exerciseId || !isValideObjectId(exerciseId)) {
            throw persoError("INVALID_ID", "Identifiant exercice invalide", { exerciseId })
        }

        const cleanPatch = sanitizeExercisePatch(patch)
        if (Object.keys(cleanPatch).length === 0) {
            return await planClientSchema.findById(planClientId).lean()
        }

        const set = {}
        for (const key in cleanPatch) {
            set[`exercises.$.${key}`] = cleanPatch[key]
        }

        const updated = await planClientSchema.findOneAndUpdate(
            { _id: planClientId, "exercises._id": exerciseId },
            { $set: set },
            { new: true }
        ).lean()
        if (!updated) {
            throw persoError("NOT_FOUND", "Exercice introuvable", { planClientId, exerciseId })
        }
        return updated
    }
    catch (err) {
        if (err && err.type) {
            throw err
        }
        throw persoError("DB_ERROR", "Erreur modification exercice", { original: err && err.message })
    }
}

async function removeExercise(planClientId, exerciseId) {
    try {
        if (!planClientId || !isValideObjectId(planClientId)) {
            throw persoError("INVALID_ID", "Identifiant plan client invalide", { planClientId })
        }
        if (!exerciseId || !isValideObjectId(exerciseId)) {
            throw persoError("INVALID_ID", "Identifiant exercice invalide", { exerciseId })
        }
        const updated = await planClientSchema.findByIdAndUpdate(
            planClientId,
            { $pull: { exercises: { _id: exerciseId } } },
            { new: true }
        ).lean()
        if (!updated) {
            throw persoError("NOT_FOUND", "Plan client introuvable", { planClientId })
        }
        return updated
    }
    catch (err) {
        if (err && err.type) {
            throw err
        }
        throw persoError("DB_ERROR", "Erreur suppression exercice", { original: err && err.message })
    }
}

async function reorderExercises(planClientId, orderedIds) {
    try {
        if (!planClientId || !isValideObjectId(planClientId)) {
            throw persoError("INVALID_ID", "Identifiant plan client invalide", { planClientId })
        }
        const plan = await planClientSchema.findById(planClientId).lean()
        if (!plan) {
            throw persoError("NOT_FOUND", "Plan client introuvable", { planClientId })
        }

        const byId = new Map()
        if (Array.isArray(plan.exercises)) {
            for (const item of plan.exercises) {
                byId.set(String(item._id), item)
            }
        }

        const reordered = []
        if (Array.isArray(orderedIds)) {
            for (const id of orderedIds) {
                const key = String(id)
                if (byId.has(key)) {
                    reordered.push(byId.get(key))
                    byId.delete(key)
                }
            }
        }

        for (const [key, value] of byId.entries()) {
            reordered.push(value)
        }

        const saved = await planClientSchema.findByIdAndUpdate(
            planClientId,
            { $set: { exercises: reordered } },
            { new: true }
        ).lean()
        return saved
    }
    catch (err) {
        if (err && err.type) {
            throw err
        }
        throw persoError("DB_ERROR", "Erreur reorganisation exercices", { original: err && err.message })
    }
}

module.exports = {
    createPlanClient,
    deletePlanClient,
    listPlanClientForClient,
    listPlanClientForUser,
    attachVideo,
    detachVideo,
    quickAddExercise,
    updateExercise,
    removeExercise,
    reorderExercises
}
