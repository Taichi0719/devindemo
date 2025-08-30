import { useState, useEffect, useRef, useCallback } from 'react'
import { Car, Trophy, Clock, MapPin, Play, RotateCcw } from 'lucide-react'
import './App.css'

interface CarPosition {
  x: number
  y: number
  rotation: number
  speed: number
}

interface GameState {
  sessionId: string | null
  carPosition: CarPosition
  score: number
  distanceTraveled: number
  timeElapsed: number
  isPlaying: boolean
  playerName: string
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const keysRef = useRef<Set<string>>(new Set())
  
  const [gameState, setGameState] = useState<GameState>({
    sessionId: null,
    carPosition: { x: 100, y: 300, rotation: 0, speed: 0 },
    score: 0,
    distanceTraveled: 0,
    timeElapsed: 0,
    isPlaying: false,
    playerName: ''
  })

  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [showStartScreen, setShowStartScreen] = useState(true)

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  const startGame = async () => {
    if (!gameState.playerName.trim()) return
    
    try {
      const response = await fetch(`${API_BASE}/api/game/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_name: gameState.playerName })
      })
      const data = await response.json()
      
      setGameState(prev => ({
        ...prev,
        sessionId: data.session_id,
        isPlaying: true,
        carPosition: { x: 100, y: 300, rotation: 0, speed: 0 },
        score: 0,
        distanceTraveled: 0,
        timeElapsed: 0
      }))
      setShowStartScreen(false)
    } catch (error) {
      console.error('Failed to start game:', error)
    }
  }

  const resetGame = () => {
    setGameState(prev => ({
      ...prev,
      sessionId: null,
      isPlaying: false,
      carPosition: { x: 100, y: 300, rotation: 0, speed: 0 },
      score: 0,
      distanceTraveled: 0,
      timeElapsed: 0
    }))
    setShowStartScreen(true)
  }

  const updateGameState = useCallback(async (position: CarPosition) => {
    if (!gameState.sessionId) return
    
    try {
      await fetch(`${API_BASE}/api/game/${gameState.sessionId}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(position)
      })
    } catch (error) {
      console.error('Failed to update game state:', error)
    }
  }, [gameState.sessionId, API_BASE])

  const fetchLeaderboard = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/game/leaderboard`)
      const data = await response.json()
      setLeaderboard(data.leaderboard || [])
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error)
    }
  }, [API_BASE])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    keysRef.current.add(e.key.toLowerCase())
  }, [])

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    keysRef.current.delete(e.key.toLowerCase())
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [handleKeyDown, handleKeyUp])

  const gameLoop = useCallback(() => {
    if (!gameState.isPlaying) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
    gradient.addColorStop(0, '#87CEEB')  // Sky blue
    gradient.addColorStop(0.7, '#4682B4') // Steel blue
    gradient.addColorStop(1, '#191970')   // Midnight blue
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.strokeStyle = '#2C2C2C'
    ctx.lineWidth = 80
    ctx.beginPath()
    ctx.moveTo(0, canvas.height - 100)
    
    for (let x = 0; x < canvas.width; x += 50) {
      const y = canvas.height - 100 + Math.sin(x * 0.01) * 30
      ctx.lineTo(x, y)
    }
    ctx.stroke()

    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = 3
    ctx.setLineDash([20, 20])
    ctx.beginPath()
    ctx.moveTo(0, canvas.height - 100)
    for (let x = 0; x < canvas.width; x += 50) {
      const y = canvas.height - 100 + Math.sin(x * 0.01) * 30
      ctx.lineTo(x, y)
    }
    ctx.stroke()
    ctx.setLineDash([])

    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = 2
    for (let i = 0; i < 5; i++) {
      ctx.beginPath()
      const waveY = canvas.height - 200 - i * 30
      for (let x = 0; x < canvas.width; x += 20) {
        const y = waveY + Math.sin((x + Date.now() * 0.002) * 0.02) * 10
        if (x === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }

    let newPosition = { ...gameState.carPosition }
    const keys = keysRef.current

    if (keys.has('arrowup') || keys.has('w')) {
      newPosition.speed = Math.min(newPosition.speed + 0.5, 8)
    } else if (keys.has('arrowdown') || keys.has('s')) {
      newPosition.speed = Math.max(newPosition.speed - 0.8, -3)
    } else {
      newPosition.speed *= 0.95 // Friction
    }

    if (keys.has('arrowleft') || keys.has('a')) {
      newPosition.rotation -= 3 * (newPosition.speed / 8)
    }
    if (keys.has('arrowright') || keys.has('d')) {
      newPosition.rotation += 3 * (newPosition.speed / 8)
    }

    const radians = (newPosition.rotation * Math.PI) / 180
    newPosition.x += Math.cos(radians) * newPosition.speed
    newPosition.y += Math.sin(radians) * newPosition.speed

    newPosition.x = Math.max(20, Math.min(canvas.width - 20, newPosition.x))
    newPosition.y = Math.max(20, Math.min(canvas.height - 20, newPosition.y))

    ctx.save()
    ctx.translate(newPosition.x, newPosition.y)
    ctx.rotate(radians)
    
    ctx.fillStyle = '#1a1a1a'
    ctx.fillRect(-25, -12, 50, 24)
    
    ctx.fillStyle = '#333'
    ctx.fillRect(-20, -8, 40, 16)
    
    ctx.fillStyle = '#87CEEB'
    ctx.fillRect(-15, -6, 12, 12)
    ctx.fillRect(3, -6, 12, 12)
    
    ctx.fillStyle = '#000'
    ctx.beginPath()
    ctx.arc(-15, -12, 4, 0, Math.PI * 2)
    ctx.arc(15, -12, 4, 0, Math.PI * 2)
    ctx.arc(-15, 12, 4, 0, Math.PI * 2)
    ctx.arc(15, 12, 4, 0, Math.PI * 2)
    ctx.fill()
    
    ctx.restore()

    setGameState(prev => ({
      ...prev,
      carPosition: newPosition,
      distanceTraveled: prev.distanceTraveled + Math.abs(newPosition.speed) * 0.1,
      score: Math.floor(prev.distanceTraveled * 10 + Math.abs(newPosition.speed) * 5),
      timeElapsed: prev.timeElapsed + 1/60
    }))

    if (Math.floor(gameState.timeElapsed * 60) % 30 === 0) {
      updateGameState(newPosition)
    }

    animationRef.current = requestAnimationFrame(gameLoop)
  }, [gameState, updateGameState])

  useEffect(() => {
    if (gameState.isPlaying) {
      animationRef.current = requestAnimationFrame(gameLoop)
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [gameState.isPlaying, gameLoop])

  useEffect(() => {
    fetchLeaderboard()
    const interval = setInterval(fetchLeaderboard, 10000)
    return () => clearInterval(interval)
  }, [fetchLeaderboard])

  if (showStartScreen) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-900 via-blue-700 to-blue-500 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 max-w-md w-full mx-4 border border-white/20 shadow-2xl">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Car className="w-16 h-16 text-yellow-400" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">横須賀</h1>
            <h2 className="text-2xl font-light text-blue-100 mb-4">Coastal Drive</h2>
            <p className="text-blue-200 text-sm">高級感あふれる海沿いドライブ体験</p>
          </div>
          
          <div className="space-y-4">
            <input
              type="text"
              placeholder="プレイヤー名を入力"
              value={gameState.playerName}
              onChange={(e) => setGameState(prev => ({ ...prev, playerName: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl bg-white/20 border border-white/30 text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
            
            <button
              onClick={startGame}
              disabled={!gameState.playerName.trim()}
              className="w-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-semibold py-3 px-6 rounded-xl hover:from-yellow-300 hover:to-yellow-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5" />
              ドライブ開始
            </button>
          </div>

          {leaderboard.length > 0 && (
            <div className="mt-8">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                リーダーボード
              </h3>
              <div className="space-y-2">
                {leaderboard.slice(0, 5).map((player, index) => (
                  <div key={index} className="flex justify-between items-center bg-white/10 rounded-lg px-3 py-2">
                    <span className="text-blue-100">{player.player_name}</span>
                    <span className="text-yellow-400 font-semibold">{player.score}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Game Canvas */}
      <canvas
        ref={canvasRef}
        width={1200}
        height={600}
        className="w-full h-full object-cover"
      />
      
      {/* HUD Overlay */}
      <div className="absolute top-0 left-0 right-0 p-6">
        <div className="flex justify-between items-start">
          {/* Left HUD */}
          <div className="bg-black/50 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
            <div className="text-white space-y-2">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                <span className="font-semibold">{gameState.score.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-400" />
                <span>{gameState.distanceTraveled.toFixed(1)}km</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-green-400" />
                <span>{Math.floor(gameState.timeElapsed / 60)}:{(gameState.timeElapsed % 60).toFixed(0).padStart(2, '0')}</span>
              </div>
            </div>
          </div>

          {/* Right HUD */}
          <div className="bg-black/50 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
            <div className="text-white text-center">
              <div className="text-2xl font-bold">{Math.abs(gameState.carPosition.speed * 20).toFixed(0)}</div>
              <div className="text-sm text-gray-300">km/h</div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls Info */}
      <div className="absolute bottom-6 left-6">
        <div className="bg-black/50 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
          <div className="text-white text-sm space-y-1">
            <div>↑/W: アクセル</div>
            <div>↓/S: ブレーキ</div>
            <div>←→/AD: ハンドル</div>
          </div>
        </div>
      </div>

      {/* Reset Button */}
      <div className="absolute bottom-6 right-6">
        <button
          onClick={resetGame}
          className="bg-red-600/80 hover:bg-red-600 text-white p-3 rounded-full transition-all duration-200 backdrop-blur-sm border border-white/20"
        >
          <RotateCcw className="w-6 h-6" />
        </button>
      </div>
    </div>
  )
}

export default App
