const mongoose = require("mongoose")

const planClientSchema = new mongoose.Schema({
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
    contenu: {
        type: String,
        trim: true,
        required: true
    }

},{
    timestamps: true,
    versionKey: false
})

planClientSchema.index({userId: 1, date: 1})
planClientSchema.index({sharedWithClientId: 1})

module.exports = mongoose.model("PlanClient", planClientSchema)