try {
    require('dotenv').config({ path: __dirname + '/.env' })
} 
catch (e) {
    console.warn("Module 'dotenv' non installé. Assurez-vous que les variables d'environnement sont définies.")
}

const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const helmet = require("helmet")
const config = require("./config")
const passport = require("./utils/passport")

const app = express()

// Si l'app est derrière un reverse proxy (nginx, heroku), activer pour un IP correct en rate limiting
app.set('trust proxy', 1)

mongoose.connect(config.mongo_url)
    .then(() => console.log("MongoDB connecté"))
    .catch(err => console.error("Erreur de connexion MongoDB :", err))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Sécurité HTTP
app.use(helmet())

// CORS restreint
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim())

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true) // Autorise outils sans origin (curl, Postman) ; durcir en prod si nécessaire
    return allowedOrigins.includes(origin) ? cb(null, true) : cb(new Error('Not allowed by CORS'))
  },
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  optionsSuccessStatus: 204
}))

app.use(passport.initialize())

const PORT = config.port || 3000
app.listen(PORT, () => {
    console.log(`serveur lancé http://localhost:${PORT}`)
})
