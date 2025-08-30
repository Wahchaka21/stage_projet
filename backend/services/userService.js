const UserSchema = require("../schemas/userSchema")
const { isValideObjectId } = require("../utils/validator")
const persoError = require("../utils/error")
const bcrypt = require("bcryptjs")

function assertValidId(id, name = "ID") {
    if (!isValideObjectId(id)) {
        throw persoError("INVALID_ID", `${name} invalide`, { fields: { [name]: "ID pas bon" } } )
    }
}

async function createUser(validUser) {
    try {
        if (!validUser.password || typeof validUser.password !== "string") {
            throw persoError("VALIDATION_ERROR", "y a pas de mot de passe laaaaa", {
                fields: { password: "faut un password !!!!" }
            })
        }

        const newUser = new UserSchema(validUser)

        await newUser.validate()
        return await newUser.save()
    }
    catch(err) {
        if (err.name === "ValidationError") {
            const fields = {}
            for (let key in err.errors) {
                fields[key] = err.errors[key].message
            }
            throw persoError("VALIDATION_ERROR", "Données pas bonnes pour créer le user", { fields })
        }
        if (err && err.code === 11000) {
            const dupField = Object.keys(err.keyPattern || {})[0] || 'field'
            throw persoError("DUPLICATE", `${dupField} déjà utilisé`, { fields: { [dupField]: 'déjà utilisé' } })
        }
        throw persoError("DB_ERROR", "Erreur pour la création", { original: err.message })
    }
}

async function deleteUser(userId) {
    try {
        assertValidId(userId, "userId")

        const user = await UserSchema.findById(userId)
        if(!user) {
            throw persoError("NOT_FOUND", "pas trouver user a supr", { fields: {userId}})
        }
        return await UserSchema.findByIdAndDelete(userId)
    }
    catch (err) {
        if (err && err.type) throw err
        throw persoError("DB_ERROR", "erreur pour la supr", { original: err.message })
    }
}

async function updateUserProfile(userId, updates) {
    try {
        assertValidId(userId, "userId")

        const allowedFields = ["nickname", "name", "lastname", "email", "city", "phone", "address", "postCode", "gender"]

        const dataToUpdate = {}
        for (let key of allowedFields) {
            if (updates[key] !== undefined) {
                dataToUpdate[key] = updates[key]
            }
        }

        // Normaliser l'email si fourni
        if (dataToUpdate.email) {
            dataToUpdate.email = String(dataToUpdate.email).toLowerCase()
        }

        if (Object.keys(dataToUpdate).length === 0) {
            throw persoError("VALIDATION_ERROR", "Aucune donnée à mettre à jour", {
                fields: { update: "aucun champ valide fourni" }
            })
        }

        dataToUpdate.updatedAt = new Date()

        const updated = await UserSchema.findByIdAndUpdate(
            userId,
            { $set: dataToUpdate },
            { new: true, runValidators: true, context: 'query' }
        )

        if (!updated) {
            throw persoError("NOT_FOUND", "Utilisateur introuvable", { fields: { userId } })
        }

        return updated

    } catch (err) {
        if (err.name === "ValidationError") {
            const fields = {}
            for (let key in err.errors) {
                fields[key] = err.errors[key].message
            }
            throw persoError("VALIDATION_ERROR", "Erreur de validation", { fields })
        }

        // Erreur d'unicité (email, nickname, etc.)
        if (err && err.code === 11000) {
            const dupField = Object.keys(err.keyPattern || {})[0] || 'field'
            throw persoError("DUPLICATE", `${dupField} déjà utilisé`, { fields: { [dupField]: 'déjà utilisé' } })
        }

        if (err && err.type && err.message) throw err

        throw persoError("DB_ERROR", "Erreur de mise à jour", { original: err.message })
    }
}

async function changeUserPassword(userId, currentPassword, newPassword) {
    try {
        assertValidId(userId, "userId")

        if (typeof currentPassword !== "string" || currentPassword.trim() === "") {
            throw persoError("VALIDATION_ERROR", "mot de passe actuel requis", {
                fields: { currentPassword: "requis" }
            })
        }
        if (typeof newPassword !== "string" || newPassword.trim() === "") {
            throw persoError("VALIDATION_ERROR", "nouveau mot de passe requis", {
                fields: { newPassword: "requis" }
            })
        }

        // Politique de mot de passe (min 8, maj, min, chiffre)
        const strongPwd = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
        if (!strongPwd.test(newPassword)) {
            throw persoError("VALIDATION_ERROR", "mot de passe trop faible", {
                fields: { newPassword: "min 8, une maj, une min, un chiffre" }
            })
        }

        const user = await UserSchema.findById(userId)
        if (!user) {
            throw persoError("NOT_FOUND", "user introuvable", { fields: { userId } })
        }

        const ok = await bcrypt.compare(currentPassword, user.password)
        if (!ok) {
            throw persoError("VALIDATION_ERROR", "mot de passe actuel incorrect", { fields: { currentPassword: "incorrect" } })
        }

        user.password = newPassword
        await user.save()

        return user
    }
    catch (err) {
        if (err && err.type && err.message) throw err

        if (err.name === "ValidationError") {
            const fields = {}
            for (let key in err.errors) {
                fields[key] = err.errors[key].message
            }
            throw persoError("VALIDATION_ERROR", "changement invalide", { fields })
        }

        throw persoError("DB_ERROR", "erreur pour changer le mot de passe", { original: err.message })
    }
}

async function updateUserAvatar(userId, avatarUrl) {
    assertValidId(userId, "userId")
  
    if (typeof avatarUrl !== "string" || avatarUrl.trim() === "") {
        throw persoError("VALIDATION_ERROR", "c'est pas bon", {
            fields: { avatar: "url pas bon" }
        })
    }
  
    const updated = await UserSchema.findByIdAndUpdate(
        userId,
        { avatar: avatarUrl, updatedAt: new Date() },
        { new: true, runValidators: true }
    )
  
    if (!updated) {
        throw persoError("NOT_FOUND", "pas trouver user", { fields: { userId } })
    }
  
    return updated
}

function toAvatarUrl(user) {
    let raw =
      user?.avatarUrl ||
      user?.avatarPath ||
      user?.avatar ||
      user?.photo ||
      user?.profileImage
  
    if (!raw) return null
  
    let f = String(raw).replace(/\\/g, "/")
    const base = process.env.BASE_URL || "http://localhost:3000"
  
    if (/^https?:\/\//i.test(f)) return f
    if (f.startsWith("/uploads/")) return `${base}${f}`
    if (f.startsWith("uploads/"))  return `${base}/${f}`
    return `${base}/uploads/photos/${f}`
}
  
function toUserDto(u) {
    const n = u.name || ""
    const ln = u.lastname || ""
    const fullName = `${n} ${ln}`.trim()
    return {
        _id: u._id,
        email: u.email,
        nickname: u.nickname,
        name: n || (fullName || u.email),
        lastname: ln,
        avatarUrl: toAvatarUrl(u),
    }
}  

async function getUserById(userId) {
    try {
        assertValidId(userId, "userId")

        const user = await UserSchema.findById(userId)
        if (!user) {
            throw persoError("NOT_FOUND", "pas trouver user", { fields: { userId }})
        }

        return toUserDto(user)
    }
    catch(err) {
        throw persoError("DB_ERROR", "erreur pour récupérer le user", { original: err.message })
    }
}

// Recherche par email (partielle, insensible à la casse)
async function searchUsersByEmail(q = "", limit = 10) {
    const term = String(q || "").trim()
    if (!term) return []
    // échapper les caractères spéciaux regex
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(escaped, 'i')
    const docs = await UserSchema.find({ email: re })
        .select('_id email nickname name lastname avatar createdAt')
        .limit(Math.max(1, Math.min(50, limit)))
        .lean()
    return docs
}

module.exports = {
    createUser,
    deleteUser,
    updateUserProfile,
    changeUserPassword,
    updateUserAvatar,
    getUserById,
    searchUsersByEmail,
}
