const { Server } = require("socket.io")
const authSocket = require("../middlewares/authSocket")
const chatHandlers = require("../handlers/chatHandler")

function initSockets(httpServer, { allowedOrigins }) {
    const io = new Server(httpServer, {
        cors: {
            origin: allowedOrigins,
            credentials: true,
            allowedHeaders: ["authorization", "content-type"],
        }
    })
    io.use(authSocket)
    io.on("connection", (socket) => {
        chatHandlers(io, socket)
    })

    return io
}

module.exports = {initSockets}