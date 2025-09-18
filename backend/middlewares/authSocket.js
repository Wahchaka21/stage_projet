const {verifyToken} = require("../utils/jwt")

function authSocket(socket, next) {
    try {
        let token = null

        const h = socket.handshake.header?.authorization
        if(typeof h === "string") {
            const m = h.match(/^Bearer\s+(.+)$/i)
            if(m) {
                token = m[1]
            }
        }
        
        if (!token && socket.handshake.auth && typeof socket.handshake.auth.token === "string") {
            token = socket.handshake.auth.token
        }

        if (!token && socket.handshake.query && typeof socket.handshake.query.token === "string") {
            token = socket.handshake.query.token
        }

        if (!token) {
            return next(new Error("NO_TOKEN"))
        }

        const payload = verifyToken(token)
        socket.data.userId = String(payload.sub)
        next()
    }
    catch (err) {
        next(new Error("BAD_TOKEN"))
    }
}

module.exports = {authSocket}
