import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js'

export interface PreparedStatement {
  run: (...params: unknown[]) => { changes: number }
  get: <T = Record<string, unknown>>(...params: unknown[]) => T | undefined
  all: <T = Record<string, unknown>>(...params: unknown[]) => T[]
}

export class SQLiteWrapper {
  private db: SqlJsDatabase
  private dbPath: string

  constructor(db: SqlJsDatabase, dbPath: string) {
    this.db = db
    this.dbPath = dbPath
  }

  public save(): void {
    if (this.dbPath === ':memory:') return
    try {
      const data = this.db.export()
      const buffer = Buffer.from(data)
      const dir = path.dirname(this.dbPath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      fs.writeFileSync(this.dbPath, buffer)
    } catch (err) {
      console.error('Error saving SQLite database to disk:', err)
    }
  }

  public exec(sql: string): void {
    this.db.exec(sql)
    this.save()
  }

  public pragma(pragmaStr: string): void {
    try {
      this.db.exec(`PRAGMA ${pragmaStr};`)
    } catch {
      // Ignore unsupported pragma in wasm
    }
  }

  public prepare(sql: string): PreparedStatement {
    return {
      run: (...params: unknown[]) => {
        try {
          this.db.run(sql, params as (number | string | Uint8Array | null)[])
          this.save()
          return { changes: 1 }
        } catch (err) {
          console.error('SQLite run error:', err, 'SQL:', sql, 'params:', params)
          throw err
        }
      },
      get: <T = Record<string, unknown>>(...params: unknown[]) => {
        try {
          const stmt = this.db.prepare(sql)
          stmt.bind(params as (number | string | Uint8Array | null)[])
          let row: T | undefined = undefined
          if (stmt.step()) {
            row = stmt.getAsObject() as unknown as T
          }
          stmt.free()
          return row
        } catch (err) {
          console.error('SQLite get error:', err, 'SQL:', sql)
          throw err
        }
      },
      all: <T = Record<string, unknown>>(...params: unknown[]) => {
        try {
          const stmt = this.db.prepare(sql)
          stmt.bind(params as (number | string | Uint8Array | null)[])
          const rows: T[] = []
          while (stmt.step()) {
            rows.push(stmt.getAsObject() as unknown as T)
          }
          stmt.free()
          return rows
        } catch (err) {
          console.error('SQLite all error:', err, 'SQL:', sql)
          throw err
        }
      },
    }
  }

  public close(): void {
    this.save()
    this.db.close()
  }
}

let dbInstance: SQLiteWrapper | null = null

export function getDb(): SQLiteWrapper {
  if (!dbInstance) {
    throw new Error('Database not initialized')
  }
  return dbInstance
}

export function setDb(db: SQLiteWrapper): void {
  dbInstance = db
}

export async function initDatabase(): Promise<SQLiteWrapper> {
  const userDataPath = app.getPath('userData')
  const dbPath = path.join(userDataPath, 'playpick.db')

  const SQL = await initSqlJs({
    locateFile: () => {
      try {
        return require.resolve('sql.js/dist/sql-wasm.wasm')
      } catch {
        return path.join(__dirname, 'sql-wasm.wasm')
      }
    },
  })

  let db: SqlJsDatabase
  if (fs.existsSync(dbPath)) {
    try {
      const fileBuffer = fs.readFileSync(dbPath)
      db = new SQL.Database(fileBuffer)
    } catch {
      db = new SQL.Database()
    }
  } else {
    db = new SQL.Database()
  }

  dbInstance = new SQLiteWrapper(db, dbPath)
  dbInstance.pragma('foreign_keys = ON')

  runMigrations(dbInstance)

  return dbInstance
}

function runMigrations(db: SQLiteWrapper): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)

  const currentVersion = db.prepare('SELECT MAX(version) as v FROM schema_version').get() as { v: number | null } | undefined
  const version = currentVersion?.v ?? 0

  if (version < 1) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS games (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        install_path TEXT,
        launch_command TEXT,
        launch_args TEXT DEFAULT '[]',
        launch_type TEXT NOT NULL DEFAULT 'executable',
        steam_app_id INTEGER,
        epic_app_id TEXT,
        gog_game_id TEXT,
        cover_path TEXT,
        in_roulette INTEGER NOT NULL DEFAULT 1,
        is_favorite INTEGER NOT NULL DEFAULT 0,
        is_installed INTEGER NOT NULL DEFAULT 1,
        added_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        last_played_at TEXT,
        play_count INTEGER NOT NULL DEFAULT 0,
        total_play_time INTEGER NOT NULL DEFAULT 0
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
        source TEXT NOT NULL DEFAULT 'auto',
        PRIMARY KEY (game_id, genre_id),
        FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
        FOREIGN KEY (genre_id) REFERENCES genres(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS game_tags (
        game_id TEXT NOT NULL,
        tag_id TEXT NOT NULL,
        source TEXT NOT NULL DEFAULT 'auto',
        PRIMARY KEY (game_id, tag_id),
        FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS game_sources (
        id TEXT PRIMARY KEY,
        game_id TEXT NOT NULL,
        source_type TEXT NOT NULL,
        source_id TEXT NOT NULL,
        source_name TEXT NOT NULL,
        install_path TEXT,
        launch_command TEXT,
        launch_args TEXT DEFAULT '[]',
        is_installed INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
        UNIQUE(source_type, source_id)
      );

      CREATE TABLE IF NOT EXISTS metadata_cache (
        id TEXT PRIMARY KEY,
        game_id TEXT NOT NULL UNIQUE,
        raw_data TEXT NOT NULL,
        provider TEXT NOT NULL,
        fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS selection_history (
        id TEXT PRIMARY KEY,
        game_id TEXT,
        game_title TEXT NOT NULL,
        game_cover_path TEXT,
        selected_at TEXT NOT NULL DEFAULT (datetime('now')),
        filters TEXT NOT NULL DEFAULT '{}',
        launched INTEGER NOT NULL DEFAULT 0,
        launch_attempted INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_games_in_roulette ON games(in_roulette);
      CREATE INDEX IF NOT EXISTS idx_games_is_installed ON games(is_installed);
      CREATE INDEX IF NOT EXISTS idx_game_genres_game_id ON game_genres(game_id);
      CREATE INDEX IF NOT EXISTS idx_game_tags_game_id ON game_tags(game_id);
      CREATE INDEX IF NOT EXISTS idx_game_sources_game_id ON game_sources(game_id);
      CREATE INDEX IF NOT EXISTS idx_selection_history_selected_at ON selection_history(selected_at);

      INSERT INTO schema_version (version) VALUES (1);
    `)
  }

  if (version < 2) {
    try {
      db.exec(`
        ALTER TABLE games ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0;
      `)
    } catch {
      // Column might already exist if table was created in version >= 1 with is_favorite
    }
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_games_is_favorite ON games(is_favorite);
      INSERT INTO schema_version (version) VALUES (2);
    `)
  }
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
  }
}
