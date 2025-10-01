const express = require("express")
const planClientController = require("../controllers/planClientController")
const isAuth = require("../middlewares/authCheck")

const router = express.Router()

router.get("/mine", isAuth, planClientController.handleGetMyPlanClient)

module.exports = router