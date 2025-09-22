const express = require("express")
const multer = require("multer")
const fs = require("fs")
const path = require("path")

// Créer le dossier upload si il existe pas
const uploadDir = path.join(__dirname, "..", "uploads", "photos")
fs.mkdirSync(uploadDir, { recursive: true })

const storage = multer.diskStorage({ //pour utiliser un stockage sur disque
    destination: (req, file, cb) => { //c'est la que le fichier sera enregistrer
        cb(null, uploadDir)
    },
    filename: (req, file, cb) => {
        // console.log("fichier recu :", file)
        if (!file || typeof file.originalname !== "string") {
            // console.error("fichier reçu invalide :", file)
            return cb(new Error("fichier invalide"))
        }
        
        const ext = path.extname(file.originalname) //le extname c'est pour les png, jpeg etc...
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}` //et ça c'est pour eviter que si deux user upload en même temps que ça donne le même nom
        cb(null, uniqueName)
    }
})
const upload = multer({ storage })

module.exports = upload