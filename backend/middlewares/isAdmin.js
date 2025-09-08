function isAdmin(req, res, next) {
    const user = req.user

    if(!user) {
        return res.status(401).json({ error: "pas connecté" })
    }

    if(user.role !== "admin") {
        return res.status(403).json({error: "Acces refusé, réserver qu'aux admins"})
    }

    next()
}

module.exports = isAdmin