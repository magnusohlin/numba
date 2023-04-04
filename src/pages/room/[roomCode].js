import { useRouter } from 'next/router'
import React, { useContext, useEffect, useState } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import JSConfetti from 'js-confetti'
import RoomContext from '@/contexts/RoomContext'
import styles from '@/styles/Room.module.scss'

const GameOptions = ({ gameOptions, setGameOptions }) => {
  const handleTypeChange = (event) => {
    setGameOptions({ ...gameOptions, type: event.target.value })
  }

  const handleLevelChange = (event) => {
    setGameOptions({ ...gameOptions, level: parseInt(event.target.value, 10) })
  }

  return (
    <div className={styles.gameOptions}>
      <div className={styles.gameOption}>
        <label htmlFor="type">Räknesätt</label>
        <select className={styles.select} value={gameOptions.type} onChange={handleTypeChange}>
          <option value="addition">Addition</option>
          <option value="subtraction">Subtraktion</option>
          <option value="multiplication">Multiplikation</option>
          <option value="division">Division</option>
          <option value="mixed">Mixat</option>
        </select>
      </div>
      <div className={styles.gameOption}>
        <label htmlFor="level">Nivå</label>
        <select className={styles.select} value={gameOptions.level} onChange={handleLevelChange}>
          <option value="1">Nivå 1</option>
          <option value="2">Nivå 2</option>
        </select>
      </div>
    </div>
  )
}

const ProgressBar = ({ timeLeft, maxTime, questionsAsked, totalQuestions = 10, showAnswer }) => {
  const progressValue = useMotionValue(timeLeft / maxTime)
  const scaleX = useTransform(progressValue, [0, 1], [0, 1])
  const springConfig = { damping: 15, stiffness: 120 }
  const smoothScaleX = useSpring(scaleX, springConfig)

  useEffect(() => {
    progressValue.set(timeLeft / maxTime)
  }, [timeLeft, progressValue])

  return (
    <div className={styles.progressBarContainer}>
      <motion.div
        className={styles.progressBar}
        style={{
          scaleX: smoothScaleX,
          originX: 0
        }}
      />
      <div className={styles.progressBarText}>
        { showAnswer
          ? (<h3>Rätt svar</h3>)
          : (<h3>Fråga {questionsAsked} / {totalQuestions}</h3>)
        }
      </div>
    </div>
  )
}

const PlayerList = ({ players }) => {
  return (
    <div className={styles.playerList}>
      <h3>Spelare i rummet:</h3>
      {players.map((player, index) => (
        <div className={styles.playerCard} key={index}>
          <div className={styles.avatar}>
            <img src={`data:image/svg+xml,${encodeURIComponent(player.avatar)}`} alt="Player Avatar" />
          </div>
          <h3>{player.name}</h3>
        </div>
      ))}
    </div>
  )
}

const Question = ({ selectedIndex, hasAnswered, currentQuestion, handleAnswer }) => {
  const isSelected = (index) => {
    return selectedIndex === index ? `${styles.choiceSelected}` : ''
  }

  return (
    <div className={styles.choices}>
      {currentQuestion.choices &&
        currentQuestion.choices.map((choice, index) => (
          <div className={styles.choiceWrapper} key={index}>
            <div
              className={`${styles.choice} ${isSelected(index)}`}
              onClick={
                !hasAnswered
                  ? () => handleAnswer(choice, index)
                  : () => {}
              }
            >
              <span>{choice}</span>
            </div>
          </div>
        ))}
    </div>
  )
}

const Leaderboard = ({ userScores, showEndConfetti, showSuccessConfetti }) => {
  const sortedUserScores = [...userScores].sort((a, b) => b.score - a.score)

  useEffect(() => {
    if (showSuccessConfetti) {
      const jsConfetti = new JSConfetti()
      jsConfetti.addConfetti({
        confettiColors: ['#C5F9CD', '#ECD3F9', '#FFFD9F', '#99E0E3'],
        confettiRadius: 10,
        confettiNumber: 150
      })
    }
  }, [showSuccessConfetti])

  useEffect(() => {
    if (showEndConfetti) {
      const jsConfetti = new JSConfetti()
      jsConfetti.addConfetti({ emojis: ['🦄', '💜', '💙', '❤️'], confettiRadius: 100, confettiNumber: 30 })
    }
  }, [showEndConfetti])

  return (
    <div className={styles.leaderBoard}>
      {sortedUserScores.map((userScore) => {
        return (
          <div className={styles.playerCard} key={userScore.id}>
            <div className={styles.avatar}>
            <img src={`data:image/svg+xml,${encodeURIComponent(userScore.avatar)}`} alt="Player Avatar" />
            </div>
            <div className={styles.playerInfo}>
              <h3>{userScore.name}</h3>
              <div className={styles.score}>
                {userScore.increment > 0 && <h3 className={styles.increment}>+{userScore.increment}</h3>}
                <h3>{userScore.score}</h3>
              </div>
            </div>
          </div>
        )
      })}
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
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(1)
  const [isRoomOwner, setIsRoomOwner] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [userScores, setUserScores] = useState([])
  const [hasAnswered, setHasAnswered] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [showSuccessConfetti, setShowSuccessConfetti] = useState(false)
  const [showEndConfetti, setShowEndConfetti] = useState(false)

  const [userId, setUserId] = useState(() => {
    if (typeof window === 'undefined') return ''
    const storedUserId = localStorage.getItem('userId')
    return storedUserId || ''
  })

  const [currentQuestion, setCurrentQuestion] = useState({
    question: '',
    answer: 0
  })

  useEffect(() => {
    if (gameStarted) {
      document.body.classList.add(styles.roomWrapperStarted)
    } else {
      document.body.classList.remove(styles.roomWrapperStarted)
    }

    // Clean up the effect by removing the class when the component unmounts
    return () => {
      document.body.classList.remove(styles.roomWrapperStarted)
    }
  }, [gameStarted])

  const handleAnswer = (selectedAnswer, selectedIndex = -1) => {
    if (hasAnswered) return

    if (selectedAnswer === currentQuestion.answer) {
      setShowSuccessConfetti(true)
    }
    // Notify the server that the user has answered the question
    socket.emit('answer', roomCode, userId, selectedAnswer, timeRemaining)
    setHasAnswered(true)

    if (selectedIndex !== -1) {
      setSelectedIndex(selectedIndex)
    }
  }

  const startGame = () => {
    socket.emit('startGame', roomCode, gameOptions)
  }

  const quitGame = () => {
    socket.emit('leaveRoom', roomCode, userId)

    router.push('/')
  }

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
    })
  }, [socket, roomCode, userId])

  useEffect(() => {
    if (!socket) return

    const handleQuestion = (question) => {
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
      setUserScores(data.scores)
      setShowLeaderboard(true)

      setTimeout(() => {
        setShowSuccessConfetti(false)
        setCurrentQuestion(data.question)
        setTimeRemaining(data.question.timeLimit / 1000)
        setHasAnswered(false)
        setSelectedIndex(-1)
        setShowLeaderboard(false)
        setCurrentQuestionNumber(data.questionsAsked)
      }, 10000)
    }

    socket.on('nextQuestion', handleNextQuestion)

    return () => {
      socket.off('nextQuestion', handleNextQuestion)
    }
  }, [socket])

  useEffect(() => {
    if (!socket) return

    const handleGameEnd = (data) => {
      setUserScores(data.scores)
      setShowLeaderboard(true)
      setShowEndConfetti(true)

      setTimeout(() => {
        setShowEndConfetti(false)
        setGameStarted(false)
        setHasAnswered(false)
        setSelectedIndex(-1)
        setShowLeaderboard(false)
        setCurrentQuestionNumber(1)
      }, 10000)
    }

    socket.on('endGame', handleGameEnd)

    return () => {
      socket.off('endGame', handleGameEnd)
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
    <div className={`${styles.roomWrapper}`}>
      <div className={styles.room}>
        <button className={`${styles.quitButton} ${gameStarted && styles.quitButtonInverse}`} onClick={quitGame}>×</button>
        {!gameStarted && (
        <div className={styles.waitingRoom}>
          <>
            <div className={styles.header}>
              <h3>Rumskod</h3>
              <h2>{roomCode}</h2>
            </div>
            <div className={styles.information}>
              {isRoomOwner
                ? (
                  <>
                    <GameOptions gameOptions={gameOptions} setGameOptions={setGameOptions} />
                    <motion.div
                      className={styles.button}
                      onClick={startGame}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <span>Starta spelet</span>
                    </motion.div>
                  </>
                  )
                : (
                  <div className={styles.waiting}>
                    <h3>Väntar på att spelledaren ska starta spelet...</h3>
                  </div>
                  )}
            </div>
            <PlayerList players={players} />
          </>
        </div>
        )}
        {gameStarted && (
          <div className={styles.game}>
            <div className={styles.gameInfo}>
              <div className={styles.timer}>
                <ProgressBar timeLeft={timeRemaining} maxTime={10} questionsAsked={currentQuestionNumber} showAnswer={showLeaderboard} />
              </div>
              <div className={styles.question}>
                <h2>{showLeaderboard ? currentQuestion.answer : currentQuestion.question}</h2>
              </div>
            </div>
            <div className={styles.gamePanel}>
              {showLeaderboard
                ? <Leaderboard userScores={userScores} showSuccessConfetti={showSuccessConfetti} showEndConfetti={showEndConfetti} />
                : <Question
                    currentQuestion={currentQuestion}
                    handleAnswer={handleAnswer}
                    selectedIndex={selectedIndex}
                    hasAnswered={hasAnswered}
                  />
              }
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Room
