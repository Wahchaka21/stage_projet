const express = require("express")
const rdvController = require("../controllers/rdvController")
const isAuth = require("../middlewares/authCheck")

const router = express.Router()

router.get("/mine", isAuth, rdvController.handleGetMyRdvs)

module.exports = router
