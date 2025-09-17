const {verifyToken} = require("../utils/jwt")

function authSocket(socket, next) {
    try {
        const auth = socket.handshake.headers["authorization"] || ""
        let token
        if (auth.startsWith("Bearer ")) {
            token = auth.slice(7)
        } 
        else {
            token = null
        }
        if (!token) {
            return next(new Error("NO_TOKEN"))
        }
        const payload = verifyToken(token)
        socket.data.userId = String(payload.sub)
        next()
    }
    catch(err) {
        next(new Error('BAD_TOKEN'))
    }
}

module.exports = {authSocket}
