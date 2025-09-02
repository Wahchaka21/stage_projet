const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")

const UserSchema = new mongoose.Schema({
    avatar: {
        type: String,
        required: false
    },  
    nickname: {
        type: String,
        unique: true,
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
        type: Number,
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
    }
})

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

UserSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next()

    try {
        const hash = await bcrypt.hash(this.password, 10)
        this.password = hash
        next()
    } 
    catch (err) {
        next(err)
    }
})

module.exports = mongoose.model("User", UserSchema)
