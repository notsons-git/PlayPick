import { getDb } from './init'
import { v4 as uuidv4 } from '../utils/uuid'
import type { SelectionHistoryEntry, FilterState } from '../../src/types/electron'

interface DbHistoryRow {
  id: string
  game_id: string | null
  game_title: string
  game_cover_path: string | null
  selected_at: string
  filters: string
  launched: number
  launch_attempted: number
}

function rowToEntry(row: DbHistoryRow): SelectionHistoryEntry {
  return {
    id: row.id,
    gameId: row.game_id ?? '',
    gameTitle: row.game_title,
    gameCoverPath: row.game_cover_path ?? undefined,
    selectedAt: row.selected_at,
    filters: JSON.parse(row.filters) as FilterState,
    launched: row.launched === 1,
    launchAttempted: row.launch_attempted === 1,
  }
}

export function getHistory(): SelectionHistoryEntry[] {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM selection_history ORDER BY selected_at DESC LIMIT 500').all<DbHistoryRow>()
  return rows.map(rowToEntry)
}

export function addHistoryEntry(entry: Omit<SelectionHistoryEntry, 'id'>): SelectionHistoryEntry {
  const db = getDb()
  const id = uuidv4()

  db.prepare(`
    INSERT INTO selection_history (id, game_id, game_title, game_cover_path, selected_at, filters, launched, launch_attempted)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, entry.gameId || null, entry.gameTitle, entry.gameCoverPath ?? null,
    entry.selectedAt, JSON.stringify(entry.filters),
    entry.launched ? 1 : 0, entry.launchAttempted ? 1 : 0
  )

  return { ...entry, id }
}

export function updateHistoryEntry(id: string, updates: Partial<Pick<SelectionHistoryEntry, 'launched' | 'launchAttempted'>>): void {
  const db = getDb()
  if (updates.launched !== undefined) {
    db.prepare('UPDATE selection_history SET launched = ? WHERE id = ?').run(updates.launched ? 1 : 0, id)
  }
  if (updates.launchAttempted !== undefined) {
    db.prepare('UPDATE selection_history SET launch_attempted = ? WHERE id = ?').run(updates.launchAttempted ? 1 : 0, id)
  }
}

export function clearHistory(): void {
  const db = getDb()
  db.prepare('DELETE FROM selection_history').run()
}
