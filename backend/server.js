try {
  require('dotenv').config({ path: __dirname + '/.env' })
} 
catch (err) {
  console.warn("Module 'dotenv'", err)
}

const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const helmet = require("helmet")
const config = require("./config")
const passport = require("./utils/passport")
const authRoutes = require("./routes/auth")
const userRoutes = require("./routes/userRoute")
const adminRoutes = require("./routes/adminRoute")
const chatRoutes = require("./routes/chatRoute")
const cookieParser = require("cookie-parser")
const { initSockets } = require("./sockets")

const app = express()

app.set('trust proxy', 1)

mongoose.connect(config.mongo_url)
  .then(() => console.log("MongoDB connecté"))
  .catch(err => console.error("Erreur de connexion MongoDB :", err))

const { startArchivePurgeJob } = require("./utils/purgeArchives")
startArchivePurgeJob()

app.use(express.json({ limit: "1mb" }))
app.use(express.urlencoded({ extended: true, limit: "1mb" }))
app.use(helmet())
app.use(cookieParser())

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true)

    const raw = process.env.CORS_ORIGINS || "http://localhost:5173,http://localhost:4200"
    const allowedOrigins = raw.split(",").map(o => o.trim())

    if (allowedOrigins.includes(origin)) {
      cb(null, true)
    } 
    else {
      cb(new Error("Not allowed by CORS"))
    }
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  optionsSuccessStatus: 204
}))

app.use(passport.initialize())

app.use("/auth", authRoutes)
app.use("/user", userRoutes)
app.use("/admin", adminRoutes)
app.use("/chat", chatRoutes)

const PORT = config.port || 3000
const server = app.listen(PORT, () => {
  console.log(`Serveur lancé http://localhost:${PORT}`)
})

const allowed = (process.env.CORS_ORIGINS || "http://localhost:4200")
  .split(",")
  .map(s => s.trim())

const io = initSockets(server, { allowedOrigins: allowed })

app.set("io", io)