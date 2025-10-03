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
    title: {
        type: String,
        default: ""
    },
    contenu: {
        type: String,
        trim: true,
        required: true
    },
    videos: [{
        videoId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Video",
            required: true
        },
        url: {
            type: String,
            required: true
        },
        name: {
            type: String,
            default: ""
        },
        duration: {
            type: Number,
            default: 0
        }
    }]
},{
    timestamps: true,
    versionKey: false
})

planClientSchema.index({userId: 1, createdAt: -1})
planClientSchema.index({sharedWithClientId: 1, createdAt: -1})

module.exports = mongoose.model("PlanClient", planClientSchema)