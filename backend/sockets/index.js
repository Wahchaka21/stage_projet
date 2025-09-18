// sockets/index.js
const { Server } = require('socket.io')
const { authSocket } = require('../middlewares/authSocket')
const { chatHandlers } = require('../handlers/chatHandler')

function initSockets(httpServer, options) {
  let origins = []
  if (options && Array.isArray(options.allowedOrigins)) {
    origins = options.allowedOrigins
  }

  const io = new Server(httpServer, {
    cors: {
      origin: origins,
      credentials: true,
      allowedHeaders: ['authorization', 'content-type'],
    }
  })

  io.use(authSocket)

  io.on('connection', (socket) => {
    chatHandlers(io, socket)
  })

  return io
}

module.exports = { initSockets }