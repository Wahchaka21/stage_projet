const mongoose = require("mongoose")
const userSchema = require("../schemas/userSchema")
const persoError = require("./../utils/error")

async function getAllUser() {
    try{
        const users = await userSchema.find({})
        .select("-password")
        .sort({ createAt: -1 })

        return users
    }
    catch(err){
        throw persoError("DB_ERROR", "problème lors de la récupération des utilisateurs.", {
            original: err
        })
    }
}

async function updateUser(userId, update) {
    if(!mongoose.Types.ObjectId.isValid(userId)){
        throw persoError("VALIDATION_ERROR", "L'id de l'utilisateur n'est pas correct.", {
            fields: { userId }
        })
    }

    const forbiddenFields = ["_id", "createdAt", "updatedAt", "password", "role"]
    for(const field of forbiddenFields) {
        if(Object.prototype.hasOwnProperty.call(update, field)){
            throw persoError("FORBIDDEN_UPDATE", `le "${field}" ne peut pas être modifié.`)
        }
    }

    const user = await userSchema.findByIdAndUpdate(userId, update, {new: true})
    .select("-password")

    if(!user){
        throw persoError("NOT_FOUND", "Utilisateur introuvable")
    }

    return user
}

async function deleteUser(userId) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw persoError("VALIDATION_ERROR", "L'id de l'utilisateur n'est pas correct", {
            fields: { userId }
        })
    }

    const target = await userSchema.findById(userId)
    if (!target) {
        throw persoError("NOT_FOUND", "L'utilisateur n'a pas été trouvé")
    }

    if (target.role === 'admin') {
        const adminCount = await userSchema.countDocuments({ role: 'admin' })
        if (adminCount <= 1) {
            throw persoError("LAST_ADMIN", "Impossible de supprimer le dernier administrateur")
        }
    }

    await userSchema.findByIdAndDelete(userId)
    return { message: "utilisateur supprimé" }
}

async function changeUserRole(userId, newRole) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw persoError("VALIDATION_ERROR", "L'id de l'utilisateur n'est pas correct", {
            fields: { userId }
        })
    }

    if (!["user", "admin"].includes(newRole)) {
        throw persoError("INVALID_ROLE", "le rôle doit être soit 'user' soit 'admin'", {
            fields: { newRole }
        })
    }

    const user = await userSchema.findById(userId)
    if (!user) {
        throw persoError("NOT_FOUND", "L'utilisateur n'a pas été trouvé")
    }

    if (user.role === 'admin' && newRole === 'user') {
        const adminCount = await userSchema.countDocuments({ role: 'admin' })
        if (adminCount <= 1) {
            throw persoError("LAST_ADMIN", "Impossible de rétrograder le dernier administrateur")
        }
    }

    user.role = newRole
    await user.save()
    return user
}

module.exports = {
    getAllUser,
    updateUser,
    deleteUser,
    changeUserRole
}

