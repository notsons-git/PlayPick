import { describe, it, expect, beforeEach } from 'vitest'
import initSqlJs from 'sql.js'
import { SQLiteWrapper } from '../../electron/database/init'
import {
  isGameDuplicate,
  batchAddGames,
  getGames,
  addGame,
  normalizeWindowsPath,
  mergeExistingDuplicates,
} from '../../electron/database/games'
import { inferGameTitle, inferInstallPath } from '../../electron/services/folderScanner'

describe('Folder Scanner & Executable Inspection', () => {
  it('correctly normalizes Windows paths with mixed casing and slashes', () => {
    expect(normalizeWindowsPath('C:/Games/Hades/Hades.exe')).toBe('c:\\games\\hades\\hades.exe')
    expect(normalizeWindowsPath('"D:\\GAMES\\Doom\\DOOM.EXE"')).toBe('d:\\games\\doom\\doom.exe')
    expect(normalizeWindowsPath('E:/Games/Witcher/')).toBe('e:\\games\\witcher')
  })
  it('correctly infers title from direct executable name', () => {
    expect(inferGameTitle('C:\\Games\\Hades\\Hades.exe')).toBe('Hades')
    expect(inferGameTitle('D:\\Steam\\steamapps\\common\\Dead_Cells\\deadcells.exe')).toBe('Dead Cells')
  })

  it('correctly infers title when exe is located in binary subdirectories like bin/x64', () => {
    expect(inferGameTitle('D:\\Games\\The Witcher 3\\bin\\x64\\witcher3.exe')).toBe('The Witcher 3')
    expect(inferGameTitle('C:\\Program Files\\Cyberpunk 2077\\bin\\x64\\Cyberpunk2077.exe')).toBe('Cyberpunk 2077')
    expect(inferGameTitle('E:\\Games\\Baldurs Gate 3\\bin\\bg3_dx11.exe')).toBe('Baldurs Gate 3')
  })

  it('handles generic exe names like game.exe, launcher.exe by using parent directory', () => {
    expect(inferGameTitle('D:\\Games\\Disco Elysium\\game.exe')).toBe('Disco Elysium')
    expect(inferGameTitle('C:\\Games\\Celeste\\launcher.exe')).toBe('Celeste')
  })

  it('infers root install path by skipping binary subdirectories', () => {
    expect(inferInstallPath('D:\\Games\\The Witcher 3\\bin\\x64\\witcher3.exe')).toBe('D:\\Games\\The Witcher 3')
    expect(inferInstallPath('C:\\Games\\Hades\\Hades.exe')).toBe('C:\\Games\\Hades')
  })
})

describe('Duplicate Detection & Batch Adding', () => {
  let dbWrapper: SQLiteWrapper

  beforeEach(async () => {
    const SQL = await initSqlJs()
    const db = new SQL.Database()
    dbWrapper = new SQLiteWrapper(db, ':memory:')

    dbWrapper.exec(`
      CREATE TABLE IF NOT EXISTS games (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        install_path TEXT,
        launch_command TEXT,
        launch_args TEXT NOT NULL DEFAULT '[]',
        launch_type TEXT NOT NULL DEFAULT 'executable',
        steam_app_id INTEGER,
        epic_app_id TEXT,
        gog_game_id TEXT,
        cover_path TEXT,
        in_roulette INTEGER NOT NULL DEFAULT 1,
        is_favorite INTEGER NOT NULL DEFAULT 0,
        is_installed INTEGER NOT NULL DEFAULT 1,
        added_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_played_at TEXT,
        play_count INTEGER NOT NULL DEFAULT 0,
        total_play_time INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS game_sources (
        id TEXT PRIMARY KEY,
        game_id TEXT NOT NULL,
        source_type TEXT NOT NULL,
        source_id TEXT NOT NULL,
        source_name TEXT NOT NULL,
        install_path TEXT,
        launch_command TEXT,
        launch_args TEXT NOT NULL DEFAULT '[]',
        is_installed INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS genres (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        normalized TEXT NOT NULL UNIQUE
      );

      CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        normalized TEXT NOT NULL UNIQUE
      );

      CREATE TABLE IF NOT EXISTS game_genres (
        game_id TEXT NOT NULL,
        genre_id TEXT NOT NULL,
        source TEXT NOT NULL,
        PRIMARY KEY (game_id, genre_id, source)
      );

      CREATE TABLE IF NOT EXISTS game_tags (
        game_id TEXT NOT NULL,
        tag_id TEXT NOT NULL,
        source TEXT NOT NULL,
        PRIMARY KEY (game_id, tag_id, source)
      );

      CREATE TABLE IF NOT EXISTS metadata_cache (
        id TEXT PRIMARY KEY,
        game_id TEXT NOT NULL UNIQUE,
        raw_data TEXT NOT NULL,
        provider TEXT NOT NULL,
        fetched_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS selection_history (
        id TEXT PRIMARY KEY,
        game_id TEXT,
        game_title TEXT NOT NULL,
        game_cover_path TEXT,
        selected_at TEXT NOT NULL DEFAULT (datetime('now')),
        filters TEXT NOT NULL DEFAULT '{}',
        launched INTEGER NOT NULL DEFAULT 0,
        launch_attempted INTEGER NOT NULL DEFAULT 0
      );
    `)

    const { setDb } = await import('../../electron/database/init')
    setDb(dbWrapper)
  })

  it('detects duplicate by title or executable path', () => {
    addGame({
      title: 'Hollow Knight',
      launchCommand: 'C:\\Games\\Hollow Knight\\hollow_knight.exe',
      launchArgs: [],
      launchType: 'executable',
      genres: ['Metroidvania'],
      tags: [],
      sources: [],
      inRoulette: true,
      isInstalled: true,
      playCount: 0,
      totalPlayTime: 0,
      userGenres: [],
      userTags: [],
    })

    // Duplicate by exact title
    const dupTitle = isGameDuplicate('Hollow Knight')
    expect(dupTitle.isDuplicate).toBe(true)
    expect(dupTitle.reason).toContain('уже есть в библиотеке')

    // Duplicate by path
    const dupPath = isGameDuplicate('HK Modded', 'C:\\Games\\Hollow Knight\\hollow_knight.exe')
    expect(dupPath.isDuplicate).toBe(true)
    expect(dupPath.reason).toContain('Файл уже привязан к игре')

    // Not duplicate
    const notDup = isGameDuplicate('Celeste', 'C:\\Games\\Celeste\\Celeste.exe')
    expect(notDup.isDuplicate).toBe(false)
  })

  it('batch adds games and returns added count', () => {
    const result = batchAddGames([
      {
        title: 'Game 1',
        launchCommand: 'C:\\Games\\Game1\\game.exe',
        launchArgs: [],
        launchType: 'executable',
        genres: [],
        tags: [],
        sources: [],
        inRoulette: true,
        isInstalled: true,
        playCount: 0,
        totalPlayTime: 0,
        userGenres: ['Action'],
        userTags: ['Indie'],
      },
      {
        title: 'Game 2',
        launchCommand: 'C:\\Games\\Game2\\game.exe',
        launchArgs: [],
        launchType: 'executable',
        genres: [],
        tags: [],
        sources: [],
        inRoulette: true,
        isInstalled: true,
        playCount: 0,
        totalPlayTime: 0,
        userGenres: ['RPG'],
        userTags: [],
      },
    ])

    expect(result.added).toBe(2)
    expect(result.failed).toBe(0)

    const all = getGames()
    expect(all.length).toBe(2)
    expect(all.map((g) => g.title)).toEqual(['Game 1', 'Game 2'])
  })

  it('prevents duplicate game creation when re-adding the same EXE path with varied slashes/casing and updates existing record', () => {
    // 1. Initial addition
    const firstAdd = addGame({
      title: 'Doom Eternal',
      launchCommand: 'C:/Games/Doom Eternal/DoomEternal.exe',
      launchArgs: [],
      launchType: 'executable',
      genres: ['Action'],
      tags: ['Shooter'],
      sources: [],
      inRoulette: true,
      isInstalled: true,
      playCount: 0,
      totalPlayTime: 0,
      userGenres: ['Action'],
      userTags: ['Shooter'],
    })

    expect(firstAdd.id).toBeDefined()
    let all = getGames()
    expect(all.length).toBe(1)
    expect(all[0].sources.length).toBe(1)
    expect(all[0].sources[0].sourceType).toBe('executable')

    // 2. Second addition with different slash format and casing
    const secondAdd = addGame({
      title: 'Doom Eternal',
      launchCommand: 'c:\\games\\DOOM ETERNAL\\doometernal.exe',
      launchArgs: [],
      launchType: 'executable',
      coverPath: 'C:\\Covers\\doom.png',
      genres: ['Action', 'Gore'],
      tags: ['FPS'],
      sources: [],
      inRoulette: true,
      isInstalled: true,
      playCount: 0,
      totalPlayTime: 0,
      userGenres: ['Gore'],
      userTags: ['FPS'],
    })

    // Must be the same ID, not a second row!
    expect(secondAdd.id).toBe(firstAdd.id)

    all = getGames()
    expect(all.length).toBe(1)
    expect(all[0].id).toBe(firstAdd.id)
    // Cover should be updated
    expect(all[0].coverPath).toBe('C:\\Covers\\doom.png')
    // Genres & tags should be merged
    expect(all[0].userGenres).toContain('Action')
    expect(all[0].userGenres).toContain('Gore')
    expect(all[0].userTags).toContain('Shooter')
    expect(all[0].userTags).toContain('FPS')

    // Sources must have only 1 source and it must be executable
    expect(all[0].sources.length).toBe(1)
    expect(all[0].sources[0].sourceType).toBe('executable')
  })

  it('safely merges existing duplicate records preserving history, tags and keeping EXECUTABLE source', () => {
    // Manually simulate existing legacy duplicate records in DB:
    // One created as MANUAL, one as EXECUTABLE
    const game1Id = 'id-game-manual'
    const game2Id = 'id-game-exec'
    const exePath = 'D:\\Games\\Portal\\portal.exe'

    dbWrapper.prepare(`
      INSERT INTO games (id, title, install_path, launch_command, launch_type, is_favorite, play_count, total_play_time, added_at, updated_at)
      VALUES (?, ?, ?, ?, 'manual', 1, 3, 120, '2026-01-01 10:00:00', '2026-01-01 10:00:00')
    `).run(game1Id, 'Portal', 'D:\\Games\\Portal', exePath)

    dbWrapper.prepare(`
      INSERT INTO game_sources (id, game_id, source_type, source_id, source_name, install_path, launch_command, is_installed)
      VALUES ('src-1', ?, 'manual', 'manual-portal', 'Вручную', 'D:\\Games\\Portal', ?, 1)
    `).run(game1Id, exePath)

    dbWrapper.prepare(`
      INSERT INTO selection_history (id, game_id, game_title, selected_at)
      VALUES ('hist-1', ?, 'Portal', '2026-01-02 12:00:00')
    `).run(game1Id)

    dbWrapper.prepare(`
      INSERT INTO games (id, title, install_path, launch_command, launch_type, is_favorite, play_count, total_play_time, added_at, updated_at)
      VALUES (?, ?, ?, ?, 'executable', 0, 5, 200, '2026-01-03 10:00:00', '2026-01-03 10:00:00')
    `).run(game2Id, 'Portal', 'D:\\Games\\Portal', exePath)

    dbWrapper.prepare(`
      INSERT INTO game_sources (id, game_id, source_type, source_id, source_name, install_path, launch_command, is_installed)
      VALUES ('src-2', ?, 'executable', ?, 'Executable', 'D:\\Games\\Portal', ?, 1)
    `).run(game2Id, exePath, exePath)

    // Pre-merge verification: 2 rows in games
    let gamesList = getGames()
    expect(gamesList.length).toBe(2)

    // Run mergeExistingDuplicates
    const mergeResult = mergeExistingDuplicates()
    expect(mergeResult.mergedCount).toBe(1)
    expect(mergeResult.removedCount).toBe(1)

    // Post-merge verification: exactly 1 game row
    gamesList = getGames()
    expect(gamesList.length).toBe(1)

    const remainingGame = gamesList[0]
    expect(remainingGame.launchType).toBe('executable')
    expect(remainingGame.isFavorite).toBe(true) // Preserved favorite
    expect(remainingGame.playCount).toBe(8) // 3 + 5
    expect(remainingGame.totalPlayTime).toBe(320) // 120 + 200

    // Sources must contain only 1 source: 'executable'
    expect(remainingGame.sources.length).toBe(1)
    expect(remainingGame.sources[0].sourceType).toBe('executable')

    // History must point to remainingGame.id
    const historyEntry = dbWrapper.prepare('SELECT game_id FROM selection_history WHERE id = ?').get('hist-1') as { game_id: string }
    expect(historyEntry.game_id).toBe(remainingGame.id)
  })
})
