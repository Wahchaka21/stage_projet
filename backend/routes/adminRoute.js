const express = require("express")
const isAuth = require("../middlewares/authCheck")
const isAdmin = require("../middlewares/isAdmin")
const adminController = require("../controllers/adminController")
const rdvController = require("../controllers/rdvController")
const {isValideObjectId} = require("../utils/validator")
const planClientController = require("../controllers/planClientController")
const {uploadVideo} = require("../middlewares/uploadVideo")
const cetteSemaineController = require("../controllers/cetteSemaineController")
const planAlimentaireController = require("../controllers/planAlimenaireController")

const router = express.Router()

router.param("userId", (req, res, next, val) => {
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

router.post("/createPlanClient", isAuth, isAdmin, adminController.handleCreatePlanClient)
router.delete("/deletePlanClient/:planClientId", isAuth, isAdmin, adminController.handleDeletePlanClient)

router.get("/planClient/user/:userId", isAuth, isAdmin, planClientController.handleGetPlanClientForUser)

router.post("/planClient/:planClientId/attachVideo", isAuth, isAdmin, uploadVideo.single("video"), adminController.handleUploadVideoForPlan)
router.delete("/planClient/:planClientId/video/:videoId", isAuth, isAdmin, adminController.handleDeleteVideoFromPlan)

router.post("/createCetteSemaine", isAuth, isAdmin, cetteSemaineController.handleCreateCetteSemaine)
router.delete("/deleteCetteSemaine/:cetteSemaineId", isAuth, isAdmin, cetteSemaineController.handleDeleteCetteSemaine)
router.get("/cetteSemaine/user/:userId", isAuth, isAdmin, cetteSemaineController.handleGetCetteSemaineForUser)
router.patch("/updateCetteSemaine/:cetteSemaineId", isAuth, isAdmin, cetteSemaineController.handleUpdateCetteSemaine)

router.post("/createPlanAlimentaire", isAuth, isAdmin, planAlimentaireController.handleCreatePlanAlimentaire)
router.delete("/deletePlanAlimentaire/:planAlimentaireId", isAuth, isAdmin, planAlimentaireController.handleDeletePlanAlimenaire)
router.get("/planAlimentaire/user/:userId", isAuth, isAdmin, planAlimentaireController.handleGetPlanAlimentaireForUser)
router.patch("/updatePlanAlimentaire/:planAlimentaireId", isAuth, isAdmin, planAlimentaireController.handleUpdatePlanAlimentaire)

module.exports = router