'use client'

import { Trophy } from 'lucide-react'
import type { LeaderboardEntry } from '@/app/actions/leaderboard'

type LeaderboardProps = {
  entries: LeaderboardEntry[] | undefined
  isLoading: boolean
  error: unknown
  highlightId?: number | null
  title: string
}

export function Leaderboard({ entries, isLoading, error, highlightId, title }: LeaderboardProps) {
  return (
    <section aria-label={title} className="w-full max-w-xs text-left font-mono">
      <h2 className="mb-2 flex items-center justify-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
        <Trophy className="size-3.5 text-primary" aria-hidden="true" />
        {title}
      </h2>
      {error ? (
        <p className="text-center text-xs text-destructive">Leaderboard unavailable</p>
      ) : isLoading && !entries ? (
        <ol className="flex flex-col gap-1" aria-busy="true">
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="h-5 animate-pulse rounded bg-muted/60" />
          ))}
        </ol>
      ) : !entries?.length ? (
        <p className="text-center text-xs text-muted-foreground">No scores yet. Be the first!</p>
      ) : (
        <ol className="flex flex-col gap-0.5 text-sm">
          {entries.map((entry, index) => (
            <li
              key={entry.id}
              className={`flex items-center gap-3 rounded px-2 py-0.5 ${
                entry.id === highlightId ? 'bg-primary/20 text-primary' : 'text-foreground'
              }`}
            >
              <span className="w-5 text-right tabular-nums text-muted-foreground">{index + 1}.</span>
              <span className="flex-1 truncate">{entry.name}</span>
              <span className="tabular-nums font-semibold">{entry.score}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
