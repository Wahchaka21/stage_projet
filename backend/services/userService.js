const UserSchema = require("../schemas/userSchema")
const { isValideObjectId } = require("../utils/validator")
const persoError = require("../utils/error")
const bcrypt = require("bcryptjs")
const rateLimit = require('express-rate-limit')
const validator = require('validator')

function assertValidId(id, name = "ID") {
    const value = String(id)
    if (!isValideObjectId(value)) {
        throw persoError("INVALID_ID", `${name} invalide`, { fields: { [name]: "ID pas bon" } })
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
    const commonPatterns = ['123456', 'password', 'azerty', 'qwerty', 'admin', "mot de passe", "111", "123", "222", "333", "abc"];
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
    } 
    else {
        const email = userData.email.trim().toLowerCase();
        if (!validator.isEmail(email)) {
            errors.email = 'Format d\'email invalide';
        } 
        else if (email.length > 254) {
            errors.email = 'Email trop long';
        } 
        else {
            cleanData.email = email;
        }
    }
    
    // Nom d'utilisateur (si applicable)
    if (userData.nickname) {
        const nickname = userData.nickname.trim();
        if (nickname.length < 3 || nickname.length > 30) {
            errors.nickname = 'Le nom d\'utilisateur doit contenir entre 3 et 30 caractères';
        } 
        else if (!/^[a-zA-Z0-9_-]+$/.test(nickname)) {
            errors.nickname = 'Le nom d\'utilisateur ne peut contenir que des lettres, chiffres, tirets et underscores';
        } 
        else {
            cleanData.nickname = nickname;
        }
    }
    
    // Nom et prénom
    ['name', 'lastname'].forEach(field => {
        if (userData[field]) {
            const value = userData[field].trim();
            if (value.length > 50) {
                errors[field] = `${field} trop long`;
            } 
            else if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(value)) {
                errors[field] = `${field} contient des caractères non autorisés`;
            } 
            else {
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
            loginAttempts: 0,
            accountLocked: false,
            ...(clientIp ? { ip: clientIp } : {})
        }

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

const {DELETION_CONFIG, DELETION_TYPES } = require("../utils/deletion")

/**
 * Valide les permissions de suppression
 */
function validateDeletionPermissions(requestingUser, targetUser, deletionType) {
  const errors = []
  if (!requestingUser) {
    errors.push('Utilisateur authentifié requis')
    return errors
  }

  switch (deletionType) {
    case DELETION_TYPES.SELF_DELETE:
      if (String(requestingUser._id) !== String(targetUser._id)) {
        errors.push('Impossible de supprimer un autre utilisateur que soi-même')
      }
      break

    case DELETION_TYPES.ADMIN_DELETE:
      if (requestingUser.role !== 'admin') {
        errors.push('Permissions administrateur requises')
      }
      if (requestingUser.role === 'admin' && targetUser.role === 'admin') {
        errors.push('Impossible de supprimer un autre administrateur')
      }
      break

    case DELETION_TYPES.GDPR_DELETE:
      break

    default:
      errors.push('Type de suppression non valide')
  }
  return errors
}

/**
 * Archive les données avant suppression (pour audit/récupération)
 */
async function archiveUserData(user, deletionContext) {
    try {
        const archiveData = {
            originalUserId: user._id,
            userData: {
                email: user.email,
                nickname: user.nickname,
                name: user.name,
                lastname: user.lastname,
                role: user.role,
                createdAt: user.createdAt,
                lastLogin: user.lastLogin
            },
            deletionContext: {
                deletedAt: new Date(),
                deletedBy: deletionContext.requestingUserId,
                deletionType: deletionContext.type,
                reason: deletionContext.reason,
                ipAddress: deletionContext.ipAddress
            },
            dataHash: require('crypto')
                .createHash('sha256')
                .update(JSON.stringify(user.toObject()))
                .digest('hex')
        };

        console.log(`[USER_DELETION_ARCHIVE] ${JSON.stringify(archiveData)}`);
        
        return archiveData;
    } catch (error) {
        throw persoError("ARCHIVE_ERROR", "Erreur lors de l'archivage", { 
            original: error.message 
        });
    }
}

/**
 * Nettoyage des données liées (cascade)
 */
async function cleanupRelatedData(userId, options = { dryRun: false }) {
    const cleanupTasks = [];

    try {
        if (!options.dryRun) {
            await Promise.all(cleanupTasks);
        }

        return {
            tasksExecuted: cleanupTasks.length,
            dryRun: options.dryRun
        };
    } catch (error) {
        throw persoError("CLEANUP_ERROR", "Erreur lors du nettoyage des données liées", {
            original: error.message
        });
    }
}

/**
 * Suppression sécurisée d'utilisateur
 */
async function deleteUser(userId, deletionContext = {}) {
    const startTime = Date.now();
    
    try {
        assertValidId(userId, "userId");

        const {
            requestingUser,
            type = DELETION_TYPES.ADMIN_DELETE,
            reason = 'Non spécifié',
            passwordConfirmation = null,
            ipAddress = 'unknown',
            forceDelete = false
        } = deletionContext;

        const userToDelete = await UserSchema.findById(userId);
        if (!userToDelete) {
            throw persoError("NOT_FOUND", "Utilisateur introuvable", { 
                fields: { userId: "Cet utilisateur n'existe pas" }
            });
        }

        const permissionErrors = validateDeletionPermissions(requestingUser, userToDelete, type);
        if (permissionErrors.length > 0) {
            throw persoError("PERMISSION_DENIED", "Permissions insuffisantes", {
                fields: { permissions: permissionErrors.join(', ') }
            });
        }

        if (type === DELETION_TYPES.SELF_DELETE && DELETION_CONFIG.REQUIRE_PASSWORD_CONFIRMATION) {
            if (!passwordConfirmation) {
                throw persoError("VALIDATION_ERROR", "Confirmation par mot de passe requise", {
                    fields: { password: "Veuillez confirmer votre mot de passe" }
                });
            }

            const isPasswordValid = await bcrypt.compare(passwordConfirmation, userToDelete.password);
            if (!isPasswordValid) {
                console.error(`[SECURITY] Invalid password for user deletion: ${userToDelete.email} from IP: ${ipAddress}`);
                throw persoError("INVALID_CREDENTIALS", "Mot de passe incorrect", {
                    fields: { password: "Mot de passe incorrect" }
                });
            }
        }

        if (userToDelete.isDeleted && !forceDelete) {
            throw persoError("ALREADY_DELETED", "Utilisateur déjà supprimé", {
                fields: { status: "Cet utilisateur est déjà marqué pour suppression" }
            });
        }

        const archiveData = await archiveUserData(userToDelete, {
            requestingUserId: requestingUser?._id,
            type,
            reason,
            ipAddress
        });

        let result;

        if (DELETION_CONFIG.USE_SOFT_DELETE && !forceDelete) {
            result = await UserSchema.findByIdAndUpdate(
                userId,
                {
                    $set: {
                        isDeleted: true,
                        deletedAt: new Date(),
                        deletedBy: requestingUser?._id,
                        deletionType: type,
                        deletionReason: reason,
                        originalData: archiveData.dataHash
                    }
                },
                { new: true}
            )

        } else {
            await cleanupRelatedData(userId);
            result = await UserSchema.findByIdAndDelete(userId);
        }
        console.log(`[SECURITY] User deletion: ${userToDelete.email} by ${requestingUser?.email || 'system'} (${type}) from IP: ${ipAddress} in ${Date.now() - startTime}ms`);

        return {
            success: true,
            deletionType: DELETION_CONFIG.USE_SOFT_DELETE && !forceDelete ? 'soft' : 'hard',
            user: result,
            archiveId: archiveData.dataHash
        };

    } catch (err) {
        console.error(`[SECURITY ERROR] User deletion failed: ${err.message} for userId: ${userId} by: ${deletionContext.requestingUser?.email || 'unknown'} from IP: ${deletionContext.ipAddress || 'unknown'}`);

        if (err.type) throw err;
        throw persoError("DB_ERROR", "Erreur lors de la suppression", { 
            original: process.env.NODE_ENV === 'development' ? err.message : 'Erreur interne'
        });
    }
}

/**
 * Récupération d'un utilisateur supprimé (soft delete uniquement)
 */
async function restoreUser(userId, requestingUser) {
    try {
        assertValidId(userId, "userId");

        if (!requestingUser || !['admin'].includes(requestingUser.role)) {
            throw persoError("PERMISSION_DENIED", "Permissions administrateur requises");
        }

        const user = await UserSchema.findById(userId);
        if (!user || !user.deletedAt) {
            throw persoError("NOT_FOUND", "Utilisateur supprimé introuvable");
        }

        const restoredUser = await UserSchema.findByIdAndUpdate(userId, {
            $unset: {
                deletedAt: 1,
                deletedBy: 1,
                deletionType: 1,
                deletionReason: 1
            },
            $set: {isDeleted: false}
        }, 
        { new: true });

        console.log(`[SECURITY] User restored: ${restoredUser.email} by ${requestingUser.email}`);

        return restoredUser;
    } catch (err) {
        if (err.type) throw err;
        throw persoError("DB_ERROR", "Erreur lors de la restauration", { 
            original: err.message 
        });
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

        const current = await UserSchema.findById(userId).select('isDeleted').lean()
        if (!current) {
            throw persoError("NOT_FOUND", "Utilisateur introuvable", { fields: { userId } })
        }
        if (current.isDeleted) {
            throw persoError("PERMISSION_DENIED", "Compte supprimé (soft), action refusée")
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

    } 
    catch (err) {
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

        const pwdErrors = validatePassword(newPassword)
        if (pwdErrors.length) {
            throw persoError("VALIDATION_ERROR", "mot de passe non conforme", {
                fields: { newPassword: pwdErrors.join(', ') }
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

        if (user.isDeleted) {
            throw persoError("PERMISSION_DENIED", "Compte supprimé (soft), action refusée")
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

        const user = await UserSchema.findOne({_id: userId, isDeleted: false})
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
    const docs = await UserSchema.find({ email: re, isDeleted: false })
        .select('_id email nickname name lastname avatar createdAt')
        .limit(Math.max(1, Math.min(50, limit)))
        .lean()
    return docs
}

module.exports = {
    deleteUser,
    restoreUser,
    updateUserProfile,
    changeUserPassword,
    updateUserAvatar,
    getUserById,
    searchUsersByEmail,
    createUser,
    applyCreateUserSecurity,
    validatePassword
}