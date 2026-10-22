import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from '../utils/uuid'
import { getDb } from './init'
import { getCoversDirectory } from '../services/launcher'
import { filterGames, normalizeLabel } from '../../src/utils/filter'
import { cleanAndNormalizeMetadata, isTechnicalTag } from '../../src/utils/tagNormalizer'
import type { Game, GameSource, FilterState } from '../../src/types/electron'

export { filterGames }

interface DbGameRow {
  id: string
  title: string
  install_path: string | null
  launch_command: string | null
  launch_args: string
  launch_type: string
  steam_app_id: number | null
  epic_app_id: string | null
  gog_game_id: string | null
  cover_path: string | null
  in_roulette: number
  is_favorite?: number
  is_installed: number
  added_at: string
  updated_at: string
  last_played_at: string | null
  play_count: number
  total_play_time: number
}

interface DbSourceRow {
  id: string
  game_id: string
  source_type: string
  source_id: string
  source_name: string
  install_path: string | null
  launch_command: string | null
  launch_args: string
  is_installed: number
}

interface DbGenreTagRow {
  name: string
  source: string
}

function rowToGame(row: DbGameRow, sources: GameSource[], genres: string[], tags: string[], userGenres: string[], userTags: string[]): Game {
  return {
    id: row.id,
    title: row.title,
    installPath: row.install_path ?? undefined,
    launchCommand: row.launch_command ?? undefined,
    launchArgs: JSON.parse(row.launch_args || '[]') as string[],
    launchType: row.launch_type as Game['launchType'],
    steamAppId: row.steam_app_id ?? undefined,
    epicAppId: row.epic_app_id ?? undefined,
    gogGameId: row.gog_game_id ?? undefined,
    coverPath: row.cover_path ?? undefined,
    inRoulette: row.in_roulette === 1,
    isFavorite: (row.is_favorite ?? 0) === 1,
    isInstalled: row.is_installed === 1,
    addedAt: row.added_at,
    updatedAt: row.updated_at,
    lastPlayedAt: row.last_played_at ?? undefined,
    playCount: row.play_count,
    totalPlayTime: row.total_play_time,
    sources,
    genres,
    tags,
    userGenres,
    userTags,
  }
}

function rowToSource(row: DbSourceRow): GameSource {
  return {
    id: row.id,
    gameId: row.game_id,
    sourceType: row.source_type as GameSource['sourceType'],
    sourceId: row.source_id,
    sourceName: row.source_name,
    installPath: row.install_path ?? undefined,
    launchCommand: row.launch_command ?? undefined,
    launchArgs: JSON.parse(row.launch_args || '[]') as string[],
    isInstalled: row.is_installed === 1,
  }
}

export function getGames(): Game[] {
  const db = getDb()

  const gameRows = db.prepare('SELECT * FROM games ORDER BY title COLLATE NOCASE').all<DbGameRow>()

  return gameRows.map((row) => {
    const sources = db.prepare('SELECT * FROM game_sources WHERE game_id = ?').all<DbSourceRow>(row.id).map(rowToSource)

    const genreRows = db.prepare(`
      SELECT g.name, gg.source FROM genres g
      JOIN game_genres gg ON g.id = gg.genre_id
      WHERE gg.game_id = ?
    `).all<DbGenreTagRow>(row.id)

    const tagRows = db.prepare(`
      SELECT t.name, gt.source FROM tags t
      JOIN game_tags gt ON t.id = gt.tag_id
      WHERE gt.game_id = ?
    `).all<DbGenreTagRow>(row.id)

    const genres = genreRows.filter(r => r.source === 'auto').map(r => r.name)
    const tags = tagRows.filter(r => r.source === 'auto').map(r => r.name)
    const userGenres = genreRows.filter(r => r.source === 'user').map(r => r.name)
    const userTags = tagRows.filter(r => r.source === 'user').map(r => r.name)

    return rowToGame(row, sources, genres, tags, userGenres, userTags)
  })
}

export function getGame(id: string): Game | null {
  const db = getDb()
  const row = db.prepare('SELECT * FROM games WHERE id = ?').get<DbGameRow>(id)
  if (!row) return null

  const sources = db.prepare('SELECT * FROM game_sources WHERE game_id = ?').all<DbSourceRow>(id).map(rowToSource)

  const genreRows = db.prepare(`
    SELECT g.name, gg.source FROM genres g
    JOIN game_genres gg ON g.id = gg.genre_id
    WHERE gg.game_id = ?
  `).all<DbGenreTagRow>(id)

  const tagRows = db.prepare(`
    SELECT t.name, gt.source FROM tags t
    JOIN game_tags gt ON t.id = gt.tag_id
    WHERE gt.game_id = ?
  `).all<DbGenreTagRow>(id)

  const genres = genreRows.filter(r => r.source === 'auto').map(r => r.name)
  const tags = tagRows.filter(r => r.source === 'auto').map(r => r.name)
  const userGenres = genreRows.filter(r => r.source === 'user').map(r => r.name)
  const userTags = tagRows.filter(r => r.source === 'user').map(r => r.name)

  return rowToGame(row, sources, genres, tags, userGenres, userTags)
}

export function addGame(gameData: Omit<Game, 'id' | 'addedAt' | 'updatedAt'>): Game {
  const db = getDb()

  // 1. Check if game already exists by normalized executable path or install path
  const targetPath = gameData.launchCommand || gameData.installPath
  if (targetPath) {
    const norm = normalizeWindowsPath(targetPath)
    const existing = findGameByNormalizedPath(norm)
    if (existing) {
      return updateExistingGameRecord(existing.id, gameData)
    }
  }

  // 2. New game insertion
  const id = uuidv4()
  const now = new Date().toISOString()

  db.prepare(`
    INSERT INTO games (id, title, install_path, launch_command, launch_args, launch_type,
      steam_app_id, epic_app_id, gog_game_id, cover_path, in_roulette, is_favorite, is_installed,
      added_at, updated_at, play_count, total_play_time)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, gameData.title, gameData.installPath ?? null, gameData.launchCommand ?? null,
    JSON.stringify(gameData.launchArgs || []), gameData.launchType,
    gameData.steamAppId ?? null, gameData.epicAppId ?? null, gameData.gogGameId ?? null,
    gameData.coverPath ?? null, gameData.inRoulette ? 1 : 0, gameData.isFavorite ? 1 : 0, gameData.isInstalled ? 1 : 0,
    now, now, gameData.playCount || 0, gameData.totalPlayTime || 0
  )

  // 3. Insert sources (ensuring executable source type, never 'manual')
  const sources = [...(gameData.sources || [])]
  if (sources.length === 0 && gameData.launchType === 'executable' && gameData.launchCommand) {
    sources.push({
      id: uuidv4(),
      gameId: id,
      sourceType: 'executable',
      sourceId: gameData.launchCommand,
      sourceName: 'Executable',
      installPath: gameData.installPath,
      launchCommand: gameData.launchCommand,
      launchArgs: gameData.launchArgs || [],
      isInstalled: true,
    })
  }

  for (const source of sources) {
    const sourceId = source.id || uuidv4()
    const cleanSourceType = source.sourceType === 'manual' ? 'executable' : source.sourceType
    const cleanSourceName = source.sourceName === 'Вручную' || source.sourceName === 'manual' ? 'Executable' : source.sourceName

    db.prepare(`
      INSERT OR REPLACE INTO game_sources (id, game_id, source_type, source_id, source_name, install_path, launch_command, launch_args, is_installed)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(sourceId, id, cleanSourceType, source.sourceId || gameData.launchCommand || id, cleanSourceName,
      source.installPath ?? gameData.installPath ?? null, source.launchCommand ?? gameData.launchCommand ?? null,
      JSON.stringify(source.launchArgs || []), source.isInstalled ? 1 : 0)
  }

  upsertGenresAndTags(id, gameData.genres || [], 'auto')
  upsertGenresAndTags(id, gameData.userGenres || [], 'user', 'genres')
  upsertTagsForGame(id, gameData.tags || [], 'auto')
  upsertTagsForGame(id, gameData.userTags || [], 'user')

  return getGame(id)!
}

export function updateGame(id: string, updates: Partial<Game>): Game {
  const db = getDb()
  const now = new Date().toISOString()

  const fields: string[] = []
  const values: unknown[] = []

  if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title) }
  if (updates.installPath !== undefined) { fields.push('install_path = ?'); values.push(updates.installPath) }
  if (updates.launchCommand !== undefined) { fields.push('launch_command = ?'); values.push(updates.launchCommand) }
  if (updates.launchArgs !== undefined) { fields.push('launch_args = ?'); values.push(JSON.stringify(updates.launchArgs)) }
  if (updates.launchType !== undefined) { fields.push('launch_type = ?'); values.push(updates.launchType) }
  if (updates.steamAppId !== undefined) { fields.push('steam_app_id = ?'); values.push(updates.steamAppId) }
  if (updates.epicAppId !== undefined) { fields.push('epic_app_id = ?'); values.push(updates.epicAppId) }
  if (updates.gogGameId !== undefined) { fields.push('gog_game_id = ?'); values.push(updates.gogGameId) }
  if (updates.coverPath !== undefined) { fields.push('cover_path = ?'); values.push(updates.coverPath) }
  if (updates.inRoulette !== undefined) { fields.push('in_roulette = ?'); values.push(updates.inRoulette ? 1 : 0) }
  if (updates.isFavorite !== undefined) { fields.push('is_favorite = ?'); values.push(updates.isFavorite ? 1 : 0) }
  if (updates.isInstalled !== undefined) { fields.push('is_installed = ?'); values.push(updates.isInstalled ? 1 : 0) }
  if (updates.lastPlayedAt !== undefined) { fields.push('last_played_at = ?'); values.push(updates.lastPlayedAt) }
  if (updates.playCount !== undefined) { fields.push('play_count = ?'); values.push(updates.playCount) }
  if (updates.totalPlayTime !== undefined) { fields.push('total_play_time = ?'); values.push(updates.totalPlayTime) }

  if (fields.length > 0) {
    fields.push('updated_at = ?')
    values.push(now, id)
    db.prepare(`UPDATE games SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  }

  if (updates.userGenres !== undefined) {
    db.prepare(`DELETE FROM game_genres WHERE game_id = ? AND source = 'user'`).run(id)
    upsertGenresAndTags(id, updates.userGenres, 'user', 'genres')
  }

  if (updates.userTags !== undefined) {
    db.prepare(`DELETE FROM game_tags WHERE game_id = ? AND source = 'user'`).run(id)
    upsertTagsForGame(id, updates.userTags, 'user')
  }

  return getGame(id)!
}

export function deleteGame(id: string): void {
  const db = getDb()

  // 1. Fetch game to check cover path and clean up disk cache
  const game = db.prepare('SELECT cover_path FROM games WHERE id = ?').get(id) as { cover_path: string | null } | undefined
  if (game?.cover_path) {
    try {
      const coversDir = getCoversDirectory()
      const resolved = path.resolve(game.cover_path)
      // Only delete if inside our covers cache directory
      if (resolved.startsWith(path.resolve(coversDir)) && fs.existsSync(resolved)) {
        fs.unlinkSync(resolved)
      }
    } catch (e) {
      console.warn('Could not delete cover file for game:', id, e)
    }
  }

  // 2. Clean up associated tables
  db.prepare('DELETE FROM game_genres WHERE game_id = ?').run(id)
  db.prepare('DELETE FROM game_tags WHERE game_id = ?').run(id)
  db.prepare('DELETE FROM game_sources WHERE game_id = ?').run(id)
  db.prepare('DELETE FROM metadata_cache WHERE game_id = ?').run(id)

  // 3. Keep selection history valid by detaching the deleted game id
  db.prepare('UPDATE selection_history SET game_id = NULL WHERE game_id = ?').run(id)

  // 4. Finally delete the game record itself
  db.prepare('DELETE FROM games WHERE id = ?').run(id)
}

export function addAutoGenresAndTags(gameId: string, rawGenres: string[], rawTags: string[]): void {
  const { genres, tags } = cleanAndNormalizeMetadata(rawGenres, rawTags)
  upsertGenresAndTags(gameId, genres, 'auto', 'genres')
  upsertTagsForGame(gameId, tags, 'auto')
}

export function cleanExistingTechnicalTags(): void {
  const db = getDb()
  const allTags = db.prepare('SELECT id, name FROM tags').all() as { id: string; name: string }[]
  for (const t of allTags) {
    if (isTechnicalTag(t.name)) {
      db.prepare('DELETE FROM game_tags WHERE tag_id = ?').run(t.id)
      db.prepare('DELETE FROM tags WHERE id = ?').run(t.id)
    }
  }
}

export function setGameInRoulette(id: string, inRoulette: boolean): void {
  const db = getDb()
  db.prepare('UPDATE games SET in_roulette = ?, updated_at = ? WHERE id = ?').run(
    inRoulette ? 1 : 0, new Date().toISOString(), id
  )
}

export function setGameFavorite(id: string, isFavorite: boolean): void {
  const db = getDb()
  db.prepare('UPDATE games SET is_favorite = ?, updated_at = ? WHERE id = ?').run(
    isFavorite ? 1 : 0, new Date().toISOString(), id
  )
}

export function updateGameTagsAndGenres(id: string, tags: string[], genres: string[]): void {
  const db = getDb()

  // Remove user-set genres and tags
  db.prepare(`
    DELETE FROM game_genres WHERE game_id = ? AND genre_id IN (
      SELECT id FROM genres
    ) AND EXISTS (
      SELECT 1 FROM game_genres gg2 WHERE gg2.game_id = ? AND gg2.source = 'user'
    )
  `).run(id, id)

  // More precise: delete user-sourced entries for this game
  db.prepare(`
    DELETE FROM game_genres
    WHERE game_id = ? AND source = 'user'
  `).run(id)

  db.prepare(`
    DELETE FROM game_tags
    WHERE game_id = ? AND source = 'user'
  `).run(id)

  upsertGenresAndTags(id, genres, 'user')
  upsertTagsForGame(id, tags, 'user')
}

function upsertGenresAndTags(gameId: string, items: string[], source: 'auto' | 'user', table: 'genres' | 'tags' = 'genres'): void {
  const db = getDb()
  const junctionTable = table === 'genres' ? 'game_genres' : 'game_tags'
  const idField = table === 'genres' ? 'genre_id' : 'tag_id'

  for (const item of items) {
    const trimmed = item.trim()
    if (!trimmed) continue

    const normalized = normalizeLabel(trimmed)
    const existing = db.prepare(`SELECT id FROM ${table} WHERE normalized = ?`).get(normalized) as { id: string } | undefined

    let itemId: string
    if (existing) {
      itemId = existing.id
    } else {
      itemId = uuidv4()
      db.prepare(`INSERT OR IGNORE INTO ${table} (id, name, normalized) VALUES (?, ?, ?)`).run(itemId, trimmed, normalized)
    }

    db.prepare(`INSERT OR REPLACE INTO ${junctionTable} (game_id, ${idField}, source) VALUES (?, ?, ?)`).run(gameId, itemId, source)
  }
}

function upsertTagsForGame(gameId: string, items: string[], source: 'auto' | 'user'): void {
  upsertGenresAndTags(gameId, items, source, 'tags')
}

export function getAllGenres(): string[] {
  const db = getDb()
  const rows = db.prepare(`
    SELECT DISTINCT name FROM genres
    ORDER BY name COLLATE NOCASE
  `).all() as { name: string }[]
  return rows.map(r => r.name)
}

export function getAllTags(): string[] {
  const db = getDb()
  const rows = db.prepare(`
    SELECT DISTINCT name FROM tags
    ORDER BY name COLLATE NOCASE
  `).all() as { name: string }[]
  return rows.map(r => r.name)
}

export function getFilteredGames(filter: FilterState): Game[] {
  const games = getGames()
  return filterGames(games, filter)
}

export function importScannedGames(scannedGames: Array<{
  title: string
  sourceType: string
  sourceId: string
  installPath?: string
  launchCommand?: string
  launchArgs?: string[]
  isInstalled: boolean
  steamAppId?: number
  epicAppId?: string
  gogGameId?: string
}>): { added: number; updated: number; skipped: number } {
  const db = getDb()
  let added = 0
  let updated = 0
  let skipped = 0

  for (const scanned of scannedGames) {
    if (!scanned.isInstalled) {
      skipped++
      continue
    }

    // Check if source already exists
    const existingSource = db.prepare(
      'SELECT game_id FROM game_sources WHERE source_type = ? AND source_id = ?'
    ).get(scanned.sourceType, scanned.sourceId) as { game_id: string } | undefined

    if (existingSource) {
      // Update the existing game's source
      db.prepare(`
        UPDATE game_sources SET install_path = ?, launch_command = ?, is_installed = ?
        WHERE source_type = ? AND source_id = ?
      `).run(scanned.installPath ?? null, scanned.launchCommand ?? null, 1, scanned.sourceType, scanned.sourceId)

      db.prepare(`
        UPDATE games SET is_installed = 1, updated_at = datetime('now')
        WHERE id = ?
      `).run(existingSource.game_id)

      updated++
    } else {
      // Add new game
      const gameId = uuidv4()
      const now = new Date().toISOString()

      db.prepare(`
        INSERT INTO games (id, title, install_path, launch_command, launch_args, launch_type,
          steam_app_id, epic_app_id, gog_game_id, in_roulette, is_installed, added_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)
      `).run(
        gameId, scanned.title, scanned.installPath ?? null, scanned.launchCommand ?? null,
        JSON.stringify(scanned.launchArgs || []),
        scanned.sourceType === 'steam' ? 'steam' :
        scanned.sourceType === 'epic' ? 'epic' :
        scanned.sourceType === 'gog' ? 'gog' : 'executable',
        scanned.steamAppId ?? null, scanned.epicAppId ?? null, scanned.gogGameId ?? null,
        now, now
      )

      const sourceId = uuidv4()
      const sourceName = {
        steam: 'Steam',
        epic: 'Epic Games Store',
        gog: 'GOG Galaxy',
        ea: 'EA app',
        ubisoft: 'Ubisoft Connect',
        manual: 'Вручную',
        shortcut: 'Ярлык',
      }[scanned.sourceType] || scanned.sourceType

      db.prepare(`
        INSERT INTO game_sources (id, game_id, source_type, source_id, source_name, install_path, launch_command, launch_args, is_installed)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
      `).run(sourceId, gameId, scanned.sourceType, scanned.sourceId, sourceName,
        scanned.installPath ?? null, scanned.launchCommand ?? null,
        JSON.stringify(scanned.launchArgs || []))

      added++
    }
  }

  return { added, updated, skipped }
}

export function normalizeWindowsPath(filePath?: string | null): string {
  if (!filePath) return ''
  let clean = filePath.trim().replace(/^["']+|["']+$/g, '')
  if (!clean) return ''
  clean = clean.replace(/\//g, '\\')
  clean = path.normalize(clean)
  if (clean.length > 3 && (clean.endsWith('\\') || clean.endsWith('/'))) {
    clean = clean.slice(0, -1)
  }
  return clean.toLowerCase()
}

export function findGameByNormalizedPath(normPath: string): { id: string; title: string } | null {
  if (!normPath) return null
  const db = getDb()

  // 1. Check games table
  const games = db.prepare('SELECT id, title, launch_command, install_path FROM games').all() as DbGameRow[]
  for (const g of games) {
    if (g.launch_command && normalizeWindowsPath(g.launch_command) === normPath) {
      return { id: g.id, title: g.title }
    }
    if (g.install_path && normalizeWindowsPath(g.install_path) === normPath) {
      return { id: g.id, title: g.title }
    }
  }

  // 2. Check game_sources
  const sources = db.prepare('SELECT game_id, source_id, launch_command, install_path FROM game_sources').all() as DbSourceRow[]
  for (const s of sources) {
    if (
      (s.launch_command && normalizeWindowsPath(s.launch_command) === normPath) ||
      (s.source_id && normalizeWindowsPath(s.source_id) === normPath) ||
      (s.install_path && normalizeWindowsPath(s.install_path) === normPath)
    ) {
      const g = db.prepare('SELECT id, title FROM games WHERE id = ?').get(s.game_id) as DbGameRow | undefined
      if (g) {
        return { id: g.id, title: g.title }
      }
    }
  }

  return null
}

function updateExistingGameRecord(
  existingId: string,
  gameData: Omit<Game, 'id' | 'addedAt' | 'updatedAt'>
): Game {
  const db = getDb()
  const existing = getGame(existingId)
  if (!existing) return addGame(gameData)

  const updates: Partial<Game> = {
    isInstalled: true,
  }

  if (!existing.coverPath && gameData.coverPath) {
    updates.coverPath = gameData.coverPath
  }

  if (!existing.installPath && gameData.installPath) {
    updates.installPath = gameData.installPath
  }

  if (gameData.launchType === 'executable' || (gameData.sources && gameData.sources.some(s => s.sourceType === 'executable'))) {
    updates.launchType = 'executable'
  }

  updateGame(existingId, updates)

  // Ensure game_sources has only one clean 'executable' source and no redundant 'manual'
  const normExe = normalizeWindowsPath(gameData.launchCommand || gameData.installPath || existing.launchCommand || existing.installPath || '')
  if (normExe) {
    db.prepare(`
      DELETE FROM game_sources
      WHERE game_id = ? AND source_type = 'manual'
    `).run(existingId)

    const existingExecSource = db.prepare(`
      SELECT id FROM game_sources
      WHERE game_id = ? AND source_type = 'executable'
    `).get(existingId) as { id: string } | undefined

    if (existingExecSource) {
      db.prepare(`
        UPDATE game_sources
        SET launch_command = ?, install_path = ?, is_installed = 1
        WHERE id = ?
      `).run(gameData.launchCommand ?? null, gameData.installPath ?? null, existingExecSource.id)
    } else {
      const sourceId = uuidv4()
      db.prepare(`
        INSERT OR IGNORE INTO game_sources (id, game_id, source_type, source_id, source_name, install_path, launch_command, launch_args, is_installed)
        VALUES (?, ?, 'executable', ?, 'Executable', ?, ?, '[]', 1)
      `).run(sourceId, existingId, gameData.launchCommand || normExe, gameData.installPath ?? null, gameData.launchCommand ?? null)
    }
  }

  if (gameData.userGenres && gameData.userGenres.length > 0) {
    const mergedGenres = Array.from(new Set([...existing.userGenres, ...gameData.userGenres]))
    upsertGenresAndTags(existingId, mergedGenres, 'user', 'genres')
  }

  if (gameData.userTags && gameData.userTags.length > 0) {
    const mergedTags = Array.from(new Set([...existing.userTags, ...gameData.userTags]))
    upsertTagsForGame(existingId, mergedTags, 'user')
  }

  return getGame(existingId)!
}

export function isGameDuplicate(title: string, exePath?: string): { isDuplicate: boolean; reason?: string } {
  const db = getDb()
  const cleanTitle = title.trim().toLowerCase()

  if (exePath) {
    const normPath = normalizeWindowsPath(exePath)
    const existing = findGameByNormalizedPath(normPath)
    if (existing) {
      return {
        isDuplicate: true,
        reason: `Файл уже привязан к игре «${existing.title}»`,
      }
    }
  }

  if (cleanTitle) {
    const byTitle = db.prepare(`
      SELECT title FROM games
      WHERE LOWER(TRIM(title)) = ?
    `).get(cleanTitle) as { title: string } | undefined

    if (byTitle) {
      return {
        isDuplicate: true,
        reason: `Игра «${byTitle.title}» уже есть в библиотеке`,
      }
    }
  }

  return { isDuplicate: false }
}

export function mergeExistingDuplicates(): { mergedCount: number; removedCount: number } {
  const db = getDb()
  let mergedCount = 0
  let removedCount = 0

  const allGames = db.prepare('SELECT * FROM games ORDER BY added_at ASC').all() as DbGameRow[]

  // Group games by normalized executable path (if available) or normalized (installPath + title)
  const groups = new Map<string, DbGameRow[]>()

  for (const g of allGames) {
    let key = ''
    if (g.launch_command) {
      key = `exe:${normalizeWindowsPath(g.launch_command)}`
    } else if (g.install_path) {
      key = `path:${normalizeWindowsPath(g.install_path)}:${g.title.trim().toLowerCase()}`
    } else {
      key = `title:${g.title.trim().toLowerCase()}`
    }

    const list = groups.get(key) || []
    list.push(g)
    groups.set(key, list)
  }

  for (const [, gamesInGroup] of groups) {
    if (gamesInGroup.length <= 1) continue

    // Determine primary game to keep
    const sorted = [...gamesInGroup].sort((a, b) => {
      const aIsExec = a.launch_type === 'executable' ? 1 : 0
      const bIsExec = b.launch_type === 'executable' ? 1 : 0
      if (aIsExec !== bIsExec) return bIsExec - aIsExec

      if ((b.play_count || 0) !== (a.play_count || 0)) {
        return (b.play_count || 0) - (a.play_count || 0)
      }

      return a.added_at.localeCompare(b.added_at)
    })

    const primary = sorted[0]
    const duplicates = sorted.slice(1)

    for (const dup of duplicates) {
      // 1. Merge stats and fields
      const newPlayCount = (primary.play_count || 0) + (dup.play_count || 0)
      const newPlayTime = (primary.total_play_time || 0) + (dup.total_play_time || 0)
      const isFav = primary.is_favorite || dup.is_favorite ? 1 : 0
      const cover = primary.cover_path || dup.cover_path || null
      const install = primary.install_path || dup.install_path || null
      const launch = primary.launch_command || dup.launch_command || null

      db.prepare(`
        UPDATE games
        SET play_count = ?, total_play_time = ?, is_favorite = ?, cover_path = ?, install_path = ?, launch_command = ?, launch_type = 'executable', updated_at = datetime('now')
        WHERE id = ?
      `).run(newPlayCount, newPlayTime, isFav, cover, install, launch, primary.id)

      // 2. Re-point selection_history
      db.prepare(`
        UPDATE selection_history
        SET game_id = ?
        WHERE game_id = ?
      `).run(primary.id, dup.id)

      // 3. Clean and re-point game_sources
      db.prepare(`
        DELETE FROM game_sources
        WHERE game_id = ? AND source_type = 'manual'
      `).run(dup.id)

      db.prepare(`
        UPDATE OR IGNORE game_sources
        SET game_id = ?
        WHERE game_id = ?
      `).run(primary.id, dup.id)

      db.prepare(`DELETE FROM game_sources WHERE game_id = ?`).run(dup.id)

      // 4. Move genres and tags
      db.prepare(`
        UPDATE OR IGNORE game_genres
        SET game_id = ?
        WHERE game_id = ?
      `).run(primary.id, dup.id)
      db.prepare(`DELETE FROM game_genres WHERE game_id = ?`).run(dup.id)

      db.prepare(`
        UPDATE OR IGNORE game_tags
        SET game_id = ?
        WHERE game_id = ?
      `).run(primary.id, dup.id)
      db.prepare(`DELETE FROM game_tags WHERE game_id = ?`).run(dup.id)

      // 5. Delete metadata_cache
      db.prepare(`DELETE FROM metadata_cache WHERE game_id = ?`).run(dup.id)

      // 6. Delete duplicate game record
      db.prepare(`DELETE FROM games WHERE id = ?`).run(dup.id)

      removedCount++
    }

    // Ensure primary has clean 'executable' source
    const normExe = normalizeWindowsPath(primary.launch_command || '')
    if (normExe) {
      db.prepare(`
        DELETE FROM game_sources
        WHERE game_id = ? AND source_type = 'manual'
      `).run(primary.id)

      const hasExecSource = db.prepare(`
        SELECT id FROM game_sources
        WHERE game_id = ? AND source_type = 'executable'
      `).get(primary.id)

      if (!hasExecSource) {
        const sourceId = uuidv4()
        db.prepare(`
          INSERT OR IGNORE INTO game_sources (id, game_id, source_type, source_id, source_name, install_path, launch_command, launch_args, is_installed)
          VALUES (?, ?, 'executable', ?, 'Executable', ?, ?, '[]', 1)
        `).run(sourceId, primary.id, primary.launch_command || normExe, primary.install_path ?? null, primary.launch_command ?? null)
      }
    }

    mergedCount++
  }

  return { mergedCount, removedCount }
}

export function batchAddGames(
  gamesData: Array<Omit<Game, 'id' | 'addedAt' | 'updatedAt'>>
): { added: number; failed: number } {
  let added = 0
  let failed = 0
  for (const g of gamesData) {
    try {
      addGame(g)
      added++
    } catch (err) {
      console.error('Failed to add game:', g.title, err)
      failed++
    }
  }
  return { added, failed }
}
