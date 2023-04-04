import React, { useCallback, useEffect, useReducer, useState } from 'react'
import { io } from 'socket.io-client'
import { v4 as uuidv4 } from 'uuid'
import RoomContext from '@/contexts/RoomContext'
import '@/styles/globals.css'
import { Work_Sans } from 'next/font/google' // eslint-disable-line
import Particles from 'react-particles'
import { loadFull } from 'tsparticles'
import particlesConfig from '@/config/particlesjs-config.json'

const worksans = Work_Sans({ subsets: ['latin'] })

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

  const particlesInit = useCallback(async engine => {
    await loadFull(engine)
  }, [])

  const particlesLoaded = useCallback(async () => {}, [])

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
      <main className={worksans.className}>
        <Component {...pageProps} socket={socket} />
        <Particles
          id="tsparticles"
          init={particlesInit}
          loaded={particlesLoaded}
          options={particlesConfig}
        />
      </main>
    </RoomContext.Provider>
  )
}
