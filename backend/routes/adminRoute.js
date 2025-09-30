const express = require("express")
const isAuth = require("../middlewares/authCheck")
const isAdmin = require("../middlewares/isAdmin")
const adminController = require("../controllers/adminController")
const rdvController = require("../controllers/rdvController")
const {isValideObjectId} = require("../utils/validator")

const router = express.Router()

router.param('userId', (req, res, next, val) => {
  if (!isValideObjectId(val)) {
    return res.status(400).json({ error: "ID d'utilisateur invalide" })
  }
  next()
})

router.get("/users", isAuth, isAdmin, adminController.handleGetAllUser)
router.patch("/users/:userId", isAuth, isAdmin, adminController.handleUpdateUser)
router.patch("/users/:userId/role", isAuth, isAdmin, adminController.handleChangeUserRole)
router.delete("/users/:userId", isAuth, isAdmin, adminController.handleDeleteUser)

router.post("/createRdv", isAuth, isAdmin, adminController.handleCreateRdv)
router.delete("/deleteRdv/:rdvId", isAuth, isAdmin, adminController.handleDeleteRdv)

router.get("/rdv/user/:userId", isAuth, isAdmin, rdvController.handleGetRdvsForUser)

module.exports = router