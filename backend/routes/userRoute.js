const express = require("express")
const userController = require("../controllers/userController")
const isAuth = require("../middlewares/authCheck")
const User = require("../schemas/userSchema")

const router = express.Router()

router.get("/:userId", isAuth, userController.handleGetUserById)
router.delete("/delete", isAuth, userController.handleDeleteMe)

// Renvoyer "le coach" (premier admin trouvé)
router.get('/coach', isAuth, async (req, res) => {
  try {
    const coach = await User.findOne({ role: 'admin' })
      .select('_id name nickname email role')
      .lean();
    if (!coach) {
      return res.status(404).json({ error: { code: 'NO_COACH', message: 'Aucun coach trouvé' } });
    }
    return res.json({ data: coach });
  } catch (e) {
    return res.status(500).json({ error: { code: 'DB_ERROR', message: 'Erreur serveur', detail: e.message } });
  }
});


module.exports = router