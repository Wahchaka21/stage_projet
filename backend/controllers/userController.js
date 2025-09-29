const userService = require("./../services/userService")
const { DELETION_TYPES } = require("../utils/deletion")

async function handleCreateUser(req, res) {
    try {
        const validUser = req.body

        const result = await userService.createUser(validUser)

        res.status(201).json({
            message: "user créé",
            data: result
        })
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

        console.error("[handleCreateUser] erreur inattendue :", err)
        return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erreur interne"}})
    }
}

async function handleDeleteMe(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentification requise' })
    }

    const userId = String(req.user._id)

    const deletionContext = {
      requestingUser: req.user,
      type: DELETION_TYPES.SELF_DELETE,
      ipAddress: req.ip || 'unknown'
    }

    const result = await userService.deleteUser(userId, deletionContext)

    return res.status(200).json({ message: 'Compte supprimé', data: result })
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

        console.error("[handleDeleteMe] erreur inattendue :", err)
        return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erreur interne"}})
    }
}

async function handleUpdateUserProfile(req, res) {
    try {
        const userId = req.user._id
        const updates = req.body

        const result = await userService.updateUserProfile(userId, updates)

        res.status(200).json({
            message: "données modifiées",
            data: result
        })
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

        console.error("[handleUpdateUserProfile] erreur inattendue :", err)
        return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erreur interne"}})
    }
}

async function handleChangeUserPassword(req, res) {
    try {
        const userId = req.user._id
        const { currentPassword, newPassword } = req.body

        const result = await userService.changeUserPassword(userId, currentPassword, newPassword)

        res.status(200).json({ message: "mot de passe modifié", data: result })
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

        console.error("[handleChangeUserPassword] erreur inattendue :", err)
        return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erreur interne"}})
    }
}

async function handleUpdateAvatar(req, res) {
    try {
        const file = req.file
        const userId = req.user._id

        if (!file) {
            return res.status(400).json({ error: "Aucune image reçue" })
        }

        const base = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`
        const avatarUrl = `${base}/uploads/photos/${file.filename}`

        const updatedUser = await userService.updateUserAvatar(userId, avatarUrl)
        res.status(200).json({ message: "Avatar mis à jour", data: updatedUser })

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

        console.error("[handleUpdateAvatar] erreur inattendue :", err)
        return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erreur interne"}})
    }
}

async function handleGetUserById(req, res) {
    try {
        const userId = req.params.userId
        const user = await userService.getUserById(userId)
        res.status(200).json(user)
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

        console.error("[handleGetUserById] erreur inattendue :", err)
        return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erreur interne"}})
    }
}

async function handleGetCoach(req, res) {
    try {
        const data = await userService.findCoach()
        return res.status(200).json({data})
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

        console.error("[handleGetCoach] erreur inattendue :", err)
        return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erreur interne"}})
    }
}

module.exports = {
    handleCreateUser,
    handleDeleteMe,
    handleUpdateUserProfile,
    handleChangeUserPassword,
    handleUpdateAvatar,
    handleGetUserById,
    handleGetCoach
}