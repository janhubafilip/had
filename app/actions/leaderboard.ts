'use server'

import { asc, desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { scores } from '@/lib/db/schema'

const MODES = ['walls'] as const
export type LeaderboardMode = (typeof MODES)[number]

export type LeaderboardEntry = {
  id: number
  name: string
  score: number
}

const MAX_NAME_LENGTH = 16
const MAX_SCORE = 20 * 20

function assertMode(mode: string): asserts mode is LeaderboardMode {
  if (!MODES.includes(mode as LeaderboardMode)) throw new Error('Invalid mode')
}

export async function getTopScores(mode: string): Promise<LeaderboardEntry[]> {
  assertMode(mode)
  return db
    .select({ id: scores.id, name: scores.name, score: scores.score })
    .from(scores)
    .where(eq(scores.mode, mode))
    .orderBy(desc(scores.score), asc(scores.createdAt))
    .limit(10)
}

export async function submitScore(input: { name: string; score: number; mode: string }) {
  assertMode(input.mode)
  const name = String(input.name ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, MAX_NAME_LENGTH)
  if (!name) return { ok: false as const, error: 'Enter a name' }

  const score = Number(input.score)
  if (!Number.isInteger(score) || score < 1 || score > MAX_SCORE) {
    return { ok: false as const, error: 'Invalid score' }
  }

  const [row] = await db
    .insert(scores)
    .values({ name, score, mode: input.mode })
    .returning({ id: scores.id })
  return { ok: true as const, id: row.id }
}
