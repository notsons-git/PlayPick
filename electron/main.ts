import { app, BrowserWindow, ipcMain, dialog, protocol } from 'electron'
import path from 'path'
import fs from 'fs'
import { initDatabase } from './database/init'
import {
  getGames, getGame, addGame, batchAddGames, updateGame, deleteGame, setGameInRoulette, setGameFavorite,
  getAllGenres, getAllTags, updateGameTagsAndGenres, importScannedGames,
  addAutoGenresAndTags, cleanExistingTechnicalTags, mergeExistingDuplicates
} from './database/games'
import { getHistory, addHistoryEntry, clearHistory } from './database/history'
import { getSettings, updateSettings } from './database/settings'
import { runFullScan, cancelScan, scannerEvents } from './scanners/index'
import { launchGame, downloadCoverImage, getCoversDirectory } from './services/launcher'
import { fetchSteamMetadata, fetchRawgMetadata, resolveAndCacheGameCover } from './services/metadata'
import { inspectExecutable, scanFolderForExecutables } from './services/folderScanner'
import type { Game } from '../src/types/electron'

// Suppress unneeded Chromium DevTools visual logging / autofill protocol noise
app.commandLine.appendSwitch('disable-features', 'AutofillServerCommunication,CalculateNativeWinOcclusion')
// Allow Web Audio synthesis without requiring user gesture restrictions
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')

// Register custom privileged scheme before app ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'cover',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      bypassCSP: true,
      stream: true,
    },
  },
])

let mainWindow: BrowserWindow | null = null
const isDev = process.env['NODE_ENV'] === 'development'

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#171916',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#171916',
      symbolColor: '#92968C',
      height: 36,
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // needed for preload
      webSecurity: true,
    },
    show: false,
    icon: fs.existsSync(path.join(process.resourcesPath, 'assets', 'icon.ico'))
      ? path.join(process.resourcesPath, 'assets', 'icon.ico')
      : path.join(__dirname, '..', '..', 'assets', 'icon.ico'),
  })

  if (isDev) {
    void mainWindow.loadURL('http://127.0.0.1:5173')
    if (process.env['OPEN_DEVTOOLS'] === 'true') {
      mainWindow.webContents.openDevTools({ mode: 'detach' })
    }
  } else {
    void mainWindow.loadFile(path.join(__dirname, '..', '..', 'dist', 'index.html'))
  }

  // Allow developer to toggle DevTools on demand via F12 or Ctrl+Shift+I
  mainWindow.webContents.on('before-input-event', (_event, input) => {
    if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
      mainWindow?.webContents.toggleDevTools()
    }
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  // Fallback to guarantee window appears even if ready-to-show was delayed
  setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) {
      mainWindow.show()
    }
  }, 1000)

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.warn('Renderer load failed, retrying in 1s:', errorCode, errorDescription)
    if (isDev && mainWindow) {
      setTimeout(() => {
        mainWindow?.loadURL('http://127.0.0.1:5173')
      }, 1000)
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function registerProtocol(): void {
  // Register custom protocol for serving local cover images securely and reliably
  protocol.handle('cover', (request) => {
    try {
      const url = new URL(request.url)
      let filePath = url.searchParams.get('path') || ''
      if (!filePath) {
        // Fallback for cover://image/<filename>
        filePath = decodeURIComponent(url.pathname.replace(/^\/+/, ''))
      }

      const coversDir = getCoversDirectory()
      let resolved = filePath

      // If relative or just a filename, look in coversDir
      if (!path.isAbsolute(resolved)) {
        resolved = path.join(coversDir, path.basename(resolved))
      }

      // Check if file exists at specified path
      if (!fs.existsSync(resolved)) {
        // Fallback check in covers directory by basename
        const inCovers = path.join(coversDir, path.basename(resolved))
        if (fs.existsSync(inCovers)) {
          resolved = inCovers
        } else {
          return new Response('Cover not found', { status: 404 })
        }
      }

      const ext = path.extname(resolved).toLowerCase()
      const mimeMap: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.ico': 'image/x-icon',
        '.bmp': 'image/bmp',
        '.gif': 'image/gif',
      }
      const contentType = mimeMap[ext] || 'image/jpeg'

      const fileBuffer = fs.readFileSync(resolved)
      return new Response(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=86400',
        },
      })
    } catch (err) {
      console.error('Error serving cover via cover:// protocol:', err)
      return new Response('Internal error', { status: 500 })
    }
  })
}

// Background worker to auto-fetch missing covers and genres
async function enrichMissingMetadata(): Promise<{ coversUpdated: number; metadataUpdated: number }> {
  let coversUpdated = 0
  let metadataUpdated = 0
  try {
    const allGames = getGames()
    const settings = getSettings()
    const coversDir = getCoversDirectory()

    for (const game of allGames) {
      // 1. Cover resolution (Steam Store -> SteamGridDB -> native .lnk/.exe icon)
      if (!game.coverPath || !fs.existsSync(game.coverPath)) {
        try {
          const coverPath = await resolveAndCacheGameCover(game, coversDir, settings.steamGridDbApiKey)
          if (coverPath) {
            updateGame(game.id, { coverPath })
            coversUpdated++
          }
        } catch {
          // Ignore cover error, continue to metadata
        }
      }

      // 2. Auto-fetch genres and tags from Steam or RAWG (without overwriting user entries)
      if (game.genres.length === 0) {
        try {
          let meta = null
          if (game.steamAppId) {
            meta = await fetchSteamMetadata(game.steamAppId)
          } else if (settings.rawgApiKey) {
            meta = await fetchRawgMetadata(game.title, settings.rawgApiKey)
          }

          if (meta && ((meta.genres && meta.genres.length > 0) || (meta.tags && meta.tags.length > 0))) {
            addAutoGenresAndTags(game.id, meta.genres || [], meta.tags || [])
            metadataUpdated++
          }
        } catch {
          // Ignore metadata error
        }
      }
    }
  } catch (err) {
    console.warn('Background metadata resolution error:', err)
  }
  return { coversUpdated, metadataUpdated }
}

function registerIpcHandlers(): void {
  // Games
  ipcMain.handle('get-games', () => getGames())
  ipcMain.handle('get-game', (_event, id: string) => getGame(id))
  ipcMain.handle('add-game', (_event, gameData: Omit<Game, 'id' | 'addedAt' | 'updatedAt'>) => addGame(gameData))
  ipcMain.handle('batch-add-games', (_event, gamesData: Array<Omit<Game, 'id' | 'addedAt' | 'updatedAt'>>) => batchAddGames(gamesData))
  ipcMain.handle('merge-duplicate-games', () => mergeExistingDuplicates())
  ipcMain.handle('update-game', (_event, id: string, updates: Partial<Game>) => updateGame(id, updates))
  ipcMain.handle('delete-game', (_event, id: string) => { deleteGame(id) })
  ipcMain.handle('set-game-in-roulette', (_event, id: string, inRoulette: boolean) => {
    setGameInRoulette(id, inRoulette)
  })
  ipcMain.handle('set-game-favorite', (_event, id: string, isFavorite: boolean) => {
    setGameFavorite(id, isFavorite)
  })

  // Genres & tags
  ipcMain.handle('get-all-genres', () => getAllGenres())
  ipcMain.handle('get-all-tags', () => getAllTags())
  ipcMain.handle('update-game-tags', (_event, id: string, tags: string[], genres: string[]) => {
    updateGameTagsAndGenres(id, tags, genres)
  })

  // Scanning
  ipcMain.handle('scan-games', async () => {
    // Wire up events to renderer
    const progressHandler = (progress: unknown): void => {
      mainWindow?.webContents.send('scan-progress', progress)
    }
    const completeHandler = (result: unknown): void => {
      mainWindow?.webContents.send('scan-complete', result)
    }
    scannerEvents.on('progress', progressHandler)
    scannerEvents.once('complete', () => {
      scannerEvents.off('progress', progressHandler)
      scannerEvents.off('complete', completeHandler)
    })
    scannerEvents.on('complete', completeHandler)

    try {
      await runFullScan()
    } catch (err) {
      mainWindow?.webContents.send('scan-complete', {
        games: [],
        errors: [{ source: 'system', message: String(err) }],
        duration: 0,
      })
    }
  })
  ipcMain.handle('cancel-scan', () => { cancelScan() })

  ipcMain.handle('import-scanned-games', async (_event, games: Parameters<typeof importScannedGames>[0]) => {
    const result = importScannedGames(games)

    // Trigger background cover and metadata resolution for all imported games
    setTimeout(() => {
      void enrichMissingMetadata()
    }, 500)

    return result
  })

  // Metadata & Covers
  ipcMain.handle('ensure-game-cover', async (_event, gameId: string) => {
    const game = getGame(gameId)
    if (!game) return null

    const settings = getSettings()
    const coversDir = getCoversDirectory()

    const coverPath = await resolveAndCacheGameCover(game, coversDir, settings.steamGridDbApiKey)
    if (coverPath && coverPath !== game.coverPath) {
      updateGame(gameId, { coverPath })
    }

    // Also auto-fetch genres if missing
    if (game.genres.length === 0) {
      try {
        let meta = null
        if (game.steamAppId) {
          meta = await fetchSteamMetadata(game.steamAppId)
        } else if (settings.rawgApiKey) {
          meta = await fetchRawgMetadata(game.title, settings.rawgApiKey)
        }
        if (meta && ((meta.genres && meta.genres.length > 0) || (meta.tags && meta.tags.length > 0))) {
          addAutoGenresAndTags(gameId, meta.genres || [], meta.tags || [])
        }
      } catch {
        // Safe fallback
      }
    }

    return coverPath
  })

  ipcMain.handle('auto-fetch-covers', async () => {
    const res = await enrichMissingMetadata()
    const games = getGames()
    return { processed: games.length, updated: res.coversUpdated }
  })

  ipcMain.handle('fetch-metadata', async (_event, gameId: string) => {
    const game = getGame(gameId)
    if (!game) return null

    const settings = getSettings()

    if (game.steamAppId) {
      const meta = await fetchSteamMetadata(game.steamAppId)
      if (meta) return meta
    }

    if (settings.rawgApiKey) {
      const meta = await fetchRawgMetadata(game.title, settings.rawgApiKey)
      if (meta) return meta
    }

    return null
  })

  ipcMain.handle('download-cover', async (_event, gameId: string, url: string) => {
    const coversDir = getCoversDirectory()
    return downloadCoverImage(gameId, url, coversDir)
  })

  ipcMain.handle('get-cover-data-url', async (_event, coverPath: string) => {
    try {
      if (!coverPath) return null
      let resolved = coverPath
      const coversDir = getCoversDirectory()
      if (!path.isAbsolute(resolved)) {
        resolved = path.join(coversDir, path.basename(resolved))
      }
      if (!fs.existsSync(resolved)) {
        const inCovers = path.join(coversDir, path.basename(resolved))
        if (fs.existsSync(inCovers)) {
          resolved = inCovers
        } else {
          return null
        }
      }
      const ext = path.extname(resolved).toLowerCase()
      const mimeMap: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.ico': 'image/x-icon',
        '.bmp': 'image/bmp',
        '.gif': 'image/gif',
      }
      const mime = mimeMap[ext] || 'image/jpeg'
      const buf = fs.readFileSync(resolved)
      return `data:${mime};base64,${buf.toString('base64')}`
    } catch {
      return null
    }
  })

  // Launcher
  ipcMain.handle('launch-game', async (_event, gameId: string) => {
    const game = getGame(gameId)
    if (!game) return { success: false, error: 'Игра не найдена' }
    return launchGame(game)
  })

  ipcMain.handle('open-file-picker', async (_event, options: { title: string; filters: { name: string; extensions: string[] }[] }) => {
    if (!mainWindow) return null
    const result = await dialog.showOpenDialog(mainWindow, {
      title: options.title,
      filters: options.filters,
      properties: ['openFile'],
    })
    return result.canceled ? null : result.filePaths[0] || null
  })

  ipcMain.handle('open-folder-picker', async (_event, title?: string) => {
    if (!mainWindow) return null
    const result = await dialog.showOpenDialog(mainWindow, {
      title: title || 'Выбрать папку для сканирования',
      properties: ['openDirectory'],
    })
    return result.canceled ? null : result.filePaths[0] || null
  })

  ipcMain.handle('inspect-executable', async (_event, exePath: string) => {
    return inspectExecutable(exePath)
  })

  ipcMain.handle('scan-folder-for-executables', async (_event, folderPath: string) => {
    return scanFolderForExecutables(folderPath)
  })

  // History
  ipcMain.handle('get-history', () => getHistory())
  ipcMain.handle('add-history-entry', (_event, entry: Parameters<typeof addHistoryEntry>[0]) => addHistoryEntry(entry))
  ipcMain.handle('clear-history', () => { clearHistory() })

  // Settings
  ipcMain.handle('get-settings', () => getSettings())
  ipcMain.handle('update-settings', (_event, updates: Parameters<typeof updateSettings>[0]) => updateSettings(updates))

  // App
  ipcMain.handle('get-app-version', () => app.getVersion())
  ipcMain.handle('is-first-run', () => {
    const settings = getSettings()
    return settings.lastScanAt === undefined
  })
  ipcMain.handle('set-first-run-done', () => {
    updateSettings({ lastScanAt: new Date().toISOString() })
  })
  ipcMain.handle('get-covers-dir', () => getCoversDirectory())
}

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(async () => {
    try {
      registerProtocol()
      try {
        await initDatabase()
        cleanExistingTechnicalTags()
        try {
          mergeExistingDuplicates()
        } catch (mergeErr) {
          console.warn('Duplicate auto-merge warning:', mergeErr)
        }
      } catch (dbErr) {
        console.error('Database initialization warning:', dbErr)
      }
      registerIpcHandlers()
      createWindow()
      setTimeout(() => {
        void enrichMissingMetadata()
      }, 1500)
    } catch (err) {
      console.error('Fatal initialization error:', err)
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
      }
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })
}
