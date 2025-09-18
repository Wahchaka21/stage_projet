const mongoose = require("mongoose")

const messageSchema = new mongoose.Schema({
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Conversation",
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    text: {
        type: String,
        required: true,
        trim: true,
        maxLength: 5000
    },
    at: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
})

messageSchema.index({ conversationId: 1, at: -1 })

module.exports = mongoose.model("Message", messageSchema)