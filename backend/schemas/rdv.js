const mongoose = require("mongoose")

const rdvSchema = new mongoose.Schema({
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
    date: {
        type: Date,
        required: true,
        index: true
    },
    description: {
        type: String,
        trim: true,
        maxlength: 2000
    },
}, {
    timestamps: true,
    versionKey: false
})

rdvSchema.index({ userId: 1, date: 1 });
rdvSchema.index({ sharedWithClientId: 1, date: 1 });

module.exports = mongoose.model("Rdv", rdvSchema)