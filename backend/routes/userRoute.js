const express = require("express")
const userController = require("../controllers/userController")
const isAuth = require("../middlewares/authCheck")
const User = require("../schemas/userSchema")

const router = express.Router()

router.get("/coach", isAuth, userController.handleGetCoach)
router.get("/:userId", isAuth, userController.handleGetUserById)
router.delete("/delete", isAuth, userController.handleDeleteMe)

module.exports = router