import { describe, it, expect, beforeAll } from 'vitest'
import initSqlJs from 'sql.js'
import { SQLiteWrapper } from '../../electron/database/init'
import fs from 'fs'
import path from 'path'

describe('SQLite database with sql.js', () => {
  let wrapper: SQLiteWrapper
  const testDbPath = path.join(__dirname, 'test-playpick.db')

  beforeAll(async () => {
    const SQL = await initSqlJs()
    const db = new SQL.Database()
    wrapper = new SQLiteWrapper(db, testDbPath)

    wrapper.exec(`
      CREATE TABLE IF NOT EXISTS test_games (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        in_roulette INTEGER DEFAULT 1
      );
    `)
  })

  it('inserts and selects records properly', () => {
    wrapper.prepare('INSERT INTO test_games (id, title, in_roulette) VALUES (?, ?, ?)').run('g1', 'Cyberpunk 2077', 1)
    wrapper.prepare('INSERT INTO test_games (id, title, in_roulette) VALUES (?, ?, ?)').run('g2', 'Witcher 3', 0)

    const row = wrapper.prepare('SELECT * FROM test_games WHERE id = ?').get<{ id: string; title: string; in_roulette: number }>('g1')
    expect(row).toBeDefined()
    expect(row?.title).toBe('Cyberpunk 2077')
    expect(row?.in_roulette).toBe(1)

    const all = wrapper.prepare('SELECT * FROM test_games').all<{ id: string; title: string }>()
    expect(all).toHaveLength(2)
  })

  it('saves database to disk file', () => {
    wrapper.save()
    expect(fs.existsSync(testDbPath)).toBe(true)
    const stat = fs.statSync(testDbPath)
    expect(stat.size).toBeGreaterThan(0)

    // Cleanup
    wrapper.close()
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath)
    }
  })
})
