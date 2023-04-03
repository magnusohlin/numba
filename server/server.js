const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
const createQuestion = require('./createQuestions')
let createAvatar
let funEmoji

import('@dicebear/core').then((core) => {
  createAvatar = core.createAvatar
})

import('@dicebear/collection').then((collection) => {
  funEmoji = collection.funEmoji
})

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

const onCreateRoom = (socket, userId, callback) => {
  const roomCode = generateRoomCode()

  rooms.set(roomCode, {
    ownerId: userId,
    players: new Map(),
    answersReceived: 0,
    remainingTime: 10000,
    questionsAsked: 0
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

  const seed = `${userId}-${Date.now()}`
  const avatarObj = createAvatar(funEmoji, { seed, radius: 10, colors: ['#C5F9CD', '#ECD3F9', '#FFFD9F', '#99E0E3'] })
  const avatar = avatarObj.toString()
  // Store the player's socket ID, name, and unique identifier
  room.players.set(userId, { id: userId, name: playerName, score: 0, avatar })

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
  room.options = gameOptions
  if (room && userId === room.ownerId) {
    const question = createQuestion(gameOptions.type, gameOptions.level)
    room.currentQuestion = question
    room.questionsAsked = 1
    console.log(`Emitting question: ${JSON.stringify(question)}`)
    io.to(roomCode).emit('startGame', { question, timerDuration: 10000, questionsAsked: room.questionsAsked })

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

const onAnswer = (socket, roomCode, userId, answer, remainingTime) => {
  console.log(`Answer received. Room code: ${roomCode}, User ID: ${userId}, Answer: ${answer}, Remaining time: ${remainingTime}`) // Add this line
  const room = rooms.get(roomCode)
  if (room) {
    const player = room.players.get(userId)
    if (player) {
      player.answeredCorrectly = answer === room.currentQuestion.answer
      if (player.answeredCorrectly) {
        player.score += 100 + remainingTime * 10
        player.timeAnswered = remainingTime * 1000// Store the remaining time
      } else {
        player.timeAnswered = -1 // Set -1 if the player didn't answer correctly
      }
    }
    player.answered = true

    const allPlayersAnswered = Array.from(room.players.values()).every(
      (player) => player.answered
    )

    if (allPlayersAnswered) {
      // Calculate the scores array before resetting the remaining time and changing the question
      const scores = Array.from(room.players.values()).map((player) => {
        const isAnswerCorrect = player.answeredCorrectly
        const timeScore = isAnswerCorrect ? player.timeAnswered / 100 : 0
        const increment = isAnswerCorrect ? 100 : 0

        return {
          id: player.id,
          name: player.name,
          score: player.score,
          avatar: player.avatar,
          increment: increment + timeScore
        }
      })

      // Reset the 'answered' property for all players
      room.players.forEach((player) => {
        player.answered = false
      })

      room.questionsAsked++

      const question = createQuestion(room.options.type, room.options.level)
      room.currentQuestion = question // Update the current question for the room

      if (room.questionsAsked <= 10) {
        room.remainingTime = 10000 // Reset the remaining time

        if (room.intervalId) clearInterval(room.intervalId) // Clear previous interval if it exists

        room.intervalId = setInterval(() => {
          room.remainingTime -= 1000
          io.to(roomCode).emit('syncTimer', room.remainingTime)

          if (room.remainingTime <= 0) {
            clearInterval(room.intervalId)
          }
        }, 1000)

        // Emit the 'nextQuestion' event after resetting the remaining time and starting the new timer interval
        io.to(roomCode).emit('nextQuestion', { question, scores, questionsAsked: room.questionsAsked })
      } else {
        io.to(roomCode).emit('endGame', { scores, questionsAsked: room.questionsAsked })
      }
    }
  }
}

const onDisconnect = (socket, userId) => {
  console.log('A user disconnected:', userId, socket.id)
  // Find the room where the user is a player
  const roomCode = findRoomByUserId(userId)
  if (roomCode) {
    const room = rooms.get(roomCode)
    if (room) {
      // Remove the player from the room
      room.players.delete(userId)

      // Update the player list for all clients in the room
      const playerList = Array.from(room.players.values())
      io.in(roomCode).emit('playerListUpdate', playerList)

      // If the disconnected user is the room owner, end the game and delete the room
      if (userId === room.ownerId) {
        io.to(roomCode).emit('endGame', { reason: 'ownerDisconnected' })
        rooms.delete(roomCode)
      }
    }
  }
}

const onLeaveRoom = (socket, userId, roomCode) => {
  const room = rooms.get(roomCode)
  if (!room) return

  const player = room.players.get(userId)
  if (!player) return

  // Remove the player from the room
  room.players.delete(userId)

  // Leave the Socket.IO room
  socket.leave(roomCode)

  // Emit an updated player list to all clients in the room
  const playerList = Array.from(room.players.values())
  io.in(roomCode).emit('playerListUpdate', playerList)

  // If the room owner leaves, end the game for all players
  if (userId === room.ownerId) {
    io.to(roomCode).emit('endGame', { reason: 'ownerDisconnected' })

    // Clean up the room data
    clearInterval(room.intervalId)
    rooms.delete(roomCode)
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

const findRoomByUserId = (userId) => {
  for (const [roomCode, room] of rooms.entries()) {
    if (room.players.has(userId)) {
      return roomCode
    }
  }
  return null
}

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id)

  // Emit connected event
  socket.emit('connected', socket.id)
  const userId = socket.handshake.query.userId
  console.log('A user connected:', userId, socket.id)

  socket.on('disconnect', () => {
    onDisconnect(socket, userId)
  })

  socket.on('leaveRoom', (roomCode, userId) => {
    onLeaveRoom(socket, userId, roomCode)
  })

  socket.on('createRoom', (callback) => {
    onCreateRoom(socket, userId, callback)
  })

  socket.on('joinRoom', (roomCode, playerName, callback) => {
    onJoinRoom(socket, userId, roomCode, playerName, callback)
  })

  socket.on('startGame', (roomCode, gameOptions) => {
    console.log('startGame event received')
    onStartGame(socket, userId, roomCode, gameOptions)
  })

  console.log('Listening for answer event')
  socket.on('answer', (roomCode, userId, answer, remainingTime) => {
    onAnswer(socket, roomCode, userId, answer, remainingTime)
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
