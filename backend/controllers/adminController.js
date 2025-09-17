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
    let status
    if (type === 'VALIDATION_ERROR') {
      status = 400
    } 
    else if (type === 'FORBIDDEN_UPDATE') {
      status = 403
    } 
    else if (type === 'NOT_FOUND') {
      status = 404
    } 
    else {
      status = 500
    }
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
    let status
    if (type === 'VALIDATION_ERROR') {
      status = 400
    } 
    else if (type === 'NOT_FOUND') {
      status = 404
    } 
    else if (type === 'LAST_ADMIN') {
      status = 409
    } 
    else {
      status = 500
    }
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
    let status
    if (type === 'VALIDATION_ERROR') {
      status = 400
    } 
    else if (type === 'INVALID_ROLE') {
      status = 400
    } 
    else if (type === 'NOT_FOUND') {
      status = 404
    } 
    else if (type === 'LAST_ADMIN') {
      status = 409
    } 
    else {
      status = 500
    }
    res.status(status).json({ error: err.message, fields: err.fields || {} })
  }
}

module.exports = {
  handleGetAllUser,
  handleDeleteUser,
  handleChangeUserRole,
  handleUpdateUser,
}