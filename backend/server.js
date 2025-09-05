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
const authRoutes = require("./routes/auth")

const app = express()

app.set('trust proxy', 1)

mongoose.connect(config.mongo_url)
    .then(() => console.log("MongoDB connecté"))
    .catch(err => console.error("Erreur de connexion MongoDB :", err))

app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true, limit: '1mb' }))

app.use(helmet())

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim())

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true)
    return allowedOrigins.includes(origin) ? cb(null, true) : cb(new Error('Not allowed by CORS'))
  },
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  optionsSuccessStatus: 204
}))

app.use(passport.initialize())

app.use("/auth", authRoutes)

const PORT = config.port || 3000
app.listen(PORT, () => {
    console.log(`serveur lancé http://localhost:${PORT}`)
})