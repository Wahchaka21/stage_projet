const passport = require("passport")

const isAuth = passport.authenticate("jwt", { session: false })

module.exports = isAuth