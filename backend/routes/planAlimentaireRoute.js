const express = require("express")
const planAlimentaireController = require("../controllers/planAlimenaireController")
const isAuth = require("../middlewares/authCheck")

const router = express.Router()

router.get("/mine", isAuth, planAlimentaireController.handleGetMyPlanAlimentaire)

module.exports = router