import React, { useEffect, useReducer, useState } from 'react'
import { io } from 'socket.io-client'
import { v4 as uuidv4 } from 'uuid'
import RoomContext from '@/contexts/RoomContext'
import '@/styles/globals.css'

const initialState = {
  players: []
}

const reducer = (state, action) => {
  switch (action.type) {
    case 'SET_PLAYERS':
      return { ...state, players: action.players }
    default:
      return state
  }
}

export default function App ({ Component, pageProps }) {
  const [socket, setSocket] = useState(null)
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    if (typeof window === 'undefined') return

    function generateUniqueId () {
      return uuidv4()
    }

    const userId =
      (typeof window !== 'undefined' && localStorage.getItem('userId')) ||
      generateUniqueId()

    if (typeof window !== 'undefined' && !localStorage.getItem('userId')) {
      localStorage.setItem('userId', userId)
    }

    const serverUrl =
      window.location.hostname === 'localhost'
        ? 'http://localhost:3001'
        : `http://${window.location.hostname}:3001`

    const newSocket = io(serverUrl, {
      query: { userId: userId || 'unknown' }
    })
    setSocket(newSocket)
    return () => newSocket.close()
  }, [])

  return (
    <RoomContext.Provider value={{ state, dispatch }}>
      <Component {...pageProps} socket={socket} />
    </RoomContext.Provider>
  )
}
