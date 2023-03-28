import { useRouter } from 'next/router'
import { io } from 'socket.io-client'
import React, { useContext, useEffect, useState } from 'react'
import RoomContext from '@/contexts/RoomContext'

const GameOptions = ({ gameOptions, setGameOptions }) => {
  const handleTypeChange = (event) => {
    setGameOptions({ ...gameOptions, type: event.target.value })
  }

  const handleLevelChange = (event) => {
    setGameOptions({ ...gameOptions, level: parseInt(event.target.value, 10) })
  }

  return (
    <>
      <select value={gameOptions.type} onChange={handleTypeChange}>
        <option value="addition">Addition</option>
        <option value="subtraction">Subtraction</option>
        <option value="multiplication">Multiplication</option>
        <option value="division">Division</option>
        <option value="mixed">Mixed</option>
      </select>

      <select value={gameOptions.level} onChange={handleLevelChange}>
        <option value="1">Level 1</option>
        <option value="2">Level 2</option>
      </select>
    </>
  )
}

const PlayerList = ({ players }) => {
  return (
    <>
      <h2>Players:</h2>
      <ul>
        {players.map((player, index) => (
          <li key={index}>
            {player.name} - {player.score} points
          </li>
        ))}
      </ul>
    </>
  )
}

const Question = ({ currentQuestion, handleAnswer }) => {
  return (
    <>
      <h2>{currentQuestion.question}</h2>
      {currentQuestion.choices &&
        currentQuestion.choices.map((choice, index) => (
          <button key={index} onClick={() => handleAnswer(choice)}>
            {choice}
          </button>
        ))}
    </>
  )
}

const Leaderboard = ({ userScores }) => {
  return (
    <div>
      <h2>Leaderboard</h2>
      <ul>
        {userScores.map((userScore) => (
          <li key={userScore.id}>
            {userScore.name}: {userScore.score} (+{userScore.increment})
          </li>
        ))}
      </ul>
    </div>
  )
}

const Room = ({ socket }) => {
  const router = useRouter()
  const { roomCode } = router.query
  const { state, dispatch } = useContext(RoomContext)
  const { players } = state

  const [gameOptions, setGameOptions] = useState({
    type: 'addition',
    level: 1
  })

  const [timeRemaining, setTimeRemaining] = useState(0)

  const [isRoomOwner, setIsRoomOwner] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [userScores, setUserScores] = useState([])
  const [hasAnswered, setHasAnswered] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)

  const [userId, setUserId] = useState(() => {
    if (typeof window === 'undefined') return ''
    const storedUserId = localStorage.getItem('userId')
    return storedUserId || ''
  })

  const [currentQuestion, setCurrentQuestion] = useState({
    question: '',
    answer: 0
  })

  const handleAnswer = (selectedAnswer) => {
    if (hasAnswered) return

    if (selectedAnswer === currentQuestion.answer) {
      console.log('Correct!')
    } else {
      console.log('Incorrect!')
    }

    console.log('Emitting answer event:', roomCode, userId, selectedAnswer)
    // Notify the server that the user has answered the question
    socket.emit('answer', roomCode, userId, selectedAnswer)
    setHasAnswered(true)
  }

  const startGame = () => {
    socket.emit('startGame', roomCode, gameOptions)
  }

  useEffect(() => {
    if (!socket) return

    const handleSocketConnected = (socketId) => {
      console.log('Socket connected:', socketId)
    }

    socket.on('connected', handleSocketConnected)

    return () => {
      socket.off('connected', handleSocketConnected)
    }
  }, [socket])

  useEffect(() => {
    if (!socket) return

    const handleStartGame = ({ question, timerDuration }) => {
      setCurrentQuestion(question)
      setTimeRemaining(timerDuration / 1000)
      setGameStarted(true)
    }

    socket.on('startGame', handleStartGame)

    return () => {
      socket.off('startGame', handleStartGame)
    }
  }, [socket])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const storedUserId = localStorage.getItem('userId')
    if (storedUserId) {
      setUserId(storedUserId)
    }
  }, [])

  useEffect(() => {
    if (!socket || !roomCode || !userId) return

    // Request the room owner information when the user joins the room
    socket.emit('getRoomOwner', roomCode, (error, ownerId) => {
      if (error) {
        console.error(error)
        return
      }

      setIsRoomOwner(userId === ownerId)
      console.log(`Room owner check: userId (${userId}) === ownerId (${ownerId})`)
    })
  }, [socket, roomCode, userId])

  useEffect(() => {
    if (!socket) return

    const handleQuestion = (question) => {
      console.log(`Received question: ${JSON.stringify(question)}`)
      setCurrentQuestion(question)
    }

    socket.on('question', handleQuestion)

    return () => {
      socket.off('question', handleQuestion)
    }
  }, [socket])

  useEffect(() => {
    if (!socket || !roomCode) return

    const handlePlayerListUpdate = (playerList) => {
      dispatch({ type: 'SET_PLAYERS', players: playerList })
    }

    socket.on('playerListUpdate', handlePlayerListUpdate)

    // Fetch the initial player list
    socket.emit('getPlayerList', roomCode)

    return () => {
      // Remove the event listener when the component is unmounted
      socket.off('playerListUpdate', handlePlayerListUpdate)
    }
  }, [socket, roomCode, dispatch, players])

  useEffect(() => {
    if (!socket || !roomCode) return

    const handleLeaderboardUpdate = (playerList) => {
      dispatch({ type: 'SET_PLAYERS', players: playerList })
    }

    socket.on('leaderboardUpdate', handleLeaderboardUpdate)

    return () => {
      socket.off('leaderboardUpdate', handleLeaderboardUpdate)
    }
  }, [socket, roomCode, dispatch])

  useEffect(() => {
    if (!socket) return

    const handleSyncTimer = (remainingTime) => {
      setTimeRemaining(remainingTime / 1000)
    }

    socket.on('syncTimer', handleSyncTimer)

    return () => {
      socket.off('syncTimer', handleSyncTimer)
    }
  }, [socket])

  useEffect(() => {
    if (!socket) return

    const handleNextQuestion = (data) => {
      console.log('Received nextQuestion event:', data)
      setUserScores(data.scores)
      setShowLeaderboard(true)

      setTimeout(() => {
        setCurrentQuestion(data.question)
        setTimeRemaining(data.question.timeLimit / 1000)
        setShowLeaderboard(false)
        setHasAnswered(false)
      }, 10000)
    }

    socket.on('nextQuestion', handleNextQuestion)

    return () => {
      socket.off('nextQuestion', handleNextQuestion)
    }
  }, [socket])

  useEffect(() => {
    if (gameStarted && timeRemaining <= 0) {
      handleAnswer('no answer')
    }

    if (timeRemaining <= 0) return

    const timer = setTimeout(() => {
      setTimeRemaining((prevTime) => prevTime - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [timeRemaining])

  return (
    <div>
      <h1>Room: {roomCode}</h1>
      <h2>Time remaining: {timeRemaining} seconds</h2>
      <GameOptions gameOptions={gameOptions} setGameOptions={setGameOptions} />
      <PlayerList players={players} />
      {isRoomOwner && <button onClick={startGame}>Start Game</button>}
      {showLeaderboard
        ? <Leaderboard userScores={userScores} />
        : <Question currentQuestion={currentQuestion} handleAnswer={handleAnswer} />
      }
    </div>
  )
}

export default Room
