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

        const userId = String(me._id)
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

        const result = await plantClientService.createPlanClient({
            userId,
            sharedWithClientId,
            contenu,
            title,
        })

        return res.status(201).json({
            message: "plan client cree",
            data: result
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

function mapPlanForResponse(doc) {
    const out = {}

    if (doc && doc._id) {
        out._id = String(doc._id)
    } 
    else {
        out._id = ""
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

    if (doc && doc.contenu) {
        out.contenu = String(doc.contenu)
    } 
    else {
        out.contenu = ""
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
            if (typeof v.duration === "number") {
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