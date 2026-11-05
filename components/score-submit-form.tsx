'use client'

import { useState, useTransition } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { submitScore } from '@/app/actions/leaderboard'

const NAME_KEY = 'snake-player-name'

type ScoreSubmitFormProps = {
  score: number
  mode: string
  onSubmitted: (id: number) => void
}

export function ScoreSubmitForm({ score, mode, onSubmitted }: ScoreSubmitFormProps) {
  const [name, setName] = useState(() =>
    typeof window === 'undefined' ? '' : (window.localStorage.getItem(NAME_KEY) ?? ''),
  )
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        const result = await submitScore({ name, score, mode })
        if (!result.ok) {
          setError(result.error)
          return
        }
        window.localStorage.setItem(NAME_KEY, name.trim())
        onSubmitted(result.id)
      } catch {
        setError('Could not save score')
      }
    })
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-xs flex-col gap-1.5">
      <label htmlFor="player-name" className="font-mono text-xs uppercase tracking-widest text-primary">
        New top 10 score! Enter your name
      </label>
      <div className="flex gap-2">
        <input
          id="player-name"
          autoFocus
          required
          maxLength={16}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Player"
          autoComplete="nickname"
          className="h-9 flex-1 rounded-md border border-input bg-card px-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button type="submit" size="sm" className="h-9" disabled={pending || !name.trim()}>
          <Send />
          {pending ? 'Saving' : 'Save'}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </form>
  )
}
