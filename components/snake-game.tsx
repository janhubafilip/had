'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Pause, Play, RotateCcw } from 'lucide-react'
import useSWR from 'swr'
import { Button } from '@/components/ui/button'
import { getTopScores } from '@/app/actions/leaderboard'
import { Leaderboard } from '@/components/leaderboard'
import { ScoreSubmitForm } from '@/components/score-submit-form'

const GRID = 20
const CELL = 24
const SIZE = GRID * CELL
const BASE_TICK_MS = 140
const MIN_TICK_MS = 60
const HIGH_SCORE_KEY = 'snake-high-score'

type Point = { x: number; y: number }
type Direction = 'up' | 'down' | 'left' | 'right'
type Status = 'ready' | 'running' | 'paused' | 'over'
type Mode = 'walls' | 'wrap'

const MODE_LABELS: Record<Mode, string> = {
  walls: 'Walls',
  wrap: 'Wrap (Nokia 3310)',
}

function highScoreKey(mode: Mode) {
  return mode === 'walls' ? HIGH_SCORE_KEY : `${HIGH_SCORE_KEY}-${mode}`
}

const VECTORS: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

const OPPOSITE: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
}

const KEY_TO_DIRECTION: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
}

function initialSnake(): Point[] {
  const mid = Math.floor(GRID / 2)
  return [
    { x: mid, y: mid },
    { x: mid - 1, y: mid },
    { x: mid - 2, y: mid },
  ]
}

function randomFood(snake: Point[]): Point {
  const occupied = new Set(snake.map((p) => `${p.x},${p.y}`))
  const free: Point[] = []
  for (let x = 0; x < GRID; x++) {
    for (let y = 0; y < GRID; y++) {
      if (!occupied.has(`${x},${y}`)) free.push({ x, y })
    }
  }
  return free[Math.floor(Math.random() * free.length)] ?? { x: 0, y: 0 }
}

function readCssVar(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

export function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const snakeRef = useRef<Point[]>(initialSnake())
  const foodRef = useRef<Point>(randomFood(snakeRef.current))
  const directionRef = useRef<Direction>('right')
  const queueRef = useRef<Direction[]>([])
  const touchStartRef = useRef<Point | null>(null)

  const [status, setStatus] = useState<Status>('ready')
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(0)
  const [mode, setMode] = useState<Mode>('walls')
  const [submittedId, setSubmittedId] = useState<number | null>(null)

  const {
    data: topScores,
    error: leaderboardError,
    isLoading: leaderboardLoading,
    mutate: refreshLeaderboard,
  } = useSWR(['leaderboard', mode], ([, m]) => getTopScores(m))

  const qualifies =
    status === 'over' &&
    submittedId === null &&
    score > 0 &&
    topScores !== undefined &&
    (topScores.length < 10 || score > topScores[topScores.length - 1].score)

  const tickMs = Math.max(MIN_TICK_MS, BASE_TICK_MS - score * 3)

  useEffect(() => {
    const stored = Number(window.localStorage.getItem(highScoreKey(mode)))
    setHighScore(Number.isFinite(stored) ? stored : 0)
  }, [mode])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const board = readCssVar('--board')
    const gridLine = readCssVar('--board-grid')
    const snakeColor = readCssVar('--snake')
    const snakeHead = readCssVar('--snake-head')
    const foodColor = readCssVar('--food')

    ctx.fillStyle = board
    ctx.fillRect(0, 0, SIZE, SIZE)

    ctx.strokeStyle = gridLine
    ctx.lineWidth = 1
    for (let i = 1; i < GRID; i++) {
      ctx.beginPath()
      ctx.moveTo(i * CELL + 0.5, 0)
      ctx.lineTo(i * CELL + 0.5, SIZE)
      ctx.moveTo(0, i * CELL + 0.5)
      ctx.lineTo(SIZE, i * CELL + 0.5)
      ctx.stroke()
    }

    const food = foodRef.current
    ctx.fillStyle = foodColor
    ctx.beginPath()
    ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL / 2 - 4, 0, Math.PI * 2)
    ctx.fill()

    snakeRef.current.forEach((segment, index) => {
      ctx.fillStyle = index === 0 ? snakeHead : snakeColor
      ctx.beginPath()
      ctx.roundRect(segment.x * CELL + 2, segment.y * CELL + 2, CELL - 4, CELL - 4, 6)
      ctx.fill()
    })

    const head = snakeRef.current[0]
    const dir = VECTORS[directionRef.current]
    ctx.fillStyle = board
    const cx = head.x * CELL + CELL / 2 + dir.x * 4
    const cy = head.y * CELL + CELL / 2 + dir.y * 4
    const ox = dir.y * 5
    const oy = dir.x * 5
    ctx.beginPath()
    ctx.arc(cx + ox, cy + oy, 2.5, 0, Math.PI * 2)
    ctx.arc(cx - ox, cy - oy, 2.5, 0, Math.PI * 2)
    ctx.fill()
  }, [])

  const reset = useCallback(() => {
    snakeRef.current = initialSnake()
    foodRef.current = randomFood(snakeRef.current)
    directionRef.current = 'right'
    queueRef.current = []
    setScore(0)
    setSubmittedId(null)
    draw()
  }, [draw])

  const start = useCallback(() => {
    if (status === 'over') reset()
    setStatus('running')
  }, [status, reset])

  const changeMode = useCallback(
    (next: Mode) => {
      if (next === mode) return
      setMode(next)
      reset()
      setStatus('ready')
    },
    [mode, reset],
  )

  const togglePause = useCallback(() => {
    setStatus((s) => (s === 'running' ? 'paused' : s === 'paused' ? 'running' : s))
  }, [])

  const steer = useCallback(
    (next: Direction) => {
      if (status === 'ready' || status === 'over') start()
      if (status === 'paused') return
      const queue = queueRef.current
      const last = queue[queue.length - 1] ?? directionRef.current
      if (next === last || next === OPPOSITE[last] || queue.length >= 3) return
      queue.push(next)
    },
    [status, start],
  )

  useEffect(() => {
    draw()
  }, [draw])

  useEffect(() => {
    if (status !== 'running') return

    const id = window.setInterval(() => {
      const nextDir = queueRef.current.shift()
      if (nextDir) directionRef.current = nextDir

      const snake = snakeRef.current
      const vec = VECTORS[directionRef.current]
      let head = { x: snake[0].x + vec.x, y: snake[0].y + vec.y }
      if (mode === 'wrap') {
        head = { x: (head.x + GRID) % GRID, y: (head.y + GRID) % GRID }
      }
      const ate = head.x === foodRef.current.x && head.y === foodRef.current.y
      const body = ate ? snake : snake.slice(0, -1)

      const hitWall = head.x < 0 || head.y < 0 || head.x >= GRID || head.y >= GRID
      const hitSelf = body.some((p) => p.x === head.x && p.y === head.y)

      if (hitWall || hitSelf) {
        setStatus('over')
        setScore((s) => {
          setHighScore((h) => {
            const best = Math.max(h, s)
            window.localStorage.setItem(highScoreKey(mode), String(best))
            return best
          })
          return s
        })
        return
      }

      snakeRef.current = [head, ...body]
      if (ate) {
        foodRef.current = randomFood(snakeRef.current)
        setScore((s) => s + 1)
      }
      draw()
    }, tickMs)

    return () => window.clearInterval(id)
  }, [status, tickMs, draw, mode])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key
      const dir = KEY_TO_DIRECTION[key]
      if (dir) {
        e.preventDefault()
        steer(dir)
        return
      }
      if (key === ' ' || key === 'Enter') {
        e.preventDefault()
        if (status === 'running' || status === 'paused') togglePause()
        else start()
      } else if (key === 'r') {
        reset()
        setStatus('ready')
      } else if (key === 'm' && status !== 'running') {
        changeMode(mode === 'walls' ? 'wrap' : 'walls')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [steer, start, togglePause, reset, status, changeMode, mode])

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    touchStartRef.current = { x: t.clientX, y: t.clientY }
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    const origin = touchStartRef.current
    touchStartRef.current = null
    if (!origin) return
    if ((e.target as HTMLElement).closest('form, button, input')) return
    const t = e.changedTouches[0]
    const dx = t.clientX - origin.x
    const dy = t.clientY - origin.y
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) {
      if (status !== 'running') start()
      return
    }
    if (Math.abs(dx) > Math.abs(dy)) steer(dx > 0 ? 'right' : 'left')
    else steer(dy > 0 ? 'down' : 'up')
  }

  const overlay =
    status === 'ready'
      ? {
          title: 'Snake',
          body:
            mode === 'wrap'
              ? 'Wrap mode: pass through walls like on the Nokia 3310. Press Space or tap to start.'
              : 'Press Space or tap to start',
        }
      : status === 'paused'
        ? { title: 'Paused', body: 'Press Space to resume' }
        : status === 'over'
          ? { title: 'Game over', body: `You ate ${score} ${score === 1 ? 'apple' : 'apples'}. Press Space to retry.` }
          : null

  return (
    <div className="flex w-full max-w-[480px] flex-col gap-4">
      <header className="flex items-end justify-between font-mono">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Score</p>
          <p className="text-3xl font-semibold tabular-nums text-foreground" aria-live="polite">
            {score}
          </p>
        </div>
        <h1 className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">Snake</h1>
        <div className="text-right">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Best</p>
          <p className="text-3xl font-semibold tabular-nums text-foreground">{highScore}</p>
        </div>
      </header>

      <div
        role="radiogroup"
        aria-label="Game mode"
        className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-card p-1 font-mono text-xs uppercase tracking-widest"
      >
        {(Object.keys(MODE_LABELS) as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mode === m}
            disabled={status === 'running'}
            onClick={() => changeMode(m)}
            className={`rounded-md px-3 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${
              mode === m ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>

      <div
        className={`relative aspect-square w-full touch-none select-none overflow-hidden rounded-xl border shadow-2xl ${
          mode === 'wrap' ? 'border-dashed border-primary/60' : 'border-border'
        }`}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <canvas
          ref={canvasRef}
          width={SIZE}
          height={SIZE}
          className="block h-full w-full"
          role="img"
          aria-label={`Snake game board. Score ${score}.`}
        />
        {overlay && (
          <div className="absolute inset-0 flex flex-col overflow-y-auto bg-background/80 p-4 text-center backdrop-blur-sm sm:p-6">
            <div className="my-auto flex flex-col items-center gap-3">
              <p className="font-mono text-2xl font-bold uppercase tracking-widest text-primary sm:text-3xl">
                {overlay.title}
              </p>
              <p className="text-sm text-muted-foreground text-pretty">{overlay.body}</p>
              {qualifies && (
                <ScoreSubmitForm
                  key={`${mode}-${score}`}
                  score={score}
                  mode={mode}
                  onSubmitted={(id) => {
                    setSubmittedId(id)
                    refreshLeaderboard()
                  }}
                />
              )}
              {status !== 'paused' && (
                <Leaderboard
                  title={`Top 10 · ${MODE_LABELS[mode]}`}
                  entries={topScores}
                  isLoading={leaderboardLoading}
                  error={leaderboardError}
                  highlightId={submittedId}
                />
              )}
              <Button onClick={status === 'paused' ? togglePause : start} className="mt-1">
                {status === 'over' ? <RotateCcw /> : <Play />}
                {status === 'over' ? 'Play again' : status === 'paused' ? 'Resume' : 'Start'}
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={togglePause}
            disabled={status === 'ready' || status === 'over'}
          >
            {status === 'paused' ? <Play /> : <Pause />}
            {status === 'paused' ? 'Resume' : 'Pause'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              reset()
              setStatus('ready')
            }}
          >
            <RotateCcw />
            Restart
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-1 sm:hidden" aria-label="Direction controls">
          <span />
          <Button variant="secondary" size="icon" aria-label="Up" onClick={() => steer('up')}>
            <ArrowUp />
          </Button>
          <span />
          <Button variant="secondary" size="icon" aria-label="Left" onClick={() => steer('left')}>
            <ArrowLeft />
          </Button>
          <Button variant="secondary" size="icon" aria-label="Down" onClick={() => steer('down')}>
            <ArrowDown />
          </Button>
          <Button variant="secondary" size="icon" aria-label="Right" onClick={() => steer('right')}>
            <ArrowRight />
          </Button>
        </div>

        <p className="hidden text-right font-mono text-xs leading-relaxed text-muted-foreground sm:block">
          Arrows / WASD to move
          <br />
          Space to pause · R to restart · M to switch mode
        </p>
      </div>
    </div>
  )
}
