const adminService = require("./../services/adminService")

async function handleGetAllUser(req, res) {
  try {
    const user = await adminService.getAllUser()
    res.status(200).json({ message: "liste des utilisateurs récupérée", data: user })
  }
  catch (err) {
    console.error("Erreur controller 'handleGetAllUser' :", err)
    res.status(500).json({ error: "erreur interne" })
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
    const type = err.type || 'INTERNAL'
    const status = type === 'VALIDATION_ERROR' ? 400 : (type === 'FORBIDDEN_UPDATE' ? 403 : (type === 'NOT_FOUND' ? 404 : 500))
    res.status(status).json({ error: err.message, fields: err.fields || {} })
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
    const type = err.type || 'INTERNAL'
    const status = type === 'VALIDATION_ERROR' ? 400 : (type === 'NOT_FOUND' ? 404 : (type === 'LAST_ADMIN' ? 409 : 500))
    res.status(status).json({ error: err.message, fields: err.fields || {} })
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
    const type = err.type || 'INTERNAL'
    const status = type === 'VALIDATION_ERROR' ? 400 : (type === 'INVALID_ROLE' ? 400 : (type === 'NOT_FOUND' ? 404 : (type === 'LAST_ADMIN' ? 409 : 500)))
    res.status(status).json({ error: err.message, fields: err.fields || {} })
  }
}

module.exports = {
  handleGetAllUser,
  handleDeleteUser,
  handleChangeUserRole,
  handleUpdateUser,
}