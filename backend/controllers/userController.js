const userService = require("./../services/userService")
const { DELETION_TYPES } = require("../utils/deletion")

async function handleCreateUser(req, res) {
    try {
        const validUser = req.body

        const result = await userService.createUser(validUser)

        res.status(201).json({
            message: "user crée",
            data: result
        })
    }
    catch (err) {
        console.error("erreur :", err)
        const status = err.type === 'VALIDATION_ERROR' ? 400 : (err.type === 'DUPLICATE' ? 409 : 500)
        res.status(status).json({ error: err.message, fields: err.fields || {} })
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
    console.error('[DELETE ME] erreur :', err);
    if (err?.type === 'PERMISSION_DENIED') return res.status(403).json(err)
    if (err?.type === 'VALIDATION_ERROR') return res.status(400).json(err)
    if (err?.type === 'INVALID_CREDENTIALS') return res.status(401).json(err)
    return res.status(500).json({ error: 'Erreur interne' })
  }
}

async function handleUpdateUserProfile(req, res) {
    try {
        const userId = req.user._id
        const updates = req.body

        const result = await userService.updateUserProfile(userId, updates)

        res.status(200).json({
            message: "données modifiée",
            data: result
        })
    }
    catch (err) {
        console.error("erreur :", err)
        const status = err.type === 'VALIDATION_ERROR' ? 400 : (err.type === 'DUPLICATE' ? 409 : (err.type === 'NOT_FOUND' ? 404 : 500))
        res.status(status).json({ error: err.message, fields: err.fields || {} })
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
        console.error("erreur :", err)
        const status = err.type === 'VALIDATION_ERROR' ? 400 : (err.type === 'NOT_FOUND' ? 404 : 500)
        res.status(status).json({ error: err.message, fields: err.fields || {} })
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

    } catch (err) {
        const status = err.type === "VALIDATION_ERROR" ? 400 : 500
        res.status(status).json({ error: err.message, fields: err.fields || {} })
    }
}

async function handleGetUserById(req, res) {
    try {
        const userId = req.params.userId
        const user = await userService.getUserById(userId)
        res.status(200).json(user)
    } 
    catch (err) {
        const status = err.type === "INVALID_ID" ? 400 : (err.type === 'NOT_FOUND' ? 404 : 500)
        res.status(status).json({ error: err.message })
    }
}

module.exports = {
    handleCreateUser,
    handleDeleteMe,
    handleUpdateUserProfile,
    handleChangeUserPassword,
    handleUpdateAvatar,
    handleGetUserById,
}