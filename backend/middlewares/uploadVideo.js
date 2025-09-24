const multer = require("multer")
const fs = require("fs")
const path = require("path")

const uploadDir = path.join(__dirname, "..", "uploads", "videos")
fs.mkdirSync(uploadDir, { recursive: true })

const typesAutorises = {
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/quicktime": ".mov",
    "video/x-matroska": ".mkv"
}

const tailleMaxMo = Number(process.env.MAX_VIDEO_MB || 200)
const tailleMaxOctects = tailleMaxMo * 1024 * 1024

function creerNomDeFichier(file) {
    const ext = typesAutorises[file.mimetype]
    const alea = Math.round(Math.random() * 1e9)
    const horodatage = Date.now()
    return `${horodatage}-${alea}${ext}`
}

const stockage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir)
    },
    filename: (req, file, cb) => {
        if(!file || !file.mimetype || !typesAutorises[file.mimetype]) {
            return cb(new Error("Type de fichier non autorisé. Formats acceptés: mp4, webm, mov, mkv"))
        }

        const nomFinal = creerNomDeFichier(file)

        cb(null, nomFinal)
    }
})

function filtreVideo(req, file, cb) {
    if(!file || !file.mimetype) {
        return cb(new Error("Fichier invalide"), false)
    }

    if(typesAutorises[file.mimetype]) {
        return cb(null, true)
    }

    return cb(new Error("Type de fichier non autorisé. Formats acceptés: mp4, webm, mov, mkv"), false)
}

const uploadVideo = multer({
    storage: stockage,
    fileFilter: filtreVideo,
    limits: {
        fileSize: tailleMaxOctects
    }
})

function gererErreurUpload(err, req, res, next) {
    if (err && err.code ==="LIMIT_FILE_SIZE") {
        return res.status(413).json({
            ok: false,
            error: "VIDEO_TROP_GROSSE",
            message: `La vidéo dépasse ${tailleMaxMo} Mo`
        })
    }

    if (err && err.message && err.message.startsWith("Type de fichier non autorisé")) {
        return res.status(400).json({
            ok: false,
            error: "FORMAT_INVALIDE",
            message: err.message
        })
    }

    if(err) {
        return res.status(400).json({
            ok: false,
            error: "UPLOAD_ECHOUE",
            message: err.message || "Echec de l'envoie de la vidéo"
        })
    }

    next()
}


module.exports = {
    uploadVideo,
    gererErreurUpload,
    uploadDir
}