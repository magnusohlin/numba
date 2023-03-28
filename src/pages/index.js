import React, { useState } from 'react'
import { useRouter } from 'next/router'

const Home = ({ socket }) => {
  const [roomCode, setRoomCode] = useState('')
  const [playerName, setPlayerName] = useState('')
  const router = useRouter()

  const createRoom = () => {
    socket.emit('createRoom', {}, (roomCode) => {
      joinRoom(roomCode)
    })
  }

  const joinRoom = (roomCode) => {
    socket.emit('joinRoom', roomCode, playerName, (error, joinedRoomCode, ownerId) => {
      if (error) {
        console.error(error)
      } else {
        router.push(`/room/${joinedRoomCode}`)
        socket.emit('roomOwner', ownerId)
      }
    })
  }

  return (
    <div>
      <h1>Math Game</h1>
      <input
        type="text"
        placeholder="Enter your name"
        value={playerName}
        onChange={(e) => setPlayerName(e.target.value)}
      />
      <button onClick={createRoom}>Create Room</button>
      <input
        type="text"
        placeholder="Enter room code"
        value={roomCode}
        onChange={(e) => setRoomCode(e.target.value)}
      />
      <button onClick={() => joinRoom(roomCode)}>Join Room</button>
    </div>
  )
}

export default Home
