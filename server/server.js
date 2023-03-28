const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
const createQuestion = require('./createQuestions')

const app = express()
app.use(cors()) // Enable CORS for Express
const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: '*', // Allow connections from all origins
    methods: ['GET', 'POST']
  }
})

const generateRoomCode = () => {
  // Generate a 4-character room code
  return Math.random().toString(36).substr(2, 4).toUpperCase()
}

const rooms = new Map() // Store room information

const onCreateRoom = (socket, userId, options, callback) => {
  const roomCode = generateRoomCode()
  const question = createQuestion(options.type, options.level)

  rooms.set(roomCode, {
    ownerId: userId,
    options,
    players: new Map(),
    answersReceived: 0,
    currentQuestion: question,
    remainingTime: 10000
  })

  console.log(`Room created by user ${userId}:`, roomCode)
  socket.join(roomCode)
  callback(roomCode)
}

const onJoinRoom = (socket, userId, roomCode, playerName, callback) => {
  const room = rooms.get(roomCode)
  if (!room) {
    callback(new Error('Room not found'))
    return
  }

  // Store the player's socket ID and name
  room.players.set(userId, { name: playerName, score: 0 })

  // Join the Socket.IO room
  socket.join(roomCode)

  // Emit an updated player list to all clients in the room except the sender
  const playerList = Array.from(room.players.values())
  io.in(roomCode).emit('playerListUpdate', playerList)

  // Send the room owner's socket ID to the user that just joined the room
  socket.emit('roomOwner', room.ownerId)
  console.log(`User ${userId} joined room ${roomCode}, room owner: ${room.ownerId}`)

  callback(null, roomCode, room.ownerId)
}

const onStartGame = (socket, userId, roomCode, gameOptions) => {
  const room = rooms.get(roomCode)
  if (room && userId === room.ownerId) {
    const question = createQuestion(gameOptions.type, gameOptions.level)
    room.currentQuestion = question
    console.log(`Emitting question: ${JSON.stringify(question)}`)
    io.to(roomCode).emit('startGame', { question, timerDuration: 10000 })

    room.remainingTime = 10000

    if (room.intervalId) clearInterval(room.intervalId)

    room.intervalId = setInterval(() => {
      room.remainingTime -= 1000
      io.to(roomCode).emit('syncTimer', room.remainingTime)

      if (room.remainingTime <= 0) {
        clearInterval(room.intervalId)
      }
    }, 1000)
  }
}

const onAnswer = (socket, roomCode, userId, answer) => {
  const room = rooms.get(roomCode)
  if (room) {
    const player = room.players.get(userId)
    if (player && answer === room.currentQuestion.answer) {
      player.score += 10
    }

    player.answered = true

    const allPlayersAnswered = Array.from(room.players.values()).every(
      (player) => player.answered
    )

    console.log('One player answered')

    if (allPlayersAnswered) {
      clearInterval(room.intervalId)
      room.remainingTime = 10000

      // Reset the 'answered' property for all players
      room.players.forEach((player) => {
        player.answered = false
      })

      const correctAnswer = room.currentQuestion.answer

      const question = createQuestion(room.options.type, room.options.level)
      room.currentQuestion = question // Update the current question for the room

      const scores = Array.from(room.players.values()).map((player) => ({
        id: player.id,
        name: player.name,
        score: player.score,
        increment: answer === correctAnswer ? 10 : 0
      }))
      io.to(roomCode).emit('nextQuestion', { question, scores })
      console.log('Emitting nextQuestion event')

      room.remainingTime = 10000 // Reset the remaining time

      if (room.intervalId) clearInterval(room.intervalId) // Clear previous interval if it exists

      room.intervalId = setInterval(() => {
        room.remainingTime -= 1000
        io.to(roomCode).emit('syncTimer', room.remainingTime)

        if (room.remainingTime <= 0) {
          clearInterval(room.intervalId)
        }
      }, 1000)
    }
  }
}

const onGetPlayerList = (socket, roomCode) => {
  const room = rooms.get(roomCode)
  if (!room) return

  const playerList = Array.from(room.players.values())
  socket.emit('playerListUpdate', playerList)
}

const onGetRoomOwner = (roomCode, callback) => {
  const room = rooms.get(roomCode)
  if (!room) {
    callback(new Error('Room not found'))
    return
  }

  callback(null, room.ownerId)
}

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id)

  // Emit connected event
  socket.emit('connected', socket.id)
  const userId = socket.handshake.query.userId
  console.log('A user connected:', userId, socket.id)

  socket.on('disconnect', () => {
    console.log('A user disconnected:', userId, socket.id)
  })

  socket.on('createRoom', (options, callback) => {
    onCreateRoom(socket, userId, options, callback)
  })

  socket.on('joinRoom', (roomCode, playerName, callback) => {
    onJoinRoom(socket, userId, roomCode, playerName, callback)
  })

  socket.on('startGame', (roomCode, gameOptions) => {
    console.log('startGame event received')
    onStartGame(socket, userId, roomCode, gameOptions)
  })

  console.log('Listening for answer event')
  socket.on('answer', (roomCode, userId, answer) => {
    onAnswer(socket, roomCode, userId, answer)
  })

  socket.on('getPlayerList', (roomCode) => {
    onGetPlayerList(socket, roomCode)
  })

  socket.on('getRoomOwner', (roomCode, callback) => {
    onGetRoomOwner(roomCode, callback)
  })

  // Add other game-related events here
})

const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
