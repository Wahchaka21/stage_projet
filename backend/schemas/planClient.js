const mongoose = require("mongoose")

const exerciseSchema = new mongoose.Schema({
    name: {
        type: String,
        default: "Exercice"
    },
    type: {
        type: String,
        enum: ["cardio", "muscu", "mobilite", "autre"],
        default: "muscu"
    },
    sets: {
        type: Number,
        default: 3,
        min: 1
    },
    reps: {
        type: Number,
        default: 12,
        min: 1
    },
    workSec: {
        type: Number,
        default: 0,
        min: 0
    },
    restSec: {
        type: Number,
        default: 90,
        min: 0
    },
    loadKg: {
        type: Number,
        default: 0,
        min: 0
    },
    rpe: {
        type: Number,
        default: 0,
        min: 0,
        max: 10
    },
    hrZone: {
        type: String,
        default: ""
    },
    notes: {
        type: String,
        default: ""
    },
    video: {
        url: {
            type: String,
            default: ""
        },
        name: {
            type: String,
            default: ""
        },
        duration: {
            type: Number,
            default: 0,
            min: 0
        }
    }
}, { _id: true, timestamps: true })

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
        default: ""
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
        size: {
            type: Number,
            default: 0
        },
        format: {
            type: String,
            default: ""
        },
        duration: {
            type: Number,
            default: 0
        }
    }],
    exercises: {
        type: [exerciseSchema],
        default: []
    }
}, { timestamps: true, versionKey: false })

planClientSchema.index({ userId: 1, createdAt: -1 })
planClientSchema.index({ sharedWithClientId: 1, createdAt: -1 })

module.exports = mongoose.model("PlanClient", planClientSchema)
