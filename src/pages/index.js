import React, { useState } from 'react'
import { useRouter } from 'next/router'
import { motion, AnimatePresence, useAnimation } from 'framer-motion'
import PinInput from 'react-pin-input'
import styles from '@/styles/Home.module.scss'
import { Work_Sans } from 'next/font/google' // eslint-disable-line

const worksans = Work_Sans({ subsets: ['latin'] })

const Home = ({ socket }) => {
  const [roomCode, setRoomCode] = useState('')
  const [activeTab, setActiveTab] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [playerName, setPlayerName] = useState('')
  const controls = useAnimation()
  const router = useRouter()

  const contentAnimationDelayed = {
    hidden: { opacity: 0, scale: 0.5, translateY: -50 },
    visible: {
      opacity: 1,
      scale: 1,
      translateY: 0,
      transition: { duration: 0.2, delay: 0.5 }
    },
    exit: {
      opacity: 0,
      scale: 0.5,
      translateY: 50,
      transition: { duration: 0.2 }
    }
  }

  const handleTabChange = async (index) => {
    if (index !== activeTab) {
      await controls.start('exit')
      setActiveTab(index)
      setLoaded(true)
    }
  }

  const createRoom = () => {
    socket.emit('createRoom', (roomCode) => {
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
    <div className={styles.homeWrapper}>
      <div className={styles.home}>
        <div className={styles.homeContent}>
          <div className={styles.header}>
            <h3>Välkommen till Numba</h3>
            <h3>Ett lärorikt mattequiz</h3>
          </div>
          <div className={styles.tabWrapper}>
            <div className={styles.tabHeader}>
              <div onClick={() => handleTabChange(0)} className={`${styles.tab} ${activeTab === 0 ? styles.active : ''}`}>
                Gå med
              </div>
              <div onClick={() => handleTabChange(1)} className={`${styles.tab} ${activeTab === 1 ? styles.active : ''}`}>
                Skapa
              </div>
            </div>
            <div className={styles.tabContent}>
              <AnimatePresence>
                {activeTab === 0 && (
                  <motion.div
                    key="tab1"
                    custom={controls}
                    initial={loaded ? 'hidden' : 'visible'}
                    animate="visible"
                    exit="exit"
                    variants={contentAnimationDelayed}
                  >
                    <div className={styles.inputWrapper}>
                      <label htmlFor="name">Ditt smeknamn</label>
                      <input
                        className={`${styles.input} ${worksans.className}`}
                        name="name"
                        type="text"
                        placeholder=""
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                      />
                    </div>
                    <div className={styles.inputWrapper}>
                      <label htmlFor="roomCode">Rumskod</label>
                      <PinInput
                        length={4}
                        initialValue=""
                        onChange={(value) => setRoomCode(value)}
                        type="custom"
                        inputMode="number"
                        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', ...worksans.style }}
                        inputStyle={{ height: '120px', width: '80px', borderColor: '#000', borderWidth: '3px', fontSize: '96px', fontWeight: '800', ...worksans.style }}
                        inputFocusStyle={{ borderColor: 'var(--blue)' }}
                        autoSelect={true}
                        regexCriteria={/^[ A-Za-z0-9_@./#&+-]*$/}
                      />
                      <motion.button
                        style={{ ...worksans.style }}
                        disabled={playerName === '' || roomCode.length < 4}
                        className={styles.button}
                        onClick={() => joinRoom(roomCode)}
                        whileHover={ (playerName !== '' && roomCode.length === 4) ? { scale: 1.1 } : { scale: 1 } }
                        whileTap={(playerName !== '' && roomCode.length === 4) ? { scale: 0.9 } : { scale: 1 }}
                      >
                        Gå med i spelet
                      </motion.button>
                    </div>
                  </motion.div>
                )}
                {activeTab === 1 && (
                  <motion.div
                    key="tab2"
                    custom={controls}
                    initial={loaded ? 'hidden' : 'visible'}
                    animate="visible"
                    exit="exit"
                    variants={contentAnimationDelayed}
                  >
                    <div className={styles.inputWrapper}>
                      <label htmlFor="name">Ditt smeknamn</label>
                      <input
                        type="text"
                        placeholder="Enter your name"
                        value={playerName}
                        className={`${styles.input} ${worksans.className}`}
                        onChange={(e) => setPlayerName(e.target.value)}
                      />
                      <motion.button
                        style={{ ...worksans.style }}
                        disabled={playerName === ''}
                        className={styles.button}
                        onClick={createRoom}
                        whileHover={ (playerName !== '') ? { scale: 1.1 } : { scale: 1 } }
                        whileTap={(playerName !== '') ? { scale: 0.9 } : { scale: 1 }}
                      >
                        Skapa spel
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home
