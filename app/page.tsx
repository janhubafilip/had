import { SnakeGame } from '@/components/snake-game'

export default function Page() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <SnakeGame />
    </main>
  )
}
