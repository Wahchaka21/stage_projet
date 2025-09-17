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
        console.error("erreur :", err)
        let status
        if (err.type === 'VALIDATION_ERROR') {
            status = 400
        } 
        else if (err.type === 'DUPLICATE') {
            status = 409
        } 
        else {
            status = 500
        }
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
    console.error('[DELETE ME] erreur :', err)

    if (err?.type === 'PERMISSION_DENIED') {
        return res.status(403).json(err)
    }

    if (err?.type === 'VALIDATION_ERROR') {
        return res.status(400).json(err)
    }

    if (err?.type === 'INVALID_CREDENTIALS') {
        return res.status(401).json(err)
    }

    return res.status(500).json({ error: 'Erreur interne' })
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
        console.error("erreur :", err)
        let status
        if (err.type === 'VALIDATION_ERROR') {
            status = 400
        } 
        else if (err.type === 'DUPLICATE') {
            status = 409
        } 
        else if (err.type === 'NOT_FOUND') {
            status = 404
        } 
        else {
            status = 500
        }
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
        let status
        if (err.type === 'VALIDATION_ERROR') {
            status = 400
        } 
        else if (err.type === 'NOT_FOUND') {
            status = 404
        } 
        else {
            status = 500
        }
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
        let status
        if (err.type === "VALIDATION_ERROR") {
            status = 400
        } 
        else {
            status = 500
        }
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
        let status
        if (err.type === "INVALID_ID") {
            status = 400
        } 
        else if (err.type === 'NOT_FOUND') {
            status = 404
        } 
        else {
            status = 500
        }
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