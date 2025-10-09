const mongoose = require("mongoose")

const cetteSemaineSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    sharedWithClientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    title: {
        type: String,
        default: ""
    },
    contenu: {
        type: String,
        trim: true,
        required: true
    }
}, {
    timestamps: true,
    versionKey: false
})

cetteSemaineSchema.index({ userId: 1, createdAt: -1 })
cetteSemaineSchema.index({ sharedWithClientId: 1, createdAt: -1 })

module.exports = mongoose.model("CetteSemaine", cetteSemaineSchema)