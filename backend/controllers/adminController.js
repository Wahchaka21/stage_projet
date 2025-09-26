const adminService = require("./../services/adminService")
const rdvService = require("../services/rdvService")

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

module.exports = {
  handleGetAllUser,
  handleDeleteUser,
  handleChangeUserRole,
  handleUpdateUser,
  handleCreateRdv,
  handleDeleteRdv
}