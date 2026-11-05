import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'

export const scores = pgTable('scores', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  score: integer('score').notNull(),
  mode: text('mode').notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
})
