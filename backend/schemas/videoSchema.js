const mongoose = require("mongoose")

const VideoSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "User"
    },
    name: {
        type: String,
        required: true
    },
    url: {
        type: String,
        required: true,
        match: /^https?:\/\/.+/i
    },
    size: {
        type: Number,
        required: false
    },
    format: {
        type: String,
        required: false
    },
    videoDuration: {
        type: Number,
        required: false,
        default: null
    },
    dateUpload: {
        type: Date,
        default: Date.now
    },
    dateUpdate: {
        type: Date,
        default: Date.now
    }
})

module.exports = mongoose.model("Video", VideoSchema)