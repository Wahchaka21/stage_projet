const UserSchema = require("../schemas/userSchema")
const { isValideObjectId } = require("../utils/validator")
const persoError = require("../utils/error")
const bcrypt = require("bcryptjs")
const rateLimit = require('express-rate-limit')
const validator = require('validator')

function assertValidId(id, name = "ID") {
    if (!isValideObjectId(id)) {
        throw persoError("INVALID_ID", `${name} invalide`, { fields: { [name]: "ID pas bon" } } )
    }
}

const createUserRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 3,
    message: "Trop de tentatives de création de compte"
})

// Validation avancée des mots de passe
function validatePassword(password) {
    const errors = [];
    
    if (!password || typeof password !== 'string') {
        errors.push('Le mot de passe est requis');
        return errors;
    }
    
    if (password.length < 8) {
        errors.push('Le mot de passe doit contenir au moins 8 caractères');
    }
    
    if (!/(?=.*[a-z])/.test(password)) {
        errors.push('Le mot de passe doit contenir au moins une minuscule');
    }
    
    if (!/(?=.*[A-Z])/.test(password)) {
        errors.push('Le mot de passe doit contenir au moins une majuscule');
    }
    
    if (!/(?=.*\d)/.test(password)) {
        errors.push('Le mot de passe doit contenir au moins un chiffre');
    }
    
    if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>?])/.test(password)) {
        errors.push('Le mot de passe doit contenir au moins un caractère spécial');
    }
    
    // Vérifier si le mot de passe contient des séquences communes
    const commonPatterns = ['123456', 'password', 'azerty', 'qwerty', 'admin'];
    const lowerPassword = password.toLowerCase();
    for (const pattern of commonPatterns) {
        if (lowerPassword.includes(pattern)) {
            errors.push('Le mot de passe ne peut pas contenir de séquences communes');
            break;
        }
    }
    
    return errors;
}

// Nettoyage et validation des données d'entrée
function sanitizeAndValidateInput(userData) {
    const errors = {};
    const cleanData = {};
    
    // Email
    if (!userData.email || typeof userData.email !== 'string') {
        errors.email = 'Email requis';
    } else {
        const email = userData.email.trim().toLowerCase();
        if (!validator.isEmail(email)) {
            errors.email = 'Format d\'email invalide';
        } else if (email.length > 254) {
            errors.email = 'Email trop long';
        } else {
            cleanData.email = email;
        }
    }
    
    // Nom d'utilisateur (si applicable)
    if (userData.username) {
        const username = userData.username.trim();
        if (username.length < 3 || username.length > 30) {
            errors.username = 'Le nom d\'utilisateur doit contenir entre 3 et 30 caractères';
        } else if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
            errors.username = 'Le nom d\'utilisateur ne peut contenir que des lettres, chiffres, tirets et underscores';
        } else {
            cleanData.username = username;
        }
    }
    
    // Nom et prénom
    ['firstName', 'lastName'].forEach(field => {
        if (userData[field]) {
            const value = userData[field].trim();
            if (value.length > 50) {
                errors[field] = `${field} trop long`;
            } else if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(value)) {
                errors[field] = `${field} contient des caractères non autorisés`;
            } else {
                cleanData[field] = value;
            }
        }
    });
    
    return { errors, cleanData };
}

async function createUser(validUser, clientIp = null) {
    const startTime = Date.now();
    
    try {
        // 1. Validation et nettoyage des données d'entrée
        const { errors: inputErrors, cleanData } = sanitizeAndValidateInput(validUser);
        if (Object.keys(inputErrors).length > 0) {
            throw persoError("VALIDATION_ERROR", "Données d'entrée invalides", {
                fields: inputErrors
            });
        }
        
        // 2. Validation renforcée du mot de passe
        const passwordErrors = validatePassword(validUser.password);
        if (passwordErrors.length > 0) {
            throw persoError("VALIDATION_ERROR", "Mot de passe non conforme", {
                fields: { password: passwordErrors.join(', ') }
            });
        }
        
        // 3. Vérification de l'unicité de l'email AVANT le hachage
        const existingUser = await UserSchema.findOne({ 
            email: cleanData.email 
        }).select('_id').lean();
        
        if (existingUser) {
            // Délai artificiel pour éviter le timing attack
            await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
            throw persoError("DUPLICATE", "Email déjà utilisé", {
                fields: { email: 'Cet email est déjà associé à un compte' }
            });
        }
        
        // 5. Préparation des données finales
        const userData = {
            ...cleanData,
            password: validUser.password,
            createdAt: new Date(),
            isEmailVerified: false,
            loginAttempts: 0,
            accountLocked: false,
            // Ajouter l'IP pour le tracking de sécurité (optionnel)
            ...(clientIp && { registrationIp: clientIp })
        };
        
        // 6. Création de l'utilisateur avec transaction (si MongoDB supporte)
        const newUser = new UserSchema(userData);
        
        // Validation Mongoose
        await newUser.validate();
        
        // Sauvegarde
        const savedUser = await newUser.save();
        
        // 7. Logs de sécurité
        console.log(`[SECURITY] New user created: ${cleanData.email} from IP: ${clientIp || 'unknown'} in ${Date.now() - startTime}ms`);
        
        // 8. Retourner l'utilisateur sans le mot de passe
        const userResponse = savedUser.toObject();
        delete userResponse.password;
        delete userResponse.__v;
        
        return userResponse;
        
    } catch (err) {
        // Logs d'erreur de sécurité
        console.error(`[SECURITY ERROR] User creation failed: ${err.message} from IP: ${clientIp || 'unknown'}`);
        
        // Gestion des erreurs Mongoose
        if (err.name === "ValidationError") {
            const fields = {};
            for (let key in err.errors) {
                fields[key] = err.errors[key].message;
            }
            throw persoError("VALIDATION_ERROR", "Données non conformes au schéma", { fields });
        }
        
        // Gestion des doublons
        if (err.code === 11000) {
            const dupField = Object.keys(err.keyPattern || {})[0] || 'field';
            
            // Délai artificiel pour éviter le timing attack
            await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
            
            throw persoError("DUPLICATE", `${dupField} déjà utilisé`, {
                fields: { [dupField]: 'Cette valeur est déjà utilisée' }
            });
        }
        
        // Si c'est déjà une erreur personnalisée, la relancer
        if (err.type) {
            throw err;
        }
        
        // Erreur générique
        throw persoError("DB_ERROR", "Erreur lors de la création du compte", {
            original: process.env.NODE_ENV === 'development' ? err.message : 'Erreur interne'
        });
    }
}

function applyCreateUserSecurity(req, res, next) {
    return createUserRateLimit(req, res, next);
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

async function searchUsersByEmail(q = "", limit = 10) {
    const term = String(q || "").trim()
    if (!term) return []
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(escaped, 'i')
    const docs = await UserSchema.find({ email: re })
        .select('_id email nickname name lastname avatar createdAt')
        .limit(Math.max(1, Math.min(50, limit)))
        .lean()
    return docs
}

module.exports = {
    deleteUser,
    updateUserProfile,
    changeUserPassword,
    updateUserAvatar,
    getUserById,
    searchUsersByEmail,
    createUser,
    applyCreateUserSecurity,
    validatePassword
}
