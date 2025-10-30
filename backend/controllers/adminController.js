const adminService = require("./../services/adminService")
const rdvService = require("../services/rdvService")
const plantClientService = require("../services/planClientService")
const chatService = require("../services/chatService")

async function handleGetAllUser(req, res) {
  try {
    const user = await adminService.getAllUser()
    res.status(200).json({ message: "liste des utilisateurs récupérée", data: user })
  }
  catch (err) {
      if (err && err.code === "INVALID_ID") {
          return res.status(400).json({ error: { code: err.code, message: err.message, ...err.meta }})
      }

      if(err && err.code === "NOT_FOUND") {
          return res.status(404).json({ error: { code: err.code, message: err.message, ...err.meta}})
      }

      if (err && err.code === "DB_ERROR") {
          return res.status(500).json({ error: { code: err.code, message: err.message, ...err.meta}})
      }

      console.error("[handleGetAllUser] erreur inattendue :", err)
      return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erreur interne"}})
  }
}

async function handleUpdateUser(req, res) {
  try {
    const userId = req.params.userId
    const updateData = req.body
    const users = await adminService.updateUser(userId, updateData)
    res.status(200).json({ message: "utilisateur modifié", data: users })
  }
  catch (err) {
      if (err && err.code === "INVALID_ID") {
          return res.status(400).json({ error: { code: err.code, message: err.message, ...err.meta }})
      }

      if(err && err.code === "NOT_FOUND") {
          return res.status(404).json({ error: { code: err.code, message: err.message, ...err.meta}})
      }

      if (err && err.code === "DB_ERROR") {
          return res.status(500).json({ error: { code: err.code, message: err.message, ...err.meta}})
      }

      console.error("[handleUpdateUser] erreur inattendue :", err)
      return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erreur interne"}})
  }
}

async function handleDeleteUser(req, res) {
  try {
    const userId = req.params.userId
    if (String(req.user._id) === String(userId)) {
      return res.status(400).json({ error: "Un administrateur ne peut pas se supprimer lui-même" })
    }
    const user = await adminService.deleteUser(userId)
    res.status(200).json({ message: "utilisateur supprimé", data: user })
  }
  catch (err) {
      if (err && err.code === "INVALID_ID") {
          return res.status(400).json({ error: { code: err.code, message: err.message, ...err.meta }})
      }

      if(err && err.code === "NOT_FOUND") {
          return res.status(404).json({ error: { code: err.code, message: err.message, ...err.meta}})
      }

      if (err && err.code === "DB_ERROR") {
          return res.status(500).json({ error: { code: err.code, message: err.message, ...err.meta}})
      }

      console.error("[handleDeleteUser] erreur inattendue :", err)
      return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erreur interne"}})
  }
}

async function handleChangeUserRole(req, res) {
  try {
    const userId = req.params.userId
    const { role } = req.body
    const user = await adminService.changeUserRole(userId, role)
    res.status(200).json({ message: "changement de rôle effectué", data: user })
  }
  catch (err) {
      if (err && err.code === "INVALID_ID") {
          return res.status(400).json({ error: { code: err.code, message: err.message, ...err.meta }})
      }

      if(err && err.code === "NOT_FOUND") {
          return res.status(404).json({ error: { code: err.code, message: err.message, ...err.meta}})
      }

      if (err && err.code === "DB_ERROR") {
          return res.status(500).json({ error: { code: err.code, message: err.message, ...err.meta}})
      }

      console.error("[handleChangeUserRole] erreur inattendue :", err)
      return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erreur interne"}})
  }
}

async function handleCreateRdv(req, res) {
    try  {
        const {_id: userId} = req.user
        const {sharedWithClientId, date, description} = req.body

        const result = await rdvService.createRdv({
            userId,
            sharedWithClientId,
            date,
            description
        })

        res.status(201).json({
            message: "rendez-vous crée",
            data: result
        })
    }
    catch (err) {
        if (err && err.code === "INVALID_ID") {
            return res.status(400).json({ error: {code: err.code, message: err.message, ...err.meta }})
        }

        if (err && err.code === "NOT_FOUND") {
            return res.status(404).json({error: {code: err.code, message: err.message, ...err.meta}})
        }

        if (err && err.code ==="DB_ERROR") {
            return res.status(500).json({error: {code: err.code, message: err.message, ...err.meta}})
        }

        console.error("handleCreateRdv erreur inattendue :", err)
        return res.status(500).json({ error: {code: "INTERNAL_ERROR", message: "Erreur interne"}})
    }
}

async function handleDeleteRdv(req, res) {
    try {
        const {rdvId} = req.params

        const result = await rdvService.deleteRdv(rdvId)

        if(!result) {
            return res.status(404).json({ error: {code: "NOT_FOUND", message: "Rendez-vous introuvable"}})
        }

        res.status(200).json({
            message: "rendez-vous supprimé",
            data: result
        })
    }
    catch (err) {
        if (err && err.code === "INVALID_ID") {
            return res.status(400).json({ error: {code: err.code, message: err.message, ...err.meta }})
        }

        if (err && err.code === "NOT_FOUND") {
            return res.status(404).json({error: {code: err.code, message: err.message, ...err.meta}})
        }

        if (err && err.code ==="DB_ERROR") {
            return res.status(500).json({error: {code: err.code, message: err.message, ...err.meta}})
        }

        console.error("handleDeleteRdv erreur inattendue :", err)
        return res.status(500).json({ error: {code: "INTERNAL_ERROR", message: "Erreur interne"}})
    }
}

async function handleCreatePlanClient(req, res) {
    try {
        const me = req.user
        if (!me || !me._id) {
            return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Auth requise" } })
        }

        const body = req.body || {}
        const userId = String(me._id)

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

        const result = await plantClientService.createPlanClient({
            userId,
            sharedWithClientId,
            title,
            contenu,
            exercises
        })

        return res.status(201).json({
            message: "plan client cree",
            item: mapPlanForResponse(result)
        })
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


async function handleDeletePlanClient(req, res) {
    try {
        const {planClientId} = req.params

        const result = await plantClientService.deletePlanClient(planClientId)

        if(!result) {
            return res.status(404).json({ error: { code: "NOT_FOUND", message: "Plan client introuvable" } })
        }

        res.status(200).json({
            message: "plan client supprimé",
            data: result
        })
    }
    catch (err) {
        if (err && err.code === "INVALID_ID") {
            return res.status(400).json({ error: {code: err.code, message: err.message, ...err.meta }})
        }

        if (err && err.code === "NOT_FOUND") {
            return res.status(404).json({error: {code: err.code, message: err.message, ...err.meta}})
        }

        if (err && err.code ==="DB_ERROR") {
            return res.status(500).json({error: {code: err.code, message: err.message, ...err.meta}})
        }

        console.error("handleDeletePlanClient erreur inattendue :", err)
        return res.status(500).json({ error: {code: "INTERNAL_ERROR", message: "Erreur interne"}})
    }
}

function mapExerciseForResponse(doc) {
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

function mapPlanForResponse(doc) {
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
        const list = []
        for (const v of doc.videos) {
            const it = { videoId: "", url: "", name: "", size: 0, format: "", duration: 0 }
            if (v && v.videoId) {
                it.videoId = String(v.videoId)
            }
            if (v && v.url) {
                it.url = String(v.url)
            }
            if (v && v.name) {
                it.name = String(v.name)
            }
            if (v && typeof v.size === "number") {
                it.size = v.size
            }
            if (v && v.format) {
                it.format = String(v.format)
            }
            if (v && typeof v.duration === "number") {
                it.duration = v.duration
            }
            list.push(it)
        }
        out.videos = list
    }

    if (doc && Array.isArray(doc.exercises)) {
        const exercises = []
        for (const ex of doc.exercises) {
            exercises.push(mapExerciseForResponse(ex))
        }
        out.exercises = exercises
    }

    return out
}

async function handleUploadVideoForPlan(req, res) {
    try {
        const me = req.user
        if (!me || me.role !== "admin") {
            return res.status(403).json({ error: { code: "FORBIDDEN", message: "Accès admin requis" } })
        }

        const file = req.file
        if (!file) {
            return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Aucune vidéo reçue" } })
        }

        const planClientId = req.params.planClientId
        const userId = me._id

        const url = `http://localhost:3000/uploads/videos/${file.filename}`

        let duration = 0
        try {
            const { ffprobeDuration } = require("../utils/ffprobe")
            if (typeof ffprobeDuration === "function") {
                duration = await ffprobeDuration(file.path)
            }
        } 
        catch (_e) {
            duration = 0
        }

        const video = await chatService.uploadVideo({
            userId,
            name: file.originalname,
            url,
            size: file.size,
            format: file.mimetype,
            videoDuration: duration
        })

        const updated = await plantClientService.attachVideo(planClientId, String(video._id))

        return res.status(201).json({
            message: "Vidéo uploadée et attachée au plan",
            item: mapPlanForResponse(updated)
        })
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
        console.error("handleUploadVideoForPlan erreur inattendue :", err)
        return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erreur interne" } })
    }
}

async function handleDeleteVideoFromPlan(req, res) {
    try {
        const me = req.user
        if (!me || me.role !== "admin") {
            return res.status(403).json({ error: { code: "FORBIDDEN", message: "Accès admin requis" } })
        }

        const planClientId = req.params.planClientId
        const videoId = req.params.videoId

        const updated = await plantClientService.detachVideo(planClientId, videoId)

        return res.status(200).json({
            message: "Vidéo détachée du plan",
            item: mapPlanForResponse(updated)
        })
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
        console.error("handleDeleteVideoFromPlan erreur inattendue :", err)
        return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erreur interne" } })
    }
}

module.exports = {
    handleGetAllUser,
    handleDeleteUser,
    handleChangeUserRole,
    handleUpdateUser,
    handleCreateRdv,
    handleDeleteRdv,
    handleCreatePlanClient,
    handleDeletePlanClient,
    handleUploadVideoForPlan,
    handleDeleteVideoFromPlan
}
