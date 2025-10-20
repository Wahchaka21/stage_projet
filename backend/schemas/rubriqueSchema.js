const mongoose = require("mongoose")

const rubriqueSchema = new mongoose.Schema({
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

rubriqueSchema.index({ userId: 1, createdAt: -1 })
rubriqueSchema.index({ sharedWithClientId: 1, createdAt: -1 })

module.exports = mongoose.model("Rubrique", rubriqueSchema)