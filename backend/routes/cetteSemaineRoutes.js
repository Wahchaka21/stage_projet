const express = require("express")
const cetteSemaineController = require("../controllers/cetteSemaineController")
const isAuth = require("../middlewares/authCheck")

const router = express.Router()

router.get("/mine", isAuth, cetteSemaineController.handleGetMyCetteSemaine)

module.exports = router