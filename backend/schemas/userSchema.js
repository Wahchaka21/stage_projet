const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")

const DELETION_TYPES = {
  ADMIN_DELETE: 'admin_delete',
  SELF_DELETE: 'self_delete',
  GDPR_DELETE: 'gdpr_delete',
  SYSTEM_DELETE: 'system_delete'
}

const UserSchema = new mongoose.Schema({
    avatar: {
        type: String,
        required: false
    },  
    nickname: {
        type: String,
        unique: true,
        sparse: true
    },
    name: {
        type: String,
        required: true,
        minlength: 2,
    },
    lastname: {
        type: String,
        required: true
    },
    gender: {
        type: String,
        enum: ["Homme", "Femme"],
        required: false
    },
    email: {
        type: String,
        required: true,
        unique: true,
        match: /.+\@.+\..+/,
        lowercase: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6,
    },
    role: {
        type: String,
        enum: ["user", "admin"],
        default: "user"
    },
    city: {
        type: String,
        required: false
    },
    phone: {
        type: String,
        required: false
    },
    address: {
        type: String,
        required: false
    },      
    postCode: {
        type: String,
        required: false
    },
    createdAt: {
        type: Date,
        default: Date.now,
        required: false
    },
    updatedAt: {
        type: Date,
        default: Date.now,
        required: false
    },
    lastLogin: {
        type: Date,
        default: Date.now,
        required: false
    },
    loginAttempts: {
        type: Number,
        default: 0
    },
    accountLocked: {
        type: Boolean,
        default: false
    },
    isDeleted: { 
        type: Boolean, default: false 
    },
    deletedAt: { 
        type: Date 
    },
    deletedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    },
    deletionType: { 
        type: String, 
        enum: Object.values(DELETION_TYPES), 
        required: false 
    },
    deletionReason: { 
        type: String 
    },
    originalData: { 
        type: String 
    }
})

UserSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
)


UserSchema.set('toJSON', {
    transform: function (doc, ret) {
        delete ret.password
        delete ret.__v
        return ret
    }
})
UserSchema.set('toObject', {
    transform: function (doc, ret) {
        delete ret.password
        delete ret.__v
        return ret
    }
})

const ROUNDS = Number(process.env.BCRYPT_ROUNDS || 12)

UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next()
  try {
    this.password = await bcrypt.hash(this.password, ROUNDS)
    next()
  } 
  catch (err) { next(err) }
})

module.exports = mongoose.model("User", UserSchema)